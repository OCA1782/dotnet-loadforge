using LoadForge.Domain.Common;
using LoadForge.Domain.Enums;

namespace LoadForge.Domain.Entities;

public class UserOrganization : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = default!;

    public UserRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
