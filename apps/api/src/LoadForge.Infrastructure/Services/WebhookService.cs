using System.Text;
using System.Text.Json;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LoadForge.Infrastructure.Services;

public class WebhookService : IWebhookService
{
    private readonly IApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookService> _logger;

    public WebhookService(
        IApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<string> TestAsync(Webhook webhook, CancellationToken ct = default)
    {
        var payload = $$"""{"event":"test","message":"LoadForge webhook test ping","timestamp":"{{DateTime.UtcNow:o}}"}""";
        try
        {
            var client = _httpClientFactory.CreateClient("webhooks");
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(webhook.Url, content, ct);
            return $"HTTP {(int)response.StatusCode} {response.ReasonPhrase}";
        }
        catch (Exception ex)
        {
            return $"Bağlantı hatası: {ex.Message}";
        }
    }

    public async Task SendAsync(TestRun run, string eventName, CancellationToken ct = default)
    {
        var allWebhooks = await _context.Webhooks
            .Where(w => w.OrganizationId == run.OrganizationId && w.IsActive && !w.IsDeleted)
            .ToListAsync(ct);

        var matching = allWebhooks
            .Where(w => w.Events.Split(',', StringSplitOptions.TrimEntries)
                                .Contains(eventName))
            .ToList();

        if (matching.Count == 0) return;

        var payload = new
        {
            @event = eventName,
            runId = run.Id,
            scenarioName = run.Scenario?.Name,
            status = run.Status.ToString(),
            passed = run.Passed,
            failReason = run.FailReason,
            summaryRps = run.SummaryRps,
            summaryP95Ms = run.SummaryP95Ms,
            summaryErrorRate = run.SummaryErrorRate,
            startedAt = run.StartedAt,
            completedAt = run.CompletedAt,
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var client = _httpClientFactory.CreateClient("webhooks");

        foreach (var webhook in matching)
        {
            try
            {
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(webhook.Url, content, ct);
                if (!response.IsSuccessStatusCode)
                    _logger.LogWarning("Webhook {Id} returned {Code}", webhook.Id, (int)response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook {Id} delivery failed", webhook.Id);
            }
        }
    }
}
