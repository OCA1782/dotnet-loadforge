using LoadForge.Application.Features.ApiKeys.Commands;
using LoadForge.Application.Features.ApiKeys.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/api-keys")]
[Authorize]
public class ApiKeysController : ControllerBase
{
    private readonly IMediator _mediator;

    public ApiKeysController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var result = await _mediator.Send(new ListApiKeysQuery(), ct);
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateApiKeyCommand(body.Name, body.Scopes ?? [], body.ExpiresAt), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return CreatedAtAction(nameof(List), result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new RevokeApiKeyCommand(id), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }
}

public record CreateApiKeyRequest(string Name, string[]? Scopes, DateTime? ExpiresAt);
