using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Common;
using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectEnvironment> Environments => Set<ProjectEnvironment>();
    public DbSet<Secret> Secrets => Set<Secret>();
    public DbSet<Scenario> Scenarios => Set<Scenario>();
    public DbSet<ScenarioVersion> ScenarioVersions => Set<ScenarioVersion>();
    public DbSet<TestRun> TestRuns => Set<TestRun>();
    public DbSet<TestRunShard> TestRunShards => Set<TestRunShard>();
    public DbSet<MetricSnapshot> MetricSnapshots => Set<MetricSnapshot>();
    public DbSet<RequestMetric> RequestMetrics => Set<RequestMetric>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserOrganization> UserOrganizations => Set<UserOrganization>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<OrganizationInvitation> OrganizationInvitations => Set<OrganizationInvitation>();
    public DbSet<RunNote> RunNotes => Set<RunNote>();
    public DbSet<Webhook> Webhooks => Set<Webhook>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;

            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
