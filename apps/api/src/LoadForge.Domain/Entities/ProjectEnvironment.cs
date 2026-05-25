using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class ProjectEnvironment : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string? BaseUrl { get; set; }
    public string? VariablesJson { get; set; }

    public ICollection<Secret> Secrets { get; set; } = [];
}
