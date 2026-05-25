using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class ScenarioVersionConfiguration : IEntityTypeConfiguration<ScenarioVersion>
{
    public void Configure(EntityTypeBuilder<ScenarioVersion> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Content).IsRequired();
        builder.Property(x => x.ContentFormat).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Checksum).IsRequired().HasMaxLength(64);
        builder.HasIndex(x => new { x.ScenarioId, x.VersionNo }).IsUnique();

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
