using LoadForge.Application.Common.Interfaces;
using LoadForge.Infrastructure.Messaging;
using Microsoft.Extensions.Logging;
using NATS.Client.Core;
using NATS.Client.JetStream;
using NATS.Client.JetStream.Models;

namespace LoadForge.Infrastructure.Services;

public class RunOrchestratorService : IRunOrchestratorService
{
    private readonly INatsConnection _nats;
    private readonly ILogger<RunOrchestratorService> _logger;

    public RunOrchestratorService(INatsConnection nats, ILogger<RunOrchestratorService> logger)
    {
        _nats = nats;
        _logger = logger;
    }

    public async Task DispatchRunAsync(Guid testRunId, CancellationToken cancellationToken = default)
    {
        var js = new NatsJSContext(_nats);
        await EnsureRunStreamAsync(js, cancellationToken);

        var message = new RunDispatchMessage(testRunId, Guid.Empty);
        await js.PublishAsync("loadforge.runs.dispatch", message, cancellationToken: cancellationToken);

        _logger.LogInformation("Run dispatch published: {TestRunId}", testRunId);
    }

    public async Task CancelRunAsync(Guid testRunId, CancellationToken cancellationToken = default)
    {
        var js = new NatsJSContext(_nats);
        await EnsureRunStreamAsync(js, cancellationToken);

        var message = new RunCancelMessage(testRunId, Guid.Empty);
        await js.PublishAsync("loadforge.runs.cancel", message, cancellationToken: cancellationToken);

        _logger.LogInformation("Run cancel published: {TestRunId}", testRunId);
    }

    private static async Task EnsureRunStreamAsync(NatsJSContext js, CancellationToken ct)
    {
        await js.CreateOrUpdateStreamAsync(new StreamConfig
        {
            Name = "LOADFORGE_RUNS",
            Subjects = ["loadforge.runs.*"],
            MaxAge = TimeSpan.FromDays(1),
            Storage = StreamConfigStorage.File,
        }, ct);
    }
}
