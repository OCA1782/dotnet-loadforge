using LoadForge.Domain.Common;
using LoadForge.Domain.Enums;

namespace LoadForge.Domain.Entities;

public class OrganizationInvitation : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = default!;

    public string Email { get; set; } = default!;
    public UserRole Role { get; set; }
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public Guid InvitedBy { get; set; }
}
