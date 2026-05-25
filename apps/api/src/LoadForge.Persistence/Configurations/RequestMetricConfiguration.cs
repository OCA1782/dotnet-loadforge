using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class RequestMetricConfiguration : IEntityTypeConfiguration<RequestMetric>
{
    public void Configure(EntityTypeBuilder<RequestMetric> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.RequestName).IsRequired().HasMaxLength(500);
        builder.HasIndex(x => x.TestRunId);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
