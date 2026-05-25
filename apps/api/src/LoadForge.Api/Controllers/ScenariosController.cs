using LoadForge.Application.Features.Scenarios.Commands;
using LoadForge.Application.Features.Scenarios.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/scenarios")]
[Authorize]
public class ScenariosController : ControllerBase
{
    private readonly IMediator _mediator;

    public ScenariosController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var result = await _mediator.Send(new ListScenariosQuery(), ct);
        return Ok(result.Value);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetScenarioQuery(id), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateScenarioCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(List), new { id = result.Value }, new { id = result.Value });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateScenarioCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command with { Id = id }, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteScenarioCommand(id), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return NoContent();
    }

    [HttpGet("{id:guid}/versions")]
    public async Task<IActionResult> Versions(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new ListScenarioVersionsQuery(id), ct);
        if (!result.IsSuccess) return NotFound(new { error = result.Error });
        return Ok(result.Value);
    }
}
