using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Project : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }
    public string? BaseUrl { get; set; }

    public ICollection<ProjectEnvironment> Environments { get; set; } = [];
    public ICollection<Scenario> Scenarios { get; set; } = [];
}
