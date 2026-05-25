using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid? ActorId { get; set; }
    public string? ActorEmail { get; set; }

    public string Action { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public Guid? EntityId { get; set; }

    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
