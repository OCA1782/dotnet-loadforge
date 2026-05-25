using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace LoadForge.Application.Features.Auth.Commands;

public record RegisterCommand(
    string Email,
    string Password,
    string OrganizationName,
    string? DisplayName = null,
    string? OrganizationSlug = null
) : IRequest<Result<AuthResponse>>;

public record AuthResponse(string Token, DateTime ExpiresAt);

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.OrganizationName).NotEmpty().MaximumLength(100);
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordService _passwordService;
    private readonly IJwtService _jwtService;

    public RegisterCommandHandler(IApplicationDbContext context, IPasswordService passwordService, IJwtService jwtService)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResponse>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.ToLower();
        if (await _context.Users.AnyAsync(u => u.Email == emailLower && !u.IsDeleted, cancellationToken))
            return Result<AuthResponse>.Failure("Bu e-posta adresi zaten kullanılıyor.");

        var slug = await ResolveUniqueSlugAsync(
            request.OrganizationSlug ?? GenerateSlug(request.OrganizationName),
            cancellationToken);

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? emailLower.Split('@')[0]
            : request.DisplayName;

        var user = new User
        {
            Email = emailLower,
            DisplayName = displayName,
            PasswordHash = _passwordService.Hash(request.Password)
        };

        var organization = new Organization { Name = request.OrganizationName, Slug = slug };

        var workspace = new Workspace
        {
            Organization = organization,
            OrganizationId = organization.Id,
            Name = "Default",
            Slug = "default"
        };

        var project = new Project
        {
            OrganizationId = organization.Id,
            Workspace = workspace,
            WorkspaceId = workspace.Id,
            Name = "Default",
            Slug = "default"
        };

        _context.Users.Add(user);
        _context.Organizations.Add(organization);
        _context.Workspaces.Add(workspace);
        _context.Projects.Add(project);
        _context.UserOrganizations.Add(new UserOrganization
        {
            User = user,
            Organization = organization,
            Role = UserRole.Owner
        });

        await _context.SaveChangesAsync(cancellationToken);

        var (token, expiresAt) = _jwtService.GenerateToken(user, organization.Id, UserRole.Owner);
        return Result<AuthResponse>.Success(new AuthResponse(token, expiresAt));
    }

    private async Task<string> ResolveUniqueSlugAsync(string baseSlug, CancellationToken ct)
    {
        if (!await _context.Organizations.AnyAsync(o => o.Slug == baseSlug && !o.IsDeleted, ct))
            return baseSlug;

        for (var i = 2; i < 100; i++)
        {
            var candidate = $"{baseSlug}-{i}";
            if (!await _context.Organizations.AnyAsync(o => o.Slug == candidate && !o.IsDeleted, ct))
                return candidate;
        }
        return $"{baseSlug}-{Guid.NewGuid():N[..6]}";
    }

    private static string GenerateSlug(string name) =>
        Regex.Replace(name.ToLower().Trim(), @"[^a-z0-9]+", "-").Trim('-');
}
