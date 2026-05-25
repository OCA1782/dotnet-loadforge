using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class MetricSnapshotConfiguration : IEntityTypeConfiguration<MetricSnapshot>
{
    public void Configure(EntityTypeBuilder<MetricSnapshot> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.TestRunId, x.Timestamp });

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
