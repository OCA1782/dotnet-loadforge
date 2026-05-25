using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Slug).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => new { x.WorkspaceId, x.Slug }).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.Workspace).WithMany(w => w.Projects).HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Environments).WithOne(e => e.Project).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Scenarios).WithOne(s => s.Project).HasForeignKey(s => s.ProjectId).OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
