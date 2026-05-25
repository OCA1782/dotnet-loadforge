using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Organization> Organizations { get; }
    DbSet<Workspace> Workspaces { get; }
    DbSet<Project> Projects { get; }
    DbSet<ProjectEnvironment> Environments { get; }
    DbSet<Secret> Secrets { get; }
    DbSet<Scenario> Scenarios { get; }
    DbSet<ScenarioVersion> ScenarioVersions { get; }
    DbSet<TestRun> TestRuns { get; }
    DbSet<TestRunShard> TestRunShards { get; }
    DbSet<MetricSnapshot> MetricSnapshots { get; }
    DbSet<RequestMetric> RequestMetrics { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<User> Users { get; }
    DbSet<UserOrganization> UserOrganizations { get; }
    DbSet<ApiKey> ApiKeys { get; }
    DbSet<OrganizationInvitation> OrganizationInvitations { get; }
    DbSet<RunNote> RunNotes { get; }
    DbSet<Webhook> Webhooks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
