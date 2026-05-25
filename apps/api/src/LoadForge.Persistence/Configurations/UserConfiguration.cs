using LoadForge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LoadForge.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Email).IsRequired().HasMaxLength(256);
        builder.Property(x => x.DisplayName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.PasswordHash).IsRequired();
        builder.HasIndex(x => x.Email).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
