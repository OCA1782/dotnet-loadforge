using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class ApiKey : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string KeyHash { get; set; } = default!;
    public string KeyPrefix { get; set; } = default!;
    public string[] Scopes { get; set; } = [];
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsRevoked { get; set; }
}
