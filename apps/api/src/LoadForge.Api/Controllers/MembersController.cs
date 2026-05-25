using LoadForge.Application.Features.Members.Commands;
using LoadForge.Application.Features.Members.Queries;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoadForge.Api.Controllers;

[ApiController]
[Route("api/members")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IMediator _mediator;

    public MembersController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var result = await _mediator.Send(new ListMembersQuery(), ct);
        return Ok(result.Value);
    }

    [HttpPost("invite")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> Invite([FromBody] InviteRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new InviteMemberCommand(body.Email, body.Role), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Value);
    }

    [HttpPatch("{memberId:guid}/role")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateRole(Guid memberId, [FromBody] UpdateRoleRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateMemberRoleCommand(memberId, body.Role), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok();
    }

    [HttpDelete("{memberId:guid}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> Remove(Guid memberId, CancellationToken ct)
    {
        var result = await _mediator.Send(new RemoveMemberCommand(memberId), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return NoContent();
    }
}

[ApiController]
[Route("api/invitations")]
public class InvitationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public InvitationsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("{token}/accept")]
    [AllowAnonymous]
    public async Task<IActionResult> Accept(string token, [FromBody] AcceptInviteRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new AcceptInviteCommand(token, body.DisplayName, body.Password), ct);
        if (!result.IsSuccess) return BadRequest(new { error = result.Error });
        return Ok(result.Value);
    }
}

public record InviteRequest(string Email, UserRole Role);
public record UpdateRoleRequest(UserRole Role);
public record AcceptInviteRequest(string DisplayName, string Password);
