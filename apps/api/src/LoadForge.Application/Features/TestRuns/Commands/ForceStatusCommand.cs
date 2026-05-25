using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record ForceStatusCommand(Guid RunId, string TargetStatus) : IRequest<Result>;

public class ForceStatusCommandHandler : IRequestHandler<ForceStatusCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IRunOrchestratorService _orchestrator;

    public ForceStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IRunOrchestratorService orchestrator)
    {
        _context = context;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(ForceStatusCommand request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<TestRunStatus>(request.TargetStatus, out var target)
            || target is not (TestRunStatus.Cancelled or TestRunStatus.Failed or TestRunStatus.Completed))
            return Result.Failure("Hedef durum yalnızca Cancelled, Failed veya Completed olabilir.");

        var run = await _context.TestRuns
            .Include(r => r.Shards)
            .FirstOrDefaultAsync(r => r.Id == request.RunId
                && r.OrganizationId == _currentUser.OrganizationId
                && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result.Failure("Test koşumu bulunamadı.");

        if (run.Status is TestRunStatus.Completed or TestRunStatus.Failed or TestRunStatus.Cancelled)
            return Result.Failure($"Koşum zaten '{run.Status}' durumunda, zorla geçiş yapılamaz.");

        // DB'yi güncelle
        run.Status = target;
        run.CompletedAt = DateTime.UtcNow;

        if (target == TestRunStatus.Failed && string.IsNullOrEmpty(run.FailReason))
            run.FailReason = "Yönetici tarafından zorla başarısız işaretlendi.";

        if (target == TestRunStatus.Completed && string.IsNullOrEmpty(run.FailReason))
            run.Passed = run.Passed; // mevcut passed değerini koru; metrikler worker'dan gelmedi

        // Aktif shardları terminal duruma çek
        var shardTarget = target == TestRunStatus.Completed ? ShardStatus.Completed : ShardStatus.Failed;
        foreach (var shard in run.Shards.Where(s =>
            s.Status is ShardStatus.Pending or ShardStatus.Assigned or ShardStatus.Running))
        {
            shard.Status = shardTarget;
            shard.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Worker hâlâ çalışıyorsa NATS üzerinden durdur.
        // Completed için de cancel sinyali gönderiyoruz — worker erken bitirip
        // kısmi metrikleri gönderir; DB zaten terminal durumda olduğundan
        // worker'ın durum güncellemesi yok sayılacak.
        if (run.Status != TestRunStatus.Pending)
        {
            try
            {
                await _orchestrator.CancelRunAsync(run.Id, cancellationToken);
            }
            catch
            {
                // NATS bağlantısı yoksa sessizce geç — DB zaten güncellendi
            }
        }

        return Result.Success();
    }
}
