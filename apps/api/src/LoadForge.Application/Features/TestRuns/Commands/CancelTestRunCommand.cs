using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record CancelTestRunCommand(Guid RunId) : IRequest<Result>;

public class CancelTestRunCommandHandler : IRequestHandler<CancelTestRunCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IRunOrchestratorService _orchestrator;

    public CancelTestRunCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IRunOrchestratorService orchestrator)
    {
        _context = context;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(CancelTestRunCommand request, CancellationToken cancellationToken)
    {
        var run = await _context.TestRuns
            .FirstOrDefaultAsync(r => r.Id == request.RunId
                && r.OrganizationId == _currentUser.OrganizationId
                && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result.Failure("Test çalıştırması bulunamadı.");

        if (run.Status is TestRunStatus.Completed or TestRunStatus.Failed or TestRunStatus.Cancelled)
            return Result.Failure($"Durum '{run.Status}' olan test iptal edilemez.");

        // Pending: orchestrator henüz dispatch etmedi, doğrudan iptal et
        if (run.Status == TestRunStatus.Pending)
        {
            run.Status = TestRunStatus.Cancelled;
            run.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }

        run.Status = TestRunStatus.Stopping;
        await _context.SaveChangesAsync(cancellationToken);

        await _orchestrator.CancelRunAsync(run.Id, cancellationToken);

        return Result.Success();
    }
}
