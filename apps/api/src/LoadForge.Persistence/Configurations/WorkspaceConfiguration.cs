using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class WorkspaceConfiguration : IEntityTypeConfiguration<Workspace>
{
    public void Configure(EntityTypeBuilder<Workspace> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Slug).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => new { x.OrganizationId, x.Slug }).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.Organization).WithMany(o => o.Workspaces).HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Projects).WithOne(p => p.Workspace).HasForeignKey(p => p.WorkspaceId).OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
