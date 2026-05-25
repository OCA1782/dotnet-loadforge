using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class TestRunConfiguration : IEntityTypeConfiguration<TestRun>
{
    public void Configure(EntityTypeBuilder<TestRun> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.OrganizationId, x.Status });
        builder.HasIndex(x => new { x.ScenarioId, x.CreatedAt });

        builder.HasOne(x => x.Scenario).WithMany(s => s.TestRuns).HasForeignKey(x => x.ScenarioId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ScenarioVersion).WithMany(v => v.TestRuns).HasForeignKey(x => x.ScenarioVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Environment).WithMany().HasForeignKey(x => x.EnvironmentId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        builder.HasMany(x => x.Shards).WithOne(s => s.TestRun).HasForeignKey(s => s.TestRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.MetricSnapshots).WithOne(m => m.TestRun).HasForeignKey(m => m.TestRunId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.RequestMetrics).WithOne(r => r.TestRun).HasForeignKey(r => r.TestRunId).OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
