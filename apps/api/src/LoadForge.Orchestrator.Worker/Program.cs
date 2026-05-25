using LoadForge.Orchestrator.Worker.Services;
using LoadForge.Orchestrator.Worker.Workers;
using LoadForge.Persistence;
using NATS.Client.Core;
using NATS.Client.Serializers.Json;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSingleton<INatsConnection>(_ =>
    new NatsConnection(new NatsOpts
    {
        Url = builder.Configuration["Nats:Url"] ?? "nats://localhost:4222",
        SerializerRegistry = NatsJsonSerializerRegistry.Default
    }));

builder.Services.AddPersistence(builder.Configuration);

builder.Services.AddSingleton<ShardCalculator>();

builder.Services.AddHostedService<RunDispatchWorker>();
builder.Services.AddHostedService<HeartbeatMonitorWorker>();

var host = builder.Build();
host.Run();
