using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Queries;

public record ListRunMetricsQuery(Guid RunId) : IRequest<Result<List<MetricSnapshotDto>>>;

public record MetricSnapshotDto(
    DateTime Timestamp,
    double Rps,
    int ActiveVu,
    int P50Ms,
    int P90Ms,
    int P95Ms,
    int P99Ms,
    double ErrorRate,
    long TotalRequests,
    long TotalErrors
);

public class ListRunMetricsQueryHandler : IRequestHandler<ListRunMetricsQuery, Result<List<MetricSnapshotDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListRunMetricsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MetricSnapshotDto>>> Handle(ListRunMetricsQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var runExists = await _context.TestRuns
            .AnyAsync(r => r.Id == request.RunId && r.OrganizationId == orgId && !r.IsDeleted, cancellationToken);

        if (!runExists)
            return Result<List<MetricSnapshotDto>>.Failure("Test çalıştırması bulunamadı.");

        var snapshots = await _context.MetricSnapshots
            .Where(m => m.TestRunId == request.RunId && !m.IsDeleted)
            .OrderBy(m => m.Timestamp)
            .Select(m => new MetricSnapshotDto(
                m.Timestamp,
                m.Rps,
                m.ActiveVu,
                m.P50Ms,
                m.P90Ms,
                m.P95Ms,
                m.P99Ms,
                m.ErrorRate,
                m.TotalRequests,
                m.TotalErrors
            ))
            .ToListAsync(cancellationToken);

        return Result<List<MetricSnapshotDto>>.Success(snapshots);
    }
}
