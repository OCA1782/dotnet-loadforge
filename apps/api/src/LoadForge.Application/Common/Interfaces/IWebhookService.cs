using LoadForge.Domain.Entities;

namespace LoadForge.Application.Common.Interfaces;

public interface IWebhookService
{
    Task SendAsync(TestRun run, string eventName, CancellationToken ct = default);
    Task<string> TestAsync(Webhook webhook, CancellationToken ct = default);
}
