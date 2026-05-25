using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class UserOrganizationConfiguration : IEntityTypeConfiguration<UserOrganization>
{
    public void Configure(EntityTypeBuilder<UserOrganization> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.UserId, x.OrganizationId }).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.User).WithMany(u => u.Organizations).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Organization).WithMany(o => o.Members).HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
