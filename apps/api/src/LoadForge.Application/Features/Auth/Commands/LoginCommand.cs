using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<Result<AuthResponse>>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordService _passwordService;
    private readonly IJwtService _jwtService;

    public LoginCommandHandler(IApplicationDbContext context, IPasswordService passwordService, IJwtService jwtService)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
    }

    public async Task<Result<AuthResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower() && !u.IsDeleted, cancellationToken);

        if (user is null || !_passwordService.Verify(request.Password, user.PasswordHash))
            return Result<AuthResponse>.Failure("Geçersiz e-posta veya şifre.");

        if (!user.IsActive)
            return Result<AuthResponse>.Failure("Hesap aktif değil.");

        var membership = await _context.UserOrganizations
            .FirstOrDefaultAsync(uo => uo.UserId == user.Id && !uo.IsDeleted, cancellationToken);

        if (membership is null)
            return Result<AuthResponse>.Failure("Bu kullanıcının bağlı olduğu organizasyon bulunamadı.");

        var (token, expiresAt) = _jwtService.GenerateToken(user, membership.OrganizationId, membership.Role);

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(new AuthResponse(token, expiresAt));
    }
}
