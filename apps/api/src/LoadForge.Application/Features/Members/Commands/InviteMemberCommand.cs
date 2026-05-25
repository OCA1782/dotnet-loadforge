using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace LoadForge.Application.Features.Members.Commands;

public record InviteMemberCommand(string Email, UserRole Role) : IRequest<Result<InviteResponse>>;

public record InviteResponse(Guid InvitationId, string Token, string Email, UserRole Role, DateTime ExpiresAt);

public class InviteMemberCommandValidator : AbstractValidator<InviteMemberCommand>
{
    public InviteMemberCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Role).IsInEnum()
            .Must(r => r != UserRole.Owner)
            .WithMessage("Owner rolü atanamaz.");
    }
}

public class InviteMemberCommandHandler : IRequestHandler<InviteMemberCommand, Result<InviteResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public InviteMemberCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<InviteResponse>> Handle(InviteMemberCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;
        var emailLower = request.Email.ToLower();

        var alreadyMember = await _context.UserOrganizations
            .AnyAsync(uo => uo.OrganizationId == orgId
                && uo.User.Email == emailLower
                && !uo.IsDeleted, cancellationToken);

        if (alreadyMember)
            return Result<InviteResponse>.Failure("Bu kullanıcı zaten organizasyonun üyesi.");

        // Cancel any existing pending invitation for this email
        var existing = await _context.OrganizationInvitations
            .Where(i => i.OrganizationId == orgId && i.Email == emailLower && i.AcceptedAt == null && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var inv in existing)
            inv.IsDeleted = true;

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "A").Replace("/", "B").Replace("=", "");

        var invitation = new OrganizationInvitation
        {
            OrganizationId = orgId,
            Email = emailLower,
            Role = request.Role,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            InvitedBy = _currentUser.UserId!.Value
        };

        _context.OrganizationInvitations.Add(invitation);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<InviteResponse>.Success(
            new InviteResponse(invitation.Id, token, emailLower, request.Role, invitation.ExpiresAt));
    }
}
