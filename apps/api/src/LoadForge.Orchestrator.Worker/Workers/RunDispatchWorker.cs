using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using LoadForge.Infrastructure.Messaging;
using LoadForge.Orchestrator.Worker.Services;
using Microsoft.EntityFrameworkCore;
using NATS.Client.Core;
using NATS.Client.JetStream;
using NATS.Client.JetStream.Models;

namespace LoadForge.Orchestrator.Worker.Workers;

public class RunDispatchWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly INatsConnection _nats;
    private readonly ShardCalculator _shardCalc;
    private readonly IConfiguration _config;
    private readonly ILogger<RunDispatchWorker> _logger;

    public RunDispatchWorker(
        IServiceScopeFactory scopeFactory,
        INatsConnection nats,
        ShardCalculator shardCalc,
        IConfiguration config,
        ILogger<RunDispatchWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _nats = nats;
        _shardCalc = shardCalc;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var js = new NatsJSContext(_nats);
        await EnsureStreamsAndConsumerAsync(js, stoppingToken);

        _logger.LogInformation("RunDispatchWorker started — listening for dispatch messages");

        var consumer = await js.GetConsumerAsync("LOADFORGE_RUNS", "orchestrator-dispatch", stoppingToken);

        await foreach (var msg in consumer.ConsumeAsync<RunDispatchMessage>(cancellationToken: stoppingToken))
        {
            if (msg.Data is null)
            {
                await msg.AckAsync(cancellationToken: stoppingToken);
                continue;
            }

            try
            {
                await ProcessDispatchAsync(msg.Data, js, stoppingToken);
                await msg.AckAsync(cancellationToken: stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dispatch failed for TestRun {TestRunId}", msg.Data.TestRunId);
                await msg.NakAsync(cancellationToken: stoppingToken);
            }
        }
    }

    private async Task EnsureStreamsAndConsumerAsync(NatsJSContext js, CancellationToken ct)
    {
        await js.CreateOrUpdateStreamAsync(new StreamConfig
        {
            Name = "LOADFORGE_RUNS",
            Subjects = ["loadforge.runs.*"],
            MaxAge = TimeSpan.FromDays(1),
            Storage = StreamConfigStorage.File,
        }, ct);

        await js.CreateOrUpdateStreamAsync(new StreamConfig
        {
            Name = "LOADFORGE_SHARDS",
            Subjects = ["loadforge.shard.*"],
            MaxAge = TimeSpan.FromDays(1),
            Storage = StreamConfigStorage.File,
        }, ct);

        await js.CreateOrUpdateConsumerAsync("LOADFORGE_RUNS", new ConsumerConfig
        {
            Name = "orchestrator-dispatch",
            FilterSubject = "loadforge.runs.dispatch",
            AckPolicy = ConsumerConfigAckPolicy.Explicit,
            DeliverPolicy = ConsumerConfigDeliverPolicy.All,
            MaxDeliver = 5,
            AckWait = TimeSpan.FromMinutes(5),
        }, ct);
    }

    private async Task ProcessDispatchAsync(RunDispatchMessage message, NatsJSContext js, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var testRun = await db.TestRuns
            .Include(r => r.ScenarioVersion)
            .FirstOrDefaultAsync(r => r.Id == message.TestRunId, ct);

        if (testRun is null)
        {
            _logger.LogWarning("TestRun {TestRunId} not found, skipping dispatch", message.TestRunId);
            return;
        }

        if (testRun.Status != TestRunStatus.Pending)
        {
            _logger.LogWarning("TestRun {TestRunId} already in status {Status}, skipping", testRun.Id, testRun.Status);
            return;
        }

        int shardCount = _shardCalc.ComputeShardCount(testRun.VirtualUsers);
        string apiBaseUrl = _config["Orchestrator:ApiBaseUrl"]!;

        var shards = new List<TestRunShard>();
        for (int i = 0; i < shardCount; i++)
        {
            var shard = new TestRunShard
            {
                OrganizationId = testRun.OrganizationId,
                TestRunId = testRun.Id,
                ShardIndex = i,
                ShardCount = shardCount,
                VirtualUsers = _shardCalc.AllocateVU(testRun.VirtualUsers, shardCount, i),
                TargetRps = _shardCalc.AllocateRps(testRun.TargetRps, shardCount, i),
                Status = ShardStatus.Pending,
                AssignedAt = DateTime.UtcNow,
            };
            shards.Add(shard);
            db.TestRunShards.Add(shard);
        }

        testRun.Status = TestRunStatus.Queued;
        testRun.StartedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        foreach (var shard in shards)
        {
            var job = new ShardJobMessage(
                TestRunId: testRun.Id,
                ShardId: shard.Id,
                ShardIndex: shard.ShardIndex,
                ShardCount: shard.ShardCount,
                ScenarioContent: testRun.ScenarioVersion.Content,
                ApiBaseUrl: apiBaseUrl,
                OrganizationId: testRun.OrganizationId,
                VirtualUsers: shard.VirtualUsers,
                DurationSeconds: testRun.DurationSeconds,
                RampUpSeconds: testRun.RampUpSeconds,
                TargetRps: shard.TargetRps,
                MaxErrorRate: testRun.MaxErrorRate,
                MaxP95Ms: testRun.MaxP95Ms,
                MaxP99Ms: testRun.MaxP99Ms
            );
            await js.PublishAsync("loadforge.shard.jobs", job, cancellationToken: ct);
        }

        _logger.LogInformation("TestRun {TestRunId} → {ShardCount} shard(s) queued", testRun.Id, shardCount);
    }
}
