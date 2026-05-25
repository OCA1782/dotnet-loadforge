namespace LoadForge.Domain.Enums;

public enum TestRunStatus
{
    Pending = 1,
    Queued = 2,
    Running = 3,
    Stopping = 4,
    Completed = 5,
    Failed = 6,
    Cancelled = 7
}
