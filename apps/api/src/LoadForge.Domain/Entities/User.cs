using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserOrganization> Organizations { get; set; } = [];
    public ICollection<ApiKey> ApiKeys { get; set; } = [];
}
