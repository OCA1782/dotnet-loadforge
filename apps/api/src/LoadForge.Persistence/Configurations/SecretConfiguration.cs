using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class SecretConfiguration : IEntityTypeConfiguration<Secret>
{
    public void Configure(EntityTypeBuilder<Secret> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Key).IsRequired().HasMaxLength(200);
        builder.Property(x => x.EncryptedValue).IsRequired();
        builder.HasIndex(x => new { x.EnvironmentId, x.Key }).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
