using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class RequestMetric : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = default!;

    public string RequestName { get; set; } = default!;
    public string? Method { get; set; }
    public string? Url { get; set; }

    public long Count { get; set; }
    public long ErrorCount { get; set; }
    public double ErrorRate { get; set; }

    // Latency (ms)
    public int MinMs { get; set; }
    public int MaxMs { get; set; }
    public int AvgMs { get; set; }
    public int P50Ms { get; set; }
    public int P90Ms { get; set; }
    public int P95Ms { get; set; }
    public int P99Ms { get; set; }

    public long BytesReceived { get; set; }
    public long BytesSent { get; set; }
}
