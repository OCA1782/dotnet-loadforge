using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Workspace : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<Project> Projects { get; set; } = [];
}
