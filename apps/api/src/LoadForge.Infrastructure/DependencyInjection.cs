using LoadForge.Application.Common.Interfaces;
using LoadForge.Infrastructure.Auth;
using LoadForge.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using NATS.Client.Core;
using NATS.Client.Serializers.Json;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Security.Claims;
using System.Text;

namespace LoadForge.Infrastructure;

public static class DependencyInjection
{
    public const string ApiKeyScheme = "ApiKey";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddHttpContextAccessor();

        services.AddSingleton<INatsConnection>(_ =>
            new NatsConnection(new NatsOpts
            {
                Url = config["Nats:Url"] ?? "nats://localhost:4222",
                SerializerRegistry = NatsJsonSerializerRegistry.Default
            }));

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IRunOrchestratorService, RunOrchestratorService>();
        services.AddScoped<IWebhookService, WebhookService>();
        services.AddHttpClient("webhooks", c =>
        {
            c.Timeout = TimeSpan.FromSeconds(10);
        });

        var otelEndpoint = config["OpenTelemetry:Endpoint"];
        services.AddOpenTelemetry()
            .ConfigureResource(r => r
                .AddService("loadforge-api", serviceVersion: "1.0.0")
                .AddEnvironmentVariableDetector())
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation(o => o.RecordException = true)
                    .AddHttpClientInstrumentation()
                    .AddEntityFrameworkCoreInstrumentation(o => o.SetDbStatementForText = true);

                if (!string.IsNullOrEmpty(otelEndpoint))
                    tracing.AddOtlpExporter(o => o.Endpoint = new Uri(otelEndpoint));
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddPrometheusExporter();
            });

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = "Combined";
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddPolicyScheme("Combined", "JWT or ApiKey", options =>
        {
            options.ForwardDefaultSelector = ctx =>
                ctx.Request.Headers.ContainsKey("X-Api-Key")
                    ? ApiKeyScheme
                    : JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!)),
                ValidateIssuer = true,
                ValidIssuer = config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                NameClaimType = "sub"
            };
        })
        .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(ApiKeyScheme, _ => { });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireOwner", p =>
                p.RequireAuthenticatedUser()
                 .RequireAssertion(ctx => HasMinimumRole(ctx, 1)));

            options.AddPolicy("RequireAdmin", p =>
                p.RequireAuthenticatedUser()
                 .RequireAssertion(ctx => HasMinimumRole(ctx, 2)));

            options.AddPolicy("RequireDeveloper", p =>
                p.RequireAuthenticatedUser()
                 .RequireAssertion(ctx => HasMinimumRole(ctx, 3)));

            options.AddPolicy("RequireViewer", p =>
                p.RequireAuthenticatedUser()
                 .RequireAssertion(ctx => HasMinimumRole(ctx, 4)));
        });

        return services;
    }

    private static bool HasMinimumRole(Microsoft.AspNetCore.Authorization.AuthorizationHandlerContext ctx, int maxValue)
    {
        var claim = ctx.User.FindFirstValue("role");
        return int.TryParse(claim, out var role) && role <= maxValue;
    }
}
