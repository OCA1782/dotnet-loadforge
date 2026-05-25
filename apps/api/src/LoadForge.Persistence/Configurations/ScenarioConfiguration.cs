using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class ScenarioConfiguration : IEntityTypeConfiguration<Scenario>
{
    public void Configure(EntityTypeBuilder<Scenario> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.HasIndex(x => new { x.ProjectId, x.Name }).HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.Project).WithMany(p => p.Scenarios).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Versions).WithOne(v => v.Scenario).HasForeignKey(v => v.ScenarioId).OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
