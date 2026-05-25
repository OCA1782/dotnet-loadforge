using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record StartTestRunCommand(
    Guid ScenarioVersionId,
    Guid? EnvironmentId,
    string ExecutionMode,
    int VirtualUsers,
    int DurationSeconds,
    int RampUpSeconds,
    int? TargetRps,
    string? Region,
    double? MaxErrorRate,
    int? MaxP95Ms,
    int? MaxP99Ms
) : IRequest<Result<Guid>>;

public class StartTestRunCommandValidator : AbstractValidator<StartTestRunCommand>
{
    public StartTestRunCommandValidator()
    {
        RuleFor(x => x.ScenarioVersionId).NotEmpty();
        RuleFor(x => x.VirtualUsers).InclusiveBetween(1, 100_000);
        RuleFor(x => x.DurationSeconds).InclusiveBetween(1, 86_400);
        RuleFor(x => x.RampUpSeconds).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ExecutionMode).Must(m => m is "single" or "distributed")
            .WithMessage("ExecutionMode 'single' veya 'distributed' olmalıdır.");
        RuleFor(x => x.MaxErrorRate).InclusiveBetween(0, 1).When(x => x.MaxErrorRate.HasValue);
        RuleFor(x => x.MaxP95Ms).GreaterThan(0).When(x => x.MaxP95Ms.HasValue);
        RuleFor(x => x.MaxP99Ms).GreaterThan(0).When(x => x.MaxP99Ms.HasValue);
    }
}

public class StartTestRunCommandHandler : IRequestHandler<StartTestRunCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IRunOrchestratorService _orchestrator;

    public StartTestRunCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IRunOrchestratorService orchestrator)
    {
        _context = context;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
    }

    public async Task<Result<Guid>> Handle(StartTestRunCommand request, CancellationToken cancellationToken)
    {
        var version = await _context.ScenarioVersions
            .Include(v => v.Scenario)
            .FirstOrDefaultAsync(v => v.Id == request.ScenarioVersionId
                && v.Scenario.OrganizationId == _currentUser.OrganizationId
                && !v.IsDeleted, cancellationToken);

        if (version is null)
            return Result<Guid>.Failure("Senaryo versiyonu bulunamadı.");

        var run = new TestRun
        {
            OrganizationId = _currentUser.OrganizationId!.Value,
            WorkspaceId = version.Scenario.WorkspaceId,
            ScenarioId = version.ScenarioId,
            ScenarioVersionId = version.Id,
            EnvironmentId = request.EnvironmentId,
            ExecutionMode = request.ExecutionMode,
            VirtualUsers = request.VirtualUsers,
            DurationSeconds = request.DurationSeconds,
            RampUpSeconds = request.RampUpSeconds,
            TargetRps = request.TargetRps,
            Region = request.Region,
            MaxErrorRate = request.MaxErrorRate,
            MaxP95Ms = request.MaxP95Ms,
            MaxP99Ms = request.MaxP99Ms,
            InitiatedBy = _currentUser.UserId!.Value,
            Status = TestRunStatus.Pending
        };

        _context.TestRuns.Add(run);
        await _context.SaveChangesAsync(cancellationToken);

        await _orchestrator.DispatchRunAsync(run.Id, cancellationToken);

        return Result<Guid>.Success(run.Id);
    }
}
