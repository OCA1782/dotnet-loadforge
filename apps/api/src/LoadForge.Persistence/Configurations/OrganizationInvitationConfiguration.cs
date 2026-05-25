using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class OrganizationInvitationConfiguration : IEntityTypeConfiguration<OrganizationInvitation>
{
    public void Configure(EntityTypeBuilder<OrganizationInvitation> builder)
    {
        builder.ToTable("OrganizationInvitations");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Email).IsRequired().HasMaxLength(256);
        builder.Property(i => i.Token).IsRequired().HasMaxLength(64);
        builder.HasIndex(i => i.Token).IsUnique();
        builder.HasIndex(i => new { i.OrganizationId, i.Email });

        builder.HasOne(i => i.Organization)
            .WithMany()
            .HasForeignKey(i => i.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
