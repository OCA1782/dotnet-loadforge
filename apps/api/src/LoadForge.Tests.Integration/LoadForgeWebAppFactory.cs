using LoadForge.Application.Common.Interfaces;
using LoadForge.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace LoadForge.Tests.Integration;

public sealed class LoadForgeWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
#pragma warning disable CS0618
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("loadforge_test")
        .WithUsername("lf_test")
        .WithPassword("lf_test_pw")
        .Build();
#pragma warning restore CS0618

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Override connection string — picked up by AddPersistence before MigrateAsync runs
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _postgres.GetConnectionString(),
                ["Jwt:Secret"] = "integration-test-secret-key-must-be-at-least-32-chars-long!"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace NATS-backed orchestrator with no-op so tests don't need NATS
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IRunOrchestratorService));
            if (descriptor is not null) services.Remove(descriptor);
            services.AddScoped<IRunOrchestratorService, NoOpOrchestratorService>();
        });

        builder.UseEnvironment("Testing");
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }
}

internal sealed class NoOpOrchestratorService : IRunOrchestratorService
{
    public Task DispatchRunAsync(Guid testRunId, CancellationToken ct = default) => Task.CompletedTask;
    public Task CancelRunAsync(Guid testRunId, CancellationToken ct = default) => Task.CompletedTask;
}
