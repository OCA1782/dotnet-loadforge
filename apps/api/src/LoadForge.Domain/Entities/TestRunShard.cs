using LoadForge.Domain.Common;
using LoadForge.Domain.Enums;

namespace LoadForge.Domain.Entities;

public class TestRunShard : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = default!;

    public int ShardIndex { get; set; }
    public int ShardCount { get; set; }
    public string? WorkerId { get; set; }
    public ShardStatus Status { get; set; } = ShardStatus.Pending;

    public int VirtualUsers { get; set; }
    public int? TargetRps { get; set; }

    public DateTime? AssignedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? LastHeartbeatAt { get; set; }

    public string? FailReason { get; set; }
}
