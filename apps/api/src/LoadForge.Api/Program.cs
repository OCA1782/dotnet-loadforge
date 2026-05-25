using System.Text.Json.Serialization;
using LoadForge.Api.Middleware;
using LoadForge.Application;
using LoadForge.Infrastructure;
using LoadForge.Persistence;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);

var app = builder.Build();

// Auto-apply migrations on startup (safe for Docker deployments)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapPrometheusScrapingEndpoint("/metrics");

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
