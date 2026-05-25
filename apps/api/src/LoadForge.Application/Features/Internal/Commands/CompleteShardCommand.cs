using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Internal.Commands;

public record CompleteShardCommand(
    Guid ShardId,
    bool Passed,
    double ErrorRate,
    long P95Ms,
    long P99Ms
) : IRequest<Result>;

public class CompleteShardCommandHandler : IRequestHandler<CompleteShardCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IWebhookService _webhookService;

    public CompleteShardCommandHandler(IApplicationDbContext context, IWebhookService webhookService)
    {
        _context = context;
        _webhookService = webhookService;
    }

    public async Task<Result> Handle(CompleteShardCommand request, CancellationToken cancellationToken)
    {
        var shard = await _context.TestRunShards
            .FirstOrDefaultAsync(s => s.Id == request.ShardId, cancellationToken);

        if (shard is null)
            return Result.Failure("Shard bulunamadı.");

        shard.Status = request.Passed ? ShardStatus.Completed : ShardStatus.Failed;
        shard.CompletedAt = DateTime.UtcNow;

        if (!request.Passed)
            shard.FailReason = $"Quality gate failed — errorRate:{request.ErrorRate:P1} p95:{request.P95Ms}ms p99:{request.P99Ms}ms";

        await _context.SaveChangesAsync(cancellationToken);

        await TryCompleteRunAsync(shard.TestRunId, cancellationToken);

        return Result.Success();
    }

    private async Task TryCompleteRunAsync(Guid testRunId, CancellationToken ct)
    {
        bool hasActiveShards = await _context.TestRunShards
            .AnyAsync(s => s.TestRunId == testRunId
                        && (s.Status == ShardStatus.Pending
                         || s.Status == ShardStatus.Assigned
                         || s.Status == ShardStatus.Running), ct);

        if (hasActiveShards) return;

        var run = await _context.TestRuns
            .Include(r => r.Scenario)
            .FirstOrDefaultAsync(r => r.Id == testRunId, ct);

        if (run is null || run.Status == TestRunStatus.Completed || run.Status == TestRunStatus.Failed)
            return;

        bool anyFailed = await _context.TestRunShards
            .AnyAsync(s => s.TestRunId == testRunId
                        && (s.Status == ShardStatus.Failed || s.Status == ShardStatus.TimedOut), ct);

        run.Status = anyFailed ? TestRunStatus.Failed : TestRunStatus.Completed;
        run.CompletedAt = DateTime.UtcNow;
        run.Passed = !anyFailed;

        if (anyFailed)
            run.FailReason = "One or more shards failed the quality gate.";

        await _context.SaveChangesAsync(ct);

        var eventName = anyFailed ? "run.failed" : "run.completed";
        try { await _webhookService.SendAsync(run, eventName, ct); }
        catch { /* webhook failure must not affect run completion */ }
    }
}
