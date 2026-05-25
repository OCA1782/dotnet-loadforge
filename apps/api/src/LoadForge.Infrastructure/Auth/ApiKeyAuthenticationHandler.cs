using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Enums;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;

namespace LoadForge.Infrastructure.Auth;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private const string ApiKeyHeader = "X-Api-Key";
    private readonly IServiceScopeFactory _scopeFactory;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IServiceScopeFactory scopeFactory)
        : base(options, logger, encoder)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyHeader, out var keyValue))
            return AuthenticateResult.NoResult();

        var plaintext = keyValue.ToString();
        if (string.IsNullOrEmpty(plaintext))
            return AuthenticateResult.Fail("Empty API key.");

        var keyHash = ComputeSha256(plaintext);

        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var apiKey = await context.ApiKeys
            .Include(k => k.User)
            .Where(k => k.KeyHash == keyHash
                && !k.IsRevoked
                && !k.IsDeleted
                && (k.ExpiresAt == null || k.ExpiresAt > DateTime.UtcNow))
            .FirstOrDefaultAsync();

        if (apiKey is null)
            return AuthenticateResult.Fail("Invalid API key.");

        // Look up role
        var membership = await context.UserOrganizations
            .FirstOrDefaultAsync(uo => uo.UserId == apiKey.UserId
                && uo.OrganizationId == apiKey.OrganizationId
                && !uo.IsDeleted);

        var role = membership?.Role ?? UserRole.CiBot;

        apiKey.LastUsedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        var claims = new[]
        {
            new Claim("sub", apiKey.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, apiKey.UserId.ToString()),
            new Claim("org_id", apiKey.OrganizationId.ToString()),
            new Claim("role", ((int)role).ToString()),
            new Claim("api_key_id", apiKey.Id.ToString())
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }
}
