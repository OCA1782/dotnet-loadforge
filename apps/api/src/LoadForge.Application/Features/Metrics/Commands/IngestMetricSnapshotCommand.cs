using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Metrics.Commands;

public record IngestMetricSnapshotCommand(
    Guid TestRunId,
    DateTime Timestamp,
    double Rps,
    int ActiveVu,
    int P50Ms,
    int P90Ms,
    int P95Ms,
    int P99Ms,
    int MaxMs,
    double ErrorRate,
    long TotalRequests,
    long TotalErrors,
    int? WorkerCount,
    double? WorkerCpuPercent,
    long? WorkerMemoryBytes
) : IRequest<Result>;

public class IngestMetricSnapshotCommandHandler : IRequestHandler<IngestMetricSnapshotCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public IngestMetricSnapshotCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(IngestMetricSnapshotCommand request, CancellationToken cancellationToken)
    {
        var run = await _context.TestRuns
            .FirstOrDefaultAsync(r => r.Id == request.TestRunId && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result.Failure("Test çalıştırması bulunamadı.");

        var snapshot = new MetricSnapshot
        {
            OrganizationId = run.OrganizationId,
            TestRunId = request.TestRunId,
            Timestamp = request.Timestamp,
            Rps = request.Rps,
            ActiveVu = request.ActiveVu,
            P50Ms = request.P50Ms,
            P90Ms = request.P90Ms,
            P95Ms = request.P95Ms,
            P99Ms = request.P99Ms,
            MaxMs = request.MaxMs,
            ErrorRate = request.ErrorRate,
            TotalRequests = request.TotalRequests,
            TotalErrors = request.TotalErrors,
            WorkerCount = request.WorkerCount,
            WorkerCpuPercent = request.WorkerCpuPercent,
            WorkerMemoryBytes = request.WorkerMemoryBytes
        };

        _context.MetricSnapshots.Add(snapshot);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
