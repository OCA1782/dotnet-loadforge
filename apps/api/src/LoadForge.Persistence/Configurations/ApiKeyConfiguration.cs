using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.KeyHash).IsRequired();
        builder.Property(x => x.KeyPrefix).IsRequired().HasMaxLength(12);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Scopes).HasColumnType("text[]");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
