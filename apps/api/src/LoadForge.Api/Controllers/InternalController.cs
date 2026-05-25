using LoadForge.Application.Features.Internal.Commands;
using LoadForge.Application.Features.Metrics.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

// Internal endpoints called by Go workers — not exposed to end users.
// Production: protect with network policy or mutual TLS. Auth is deferred to Faz 2.
[ApiController]
[Route("internal")]
[AllowAnonymous]
public class InternalController : ControllerBase
{
    private readonly IMediator _mediator;

    public InternalController(IMediator mediator) => _mediator = mediator;

    [HttpPost("runs/{runId:guid}/metrics")]
    public async Task<IActionResult> IngestMetrics(
        Guid runId,
        [FromBody] IngestMetricSnapshotRequest body,
        CancellationToken ct)
    {
        var command = new IngestMetricSnapshotCommand(
            TestRunId: runId,
            Timestamp: body.Timestamp == default ? DateTime.UtcNow : body.Timestamp,
            Rps: body.Rps,
            ActiveVu: body.ActiveVu,
            P50Ms: body.P50Ms,
            P90Ms: body.P90Ms,
            P95Ms: body.P95Ms,
            P99Ms: body.P99Ms,
            MaxMs: body.MaxMs,
            ErrorRate: body.ErrorRate,
            TotalRequests: body.TotalRequests,
            TotalErrors: body.TotalErrors,
            WorkerCount: body.WorkerCount,
            WorkerCpuPercent: body.WorkerCpuPercent,
            WorkerMemoryBytes: body.WorkerMemoryBytes
        );

        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Accepted();
    }

    [HttpPost("shards/{shardId:guid}/heartbeat")]
    public async Task<IActionResult> Heartbeat(Guid shardId, CancellationToken ct)
    {
        var result = await _mediator.Send(new ShardHeartbeatCommand(shardId), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok();
    }

    [HttpPost("shards/{shardId:guid}/complete")]
    public async Task<IActionResult> Complete(
        Guid shardId,
        [FromBody] CompleteShardRequest body,
        CancellationToken ct)
    {
        var command = new CompleteShardCommand(
            ShardId: shardId,
            Passed: body.Passed,
            ErrorRate: body.ErrorRate,
            P95Ms: body.P95Ms,
            P99Ms: body.P99Ms
        );

        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok();
    }
}

public record IngestMetricSnapshotRequest(
    DateTime Timestamp,
    double Rps,
    int ActiveVu,
    int P50Ms,
    int P90Ms,
    int P95Ms,
    int P99Ms,
    int MaxMs,
    double ErrorRate,
    long TotalRequests,
    long TotalErrors,
    int? WorkerCount,
    double? WorkerCpuPercent,
    long? WorkerMemoryBytes
);

public record CompleteShardRequest(
    bool Passed,
    double ErrorRate,
    long P95Ms,
    long P99Ms
);
