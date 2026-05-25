using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Webhook : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = default!;
    public string Url { get; set; } = default!;
    public string Events { get; set; } = "run.completed,run.failed";
    public bool IsActive { get; set; } = true;
    public string? Secret { get; set; }
}
