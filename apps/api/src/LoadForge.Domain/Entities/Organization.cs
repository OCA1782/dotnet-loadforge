using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Organization : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Plan { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Workspace> Workspaces { get; set; } = [];
    public ICollection<UserOrganization> Members { get; set; } = [];
}
