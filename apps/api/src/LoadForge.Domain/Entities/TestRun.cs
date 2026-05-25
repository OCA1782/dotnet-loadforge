using LoadForge.Domain.Common;
using LoadForge.Domain.Enums;

namespace LoadForge.Domain.Entities;

public class TestRun : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = default!;

    public Guid ScenarioVersionId { get; set; }
    public ScenarioVersion ScenarioVersion { get; set; } = default!;

    public Guid? EnvironmentId { get; set; }
    public ProjectEnvironment? Environment { get; set; }

    public TestRunStatus Status { get; set; } = TestRunStatus.Pending;
    public string ExecutionMode { get; set; } = "single";

    // Load profile
    public int VirtualUsers { get; set; }
    public int DurationSeconds { get; set; }
    public int RampUpSeconds { get; set; }
    public int? TargetRps { get; set; }
    public string? Region { get; set; }

    // Quality gate
    public double? MaxErrorRate { get; set; }
    public int? MaxP95Ms { get; set; }
    public int? MaxP99Ms { get; set; }

    // Results
    public bool? Passed { get; set; }
    public string? FailReason { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Summary (denormalized for fast listing)
    public double? SummaryRps { get; set; }
    public int? SummaryP95Ms { get; set; }
    public int? SummaryP99Ms { get; set; }
    public double? SummaryErrorRate { get; set; }

    public Guid InitiatedBy { get; set; }

    public bool IsBaseline { get; set; }

    public ICollection<TestRunShard> Shards { get; set; } = [];
    public ICollection<RunNote> Notes { get; set; } = [];
    public ICollection<MetricSnapshot> MetricSnapshots { get; set; } = [];
    public ICollection<RequestMetric> RequestMetrics { get; set; } = [];
}
