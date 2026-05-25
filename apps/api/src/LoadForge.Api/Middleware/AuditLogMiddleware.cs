using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Entities;
using System.Security.Claims;

namespace LoadForge.Api.Middleware;

public class AuditLogMiddleware
{
    private static readonly HashSet<string> _auditedMethods =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    private readonly RequestDelegate _next;

    public AuditLogMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        if (!_auditedMethods.Contains(context.Request.Method)) return;
        if (context.Response.StatusCode >= 500) return;

        var user = context.User;
        if (!user.Identity?.IsAuthenticated ?? true) return;

        var actorId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var actorEmail = user.FindFirstValue(ClaimTypes.Email);
        var orgIdClaim = user.FindFirstValue("org_id");

        if (!Guid.TryParse(orgIdClaim, out var orgId)) return;

        try
        {
            using var scope = context.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var path = context.Request.Path.Value ?? "";
            var entityType = ExtractEntityType(path);
            var entityId = ExtractEntityId(context.GetRouteValue("id")?.ToString());

            db.AuditLogs.Add(new AuditLog
            {
                OrganizationId = orgId,
                ActorId = Guid.TryParse(actorId, out var aid) ? aid : null,
                ActorEmail = actorEmail,
                Action = $"{context.Request.Method} {path}",
                EntityType = entityType,
                EntityId = entityId,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers.UserAgent.ToString()[..Math.Min(200, context.Request.Headers.UserAgent.ToString().Length)],
            });

            await db.SaveChangesAsync(CancellationToken.None);
        }
        catch
        {
            // audit log failure must not affect the request
        }
    }

    private static string ExtractEntityType(string path)
    {
        var parts = path.Trim('/').Split('/');
        return parts.Length >= 2 ? parts[1] : parts[0];
    }

    private static Guid? ExtractEntityId(string? id) =>
        Guid.TryParse(id, out var g) ? g : null;
}
