using LoadForge.Application.Features.Webhooks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
[Authorize]
public class WebhooksController : ControllerBase
{
    private readonly IMediator _mediator;
    public WebhooksController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var result = await _mediator.Send(new ListWebhooksQuery(), ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebhookCommand cmd, CancellationToken ct)
    {
        var result = await _mediator.Send(cmd, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new ToggleWebhookCommand(id), ct);
        return result.IsSuccess ? Ok(new { isActive = result.Value }) : BadRequest(new { error = result.Error });
    }

    [HttpPost("{id:guid}/test")]
    public async Task<IActionResult> Test(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new TestWebhookCommand(id), ct);
        return result.IsSuccess ? Ok(new { response = result.Value }) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteWebhookCommand(id), ct);
        return result.IsSuccess ? NoContent() : BadRequest(new { error = result.Error });
    }
}
