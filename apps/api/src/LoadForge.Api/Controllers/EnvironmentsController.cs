using LoadForge.Application.Features.Environments;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/environments")]
[Authorize]
public class EnvironmentsController : ControllerBase
{
    private readonly IMediator _mediator;
    public EnvironmentsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var result = await _mediator.Send(new ListEnvironmentsQuery(), ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEnvironmentCommand cmd, CancellationToken ct)
    {
        var result = await _mediator.Send(cmd, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteEnvironmentCommand(id), ct);
        return result.IsSuccess ? NoContent() : BadRequest(new { error = result.Error });
    }
}
