using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class ProjectEnvironmentConfiguration : IEntityTypeConfiguration<ProjectEnvironment>
{
    public void Configure(EntityTypeBuilder<ProjectEnvironment> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.HasIndex(x => new { x.ProjectId, x.Name }).HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.Project).WithMany(p => p.Environments).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Secrets).WithOne(s => s.Environment).HasForeignKey(s => s.EnvironmentId).OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
