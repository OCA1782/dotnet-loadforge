using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class ScenarioVersion : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = default!;

    public int VersionNo { get; set; }
    public string Content { get; set; } = default!;
    public string ContentFormat { get; set; } = "yaml";
    public string Checksum { get; set; } = default!;
    public string? ChangeNote { get; set; }
    public Guid CreatedBy { get; set; }

    public ICollection<TestRun> TestRuns { get; set; } = [];
}
