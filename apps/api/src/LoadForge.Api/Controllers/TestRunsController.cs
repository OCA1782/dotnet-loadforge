using LoadForge.Application.Features.TestRuns.Commands;
using LoadForge.Application.Features.TestRuns.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/test-runs")]
[Authorize]
public class TestRunsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TestRunsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? scenarioId, CancellationToken ct)
    {
        var result = await _mediator.Send(new ListTestRunsQuery(scenarioId), ct);
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Start(StartTestRunCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(Get), new { id = result.Value }, new { id = result.Value });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetTestRunQuery(id), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpGet("{id:guid}/metrics")]
    public async Task<IActionResult> Metrics(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new ListRunMetricsQuery(id), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new CancelTestRunCommand(id), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteTestRunCommand(id), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }

    [HttpPost("{id:guid}/baseline")]
    public async Task<IActionResult> SetBaseline(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new SetBaselineCommand(id), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok();
    }

    [HttpPost("{id:guid}/force-status")]
    public async Task<IActionResult> ForceStatus(Guid id, [FromBody] ForceStatusRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new ForceStatusCommand(id, body.Status), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok();
    }

    [HttpPost("{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new RetryRunCommand(id), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(Get), new { id = result.Value }, new { id = result.Value });
    }

    [HttpDelete]
    public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteRequest? body, CancellationToken ct)
    {
        var result = await _mediator.Send(new BulkDeleteRunsCommand(body?.RunIds), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(new { deleted = result.Value });
    }
}

public record ForceStatusRequest(string Status);
public record BulkDeleteRequest(List<Guid>? RunIds);
