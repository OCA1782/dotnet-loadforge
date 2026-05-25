using LoadForge.Application.Features.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator) => _mediator = mediator;

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        if (!result.IsSuccess) return Unauthorized(new { error = result.Error });
        return Ok(result.Value);
    }
}
