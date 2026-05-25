using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class TestRunShardConfiguration : IEntityTypeConfiguration<TestRunShard>
{
    public void Configure(EntityTypeBuilder<TestRunShard> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.TestRunId, x.ShardIndex }).IsUnique();
        builder.HasIndex(x => new { x.Status, x.LastHeartbeatAt });

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
