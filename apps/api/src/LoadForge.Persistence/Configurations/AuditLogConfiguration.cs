using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Action).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EntityType).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ActorEmail).HasMaxLength(256);
        builder.HasIndex(x => new { x.OrganizationId, x.CreatedAt });
        builder.HasIndex(x => new { x.EntityType, x.EntityId });

        // AuditLog soft-delete filtresi yok: tüm kayıtlar korunur
    }
}
