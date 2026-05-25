using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Queries;

public record ListTestRunsQuery(Guid? ScenarioId = null) : IRequest<Result<List<TestRunDto>>>;

public class ListTestRunsQueryHandler : IRequestHandler<ListTestRunsQuery, Result<List<TestRunDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListTestRunsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<TestRunDto>>> Handle(ListTestRunsQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var query = _context.TestRuns
            .Include(r => r.Scenario)
            .Include(r => r.ScenarioVersion)
            .Where(r => r.OrganizationId == orgId && !r.IsDeleted);

        if (request.ScenarioId.HasValue)
            query = query.Where(r => r.ScenarioId == request.ScenarioId.Value);

        var runs = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        // Queue position: Pending/Queued runs sıralanır (en eski = 1)
        var queued = runs
            .Where(r => r.Status is TestRunStatus.Pending or TestRunStatus.Queued)
            .OrderBy(r => r.CreatedAt)
            .Select((r, i) => (r.Id, Position: i + 1))
            .ToDictionary(x => x.Id, x => x.Position);

        var result = runs.Select(r => new TestRunDto(
            r.Id,
            r.ScenarioId,
            r.Scenario.Name,
            r.ScenarioVersionId,
            r.ScenarioVersion.VersionNo,
            r.Status,
            r.ExecutionMode,
            r.VirtualUsers,
            r.DurationSeconds,
            r.RampUpSeconds,
            r.TargetRps,
            r.Passed,
            r.FailReason,
            r.StartedAt,
            r.CompletedAt,
            r.SummaryRps,
            r.SummaryP95Ms,
            r.SummaryP99Ms,
            r.SummaryErrorRate,
            r.CreatedAt,
            queued.TryGetValue(r.Id, out var pos) ? pos : null,
            r.MaxErrorRate,
            r.MaxP95Ms,
            r.MaxP99Ms,
            r.IsBaseline
        )).ToList();

        return Result<List<TestRunDto>>.Success(result);
    }
}
