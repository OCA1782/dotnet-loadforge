using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Queries;

public record GetTestRunQuery(Guid RunId) : IRequest<Result<TestRunDto>>;

public record TestRunDto(
    Guid Id,
    Guid ScenarioId,
    string ScenarioName,
    Guid ScenarioVersionId,
    int VersionNo,
    TestRunStatus Status,
    string ExecutionMode,
    int VirtualUsers,
    int DurationSeconds,
    int RampUpSeconds,
    int? TargetRps,
    bool? Passed,
    string? FailReason,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    double? SummaryRps,
    int? SummaryP95Ms,
    int? SummaryP99Ms,
    double? SummaryErrorRate,
    DateTime CreatedAt,
    int? QueuePosition = null,
    double? MaxErrorRate = null,
    int? MaxP95Ms = null,
    int? MaxP99Ms = null,
    bool IsBaseline = false
);

public class GetTestRunQueryHandler : IRequestHandler<GetTestRunQuery, Result<TestRunDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetTestRunQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<TestRunDto>> Handle(GetTestRunQuery request, CancellationToken cancellationToken)
    {
        var run = await _context.TestRuns
            .Include(r => r.Scenario)
            .Include(r => r.ScenarioVersion)
            .FirstOrDefaultAsync(r => r.Id == request.RunId
                && r.OrganizationId == _currentUser.OrganizationId
                && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result<TestRunDto>.Failure("Test çalıştırması bulunamadı.");

        return Result<TestRunDto>.Success(new TestRunDto(
            run.Id,
            run.ScenarioId,
            run.Scenario.Name,
            run.ScenarioVersionId,
            run.ScenarioVersion.VersionNo,
            run.Status,
            run.ExecutionMode,
            run.VirtualUsers,
            run.DurationSeconds,
            run.RampUpSeconds,
            run.TargetRps,
            run.Passed,
            run.FailReason,
            run.StartedAt,
            run.CompletedAt,
            run.SummaryRps,
            run.SummaryP95Ms,
            run.SummaryP99Ms,
            run.SummaryErrorRate,
            run.CreatedAt,
            QueuePosition: null,
            MaxErrorRate: run.MaxErrorRate,
            MaxP95Ms: run.MaxP95Ms,
            MaxP99Ms: run.MaxP99Ms,
            IsBaseline: run.IsBaseline
        ));
    }
}
