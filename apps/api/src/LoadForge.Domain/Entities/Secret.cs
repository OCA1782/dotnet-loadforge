using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Secret : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid EnvironmentId { get; set; }
    public ProjectEnvironment Environment { get; set; } = default!;

    public string Key { get; set; } = default!;
    public string EncryptedValue { get; set; } = default!;
    public string? Description { get; set; }
    // Vault/KMS entegrasyonu için referans (plain text secret saklanmaz)
    public string? VaultReference { get; set; }
}
