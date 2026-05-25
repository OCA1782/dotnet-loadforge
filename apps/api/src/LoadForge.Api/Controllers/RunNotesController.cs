using LoadForge.Application.Features.RunNotes;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/test-runs/{runId:guid}/notes")]
[Authorize]
public class RunNotesController : ControllerBase
{
    private readonly IMediator _mediator;
    public RunNotesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(Guid runId, CancellationToken ct)
    {
        var result = await _mediator.Send(new ListRunNotesQuery(runId), ct);
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid runId, [FromBody] AddNoteRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new AddRunNoteCommand(runId, body.Content), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpDelete("{noteId:guid}")]
    public async Task<IActionResult> Delete(Guid runId, Guid noteId, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteRunNoteCommand(noteId), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }
}

public record AddNoteRequest(string Content);
