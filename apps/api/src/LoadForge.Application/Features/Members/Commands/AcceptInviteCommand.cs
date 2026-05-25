using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using LoadForge.Application.Features.Auth.Commands;

namespace LoadForge.Application.Features.Members.Commands;

public record AcceptInviteCommand(
    string Token,
    string DisplayName,
    string Password
) : IRequest<Result<AuthResponse>>;

public class AcceptInviteCommandValidator : AbstractValidator<AcceptInviteCommand>
{
    public AcceptInviteCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
    }
}

public class AcceptInviteCommandHandler : IRequestHandler<AcceptInviteCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordService _passwordService;
    private readonly IJwtService _jwtService;

    public AcceptInviteCommandHandler(
        IApplicationDbContext context,
        IPasswordService passwordService,
        IJwtService jwtService)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResponse>> Handle(AcceptInviteCommand request, CancellationToken cancellationToken)
    {
        var invitation = await _context.OrganizationInvitations
            .FirstOrDefaultAsync(i => i.Token == request.Token
                && i.AcceptedAt == null
                && !i.IsDeleted, cancellationToken);

        if (invitation is null)
            return Result<AuthResponse>.Failure("Geçersiz veya süresi dolmuş davet.");

        if (invitation.ExpiresAt < DateTime.UtcNow)
            return Result<AuthResponse>.Failure("Davet süresi dolmuş.");

        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == invitation.Email && !u.IsDeleted, cancellationToken);

        User user;
        if (existingUser is not null)
        {
            user = existingUser;
        }
        else
        {
            user = new User
            {
                Email = invitation.Email,
                DisplayName = request.DisplayName,
                PasswordHash = _passwordService.Hash(request.Password)
            };
            _context.Users.Add(user);
        }

        _context.UserOrganizations.Add(new UserOrganization
        {
            User = user,
            OrganizationId = invitation.OrganizationId,
            Role = invitation.Role
        });

        invitation.AcceptedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var (token, expiresAt) = _jwtService.GenerateToken(user, invitation.OrganizationId, invitation.Role);
        return Result<AuthResponse>.Success(new AuthResponse(token, expiresAt));
    }
}
