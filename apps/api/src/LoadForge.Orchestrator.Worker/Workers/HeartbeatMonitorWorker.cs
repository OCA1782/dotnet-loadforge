using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using NATS.Client.Core;

namespace LoadForge.Orchestrator.Worker.Workers;

public class HeartbeatMonitorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HeartbeatMonitorWorker> _logger;
    private readonly TimeSpan _checkInterval;
    private readonly TimeSpan _shardTimeout;

    public HeartbeatMonitorWorker(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<HeartbeatMonitorWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _checkInterval = TimeSpan.FromSeconds(config.GetValue("Orchestrator:HeartbeatCheckIntervalSeconds", 30));
        _shardTimeout = TimeSpan.FromSeconds(config.GetValue("Orchestrator:HeartbeatTimeoutSeconds", 60));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "HeartbeatMonitorWorker started (check every {Interval}s, timeout {Timeout}s)",
            _checkInterval.TotalSeconds, _shardTimeout.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(_checkInterval, stoppingToken);

            try
            {
                await CheckStaleShardsAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Heartbeat check error");
            }
        }
    }

    private async Task CheckStaleShardsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var deadline = DateTime.UtcNow - _shardTimeout;

        var staleShards = await db.TestRunShards
            .Where(s => s.Status == ShardStatus.Running && s.LastHeartbeatAt < deadline)
            .ToListAsync(ct);

        if (staleShards.Count == 0) return;

        _logger.LogWarning("Detected {Count} stale shard(s)", staleShards.Count);

        foreach (var shard in staleShards)
        {
            shard.Status = ShardStatus.TimedOut;
            shard.CompletedAt = DateTime.UtcNow;
            _logger.LogWarning("Shard {ShardId} (index {Index}, run {RunId}) timed out",
                shard.Id, shard.ShardIndex, shard.TestRunId);
        }

        await db.SaveChangesAsync(ct);

        await MarkCompletedRunsAsync(db, ct);
    }

    private async Task MarkCompletedRunsAsync(IApplicationDbContext db, CancellationToken ct)
    {
        var activeRuns = await db.TestRuns
            .Where(r => r.Status == TestRunStatus.Running || r.Status == TestRunStatus.Queued)
            .ToListAsync(ct);

        foreach (var run in activeRuns)
        {
            bool hasActiveShards = await db.TestRunShards
                .AnyAsync(s => s.TestRunId == run.Id
                            && (s.Status == ShardStatus.Pending
                             || s.Status == ShardStatus.Assigned
                             || s.Status == ShardStatus.Running), ct);

            if (hasActiveShards) continue;

            bool anyFailed = await db.TestRunShards
                .AnyAsync(s => s.TestRunId == run.Id
                            && (s.Status == ShardStatus.Failed || s.Status == ShardStatus.TimedOut), ct);

            run.Status = anyFailed ? TestRunStatus.Failed : TestRunStatus.Completed;
            run.CompletedAt = DateTime.UtcNow;

            if (anyFailed)
                run.FailReason = "One or more shards timed out";

            _logger.LogInformation("TestRun {RunId} → {Status}", run.Id, run.Status);
        }

        await db.SaveChangesAsync(ct);
    }
}
