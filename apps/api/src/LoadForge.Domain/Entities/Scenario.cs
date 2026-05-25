using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class Scenario : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public Guid? CurrentVersionId { get; set; }

    public ICollection<ScenarioVersion> Versions { get; set; } = [];
    public ICollection<TestRun> TestRuns { get; set; } = [];
}
