using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class MetricSnapshot : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = default!;

    public DateTime Timestamp { get; set; }
    public double Rps { get; set; }
    public int ActiveVu { get; set; }

    // Latency (ms)
    public int P50Ms { get; set; }
    public int P90Ms { get; set; }
    public int P95Ms { get; set; }
    public int P99Ms { get; set; }
    public int MaxMs { get; set; }

    public double ErrorRate { get; set; }
    public long TotalRequests { get; set; }
    public long TotalErrors { get; set; }

    // Worker health
    public int? WorkerCount { get; set; }
    public double? WorkerCpuPercent { get; set; }
    public long? WorkerMemoryBytes { get; set; }
}
