namespace LoadForge.Domain.Enums;

public enum ShardStatus
{
    Pending = 1,
    Assigned = 2,
    Running = 3,
    Completed = 4,
    Failed = 5,
    TimedOut = 6
}
