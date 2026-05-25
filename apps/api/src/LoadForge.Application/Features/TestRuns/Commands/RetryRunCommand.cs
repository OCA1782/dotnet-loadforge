using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record RetryRunCommand(Guid OriginalRunId) : IRequest<Result<Guid>>;

public class RetryRunCommandHandler : IRequestHandler<RetryRunCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IRunOrchestratorService _orchestrator;

    public RetryRunCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IRunOrchestratorService orchestrator)
    {
        _context = context;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
    }

    public async Task<Result<Guid>> Handle(RetryRunCommand request, CancellationToken cancellationToken)
    {
        var original = await _context.TestRuns
            .Include(r => r.Scenario)
            .FirstOrDefaultAsync(r => r.Id == request.OriginalRunId
                && r.OrganizationId == _currentUser.OrganizationId
                && !r.IsDeleted, cancellationToken);

        if (original is null)
            return Result<Guid>.Failure("Orijinal koşum bulunamadı.");

        var versionExists = await _context.ScenarioVersions
            .AnyAsync(v => v.Id == original.ScenarioVersionId && !v.IsDeleted, cancellationToken);

        if (!versionExists)
            return Result<Guid>.Failure("Senaryo versiyonu silinmiş, yeniden çalıştırılamaz.");

        var run = new TestRun
        {
            OrganizationId = original.OrganizationId,
            WorkspaceId = original.WorkspaceId,
            ScenarioId = original.ScenarioId,
            ScenarioVersionId = original.ScenarioVersionId,
            EnvironmentId = original.EnvironmentId,
            ExecutionMode = original.ExecutionMode,
            VirtualUsers = original.VirtualUsers,
            DurationSeconds = original.DurationSeconds,
            RampUpSeconds = original.RampUpSeconds,
            TargetRps = original.TargetRps,
            Region = original.Region,
            MaxErrorRate = original.MaxErrorRate,
            MaxP95Ms = original.MaxP95Ms,
            MaxP99Ms = original.MaxP99Ms,
            InitiatedBy = _currentUser.UserId!.Value,
            Status = TestRunStatus.Pending,
        };

        _context.TestRuns.Add(run);
        await _context.SaveChangesAsync(cancellationToken);

        await _orchestrator.DispatchRunAsync(run.Id, cancellationToken);

        return Result<Guid>.Success(run.Id);
    }
}
