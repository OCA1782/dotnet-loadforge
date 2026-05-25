using LoadForge.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LoadForge.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options
                .UseNpgsql(
                    config.GetConnectionString("DefaultConnection"),
                    b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
                .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        return services;
    }
}
