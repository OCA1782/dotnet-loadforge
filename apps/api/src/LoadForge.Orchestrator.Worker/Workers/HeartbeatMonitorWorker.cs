using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Enums;
using LoadForge.Infrastructure.Messaging;
using Microsoft.EntityFrameworkCore;
using NATS.Client.Core;
using NATS.Client.JetStream;

namespace LoadForge.Orchestrator.Worker.Workers;

public class HeartbeatMonitorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly INatsConnection _nats;
    private readonly ILogger<HeartbeatMonitorWorker> _logger;
    private readonly TimeSpan _checkInterval;
    private readonly TimeSpan _shardTimeout;
    private readonly int _maxRetries;
    private readonly string _apiBaseUrl;

    public HeartbeatMonitorWorker(
        IServiceScopeFactory scopeFactory,
        INatsConnection nats,
        IConfiguration config,
        ILogger<HeartbeatMonitorWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _nats = nats;
        _logger = logger;
        _checkInterval = TimeSpan.FromSeconds(config.GetValue("Orchestrator:HeartbeatCheckIntervalSeconds", 30));
        _shardTimeout = TimeSpan.FromSeconds(config.GetValue("Orchestrator:HeartbeatTimeoutSeconds", 60));
        _maxRetries = config.GetValue("Orchestrator:ShardMaxRetries", 2);
        _apiBaseUrl = config["Orchestrator:ApiBaseUrl"] ?? "http://api:8080";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "HeartbeatMonitorWorker started (check every {Interval}s, timeout {Timeout}s, maxRetries {MaxRetries})",
            _checkInterval.TotalSeconds, _shardTimeout.TotalSeconds, _maxRetries);

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
            .Include(s => s.TestRun)
                .ThenInclude(r => r.ScenarioVersion)
            .Where(s => s.Status == ShardStatus.Running && s.LastHeartbeatAt < deadline)
            .ToListAsync(ct);

        if (staleShards.Count == 0) return;

        _logger.LogWarning("Detected {Count} stale shard(s)", staleShards.Count);

        var js = new NatsJSContext(_nats);

        foreach (var shard in staleShards)
        {
            if (shard.RetryCount < _maxRetries)
            {
                shard.RetryCount++;
                shard.Status = ShardStatus.Pending;
                shard.LastHeartbeatAt = null;
                shard.StartedAt = null;
                shard.WorkerId = null;

                _logger.LogWarning(
                    "Shard {ShardId} (run {RunId}) timed out — retry {Retry}/{Max}",
                    shard.Id, shard.TestRunId, shard.RetryCount, _maxRetries);

                await db.SaveChangesAsync(ct);

                var job = new ShardJobMessage(
                    TestRunId: shard.TestRunId,
                    ShardId: shard.Id,
                    ShardIndex: shard.ShardIndex,
                    ShardCount: shard.ShardCount,
                    ScenarioContent: shard.TestRun.ScenarioVersion.Content,
                    ApiBaseUrl: _apiBaseUrl,
                    OrganizationId: shard.OrganizationId,
                    VirtualUsers: shard.VirtualUsers,
                    DurationSeconds: shard.TestRun.DurationSeconds,
                    RampUpSeconds: shard.TestRun.RampUpSeconds,
                    TargetRps: shard.TargetRps,
                    MaxErrorRate: shard.TestRun.MaxErrorRate,
                    MaxP95Ms: shard.TestRun.MaxP95Ms,
                    MaxP99Ms: shard.TestRun.MaxP99Ms
                );

                await js.PublishAsync("loadforge.shard.jobs", job, cancellationToken: ct);
            }
            else
            {
                shard.Status = ShardStatus.TimedOut;
                shard.CompletedAt = DateTime.UtcNow;
                _logger.LogWarning(
                    "Shard {ShardId} (run {RunId}) exhausted retries — marking TimedOut",
                    shard.Id, shard.TestRunId);
            }
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
                run.FailReason = "One or more shards timed out after all retries";

            _logger.LogInformation("TestRun {RunId} → {Status}", run.Id, run.Status);
        }

        await db.SaveChangesAsync(ct);
    }
}
