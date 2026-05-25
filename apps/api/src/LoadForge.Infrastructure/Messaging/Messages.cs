namespace LoadForge.Infrastructure.Messaging;

public record RunDispatchMessage(Guid TestRunId, Guid OrganizationId);

public record RunCancelMessage(Guid TestRunId, Guid OrganizationId);

public record ShardJobMessage(
    Guid TestRunId,
    Guid ShardId,
    int ShardIndex,
    int ShardCount,
    string ScenarioContent,
    string ApiBaseUrl,
    Guid OrganizationId,
    int VirtualUsers,
    int DurationSeconds,
    int RampUpSeconds,
    int? TargetRps,
    double? MaxErrorRate,
    int? MaxP95Ms,
    int? MaxP99Ms
);
