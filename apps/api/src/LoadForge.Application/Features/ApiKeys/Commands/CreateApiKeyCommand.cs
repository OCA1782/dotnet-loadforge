using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using System.Security.Cryptography;
using System.Text;

namespace LoadForge.Application.Features.ApiKeys.Commands;

public record CreateApiKeyCommand(
    string Name,
    string[] Scopes,
    DateTime? ExpiresAt
) : IRequest<Result<CreateApiKeyResponse>>;

public record CreateApiKeyResponse(
    Guid Id,
    string Name,
    string PlaintextKey,
    string KeyPrefix,
    string[] Scopes,
    DateTime? ExpiresAt,
    DateTime CreatedAt
);

public class CreateApiKeyCommandValidator : AbstractValidator<CreateApiKeyCommand>
{
    public CreateApiKeyCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ExpiresAt).GreaterThan(DateTime.UtcNow).When(x => x.ExpiresAt.HasValue);
    }
}

public class CreateApiKeyCommandHandler : IRequestHandler<CreateApiKeyCommand, Result<CreateApiKeyResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateApiKeyCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<CreateApiKeyResponse>> Handle(CreateApiKeyCommand request, CancellationToken cancellationToken)
    {
        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var plaintext = "lf_" + Convert.ToBase64String(rawBytes)
            .Replace("+", "A").Replace("/", "B").Replace("=", "");

        var keyHash = ComputeSha256(plaintext);
        var keyPrefix = plaintext[..10];

        var apiKey = new ApiKey
        {
            UserId = _currentUser.UserId!.Value,
            OrganizationId = _currentUser.OrganizationId!.Value,
            Name = request.Name,
            KeyHash = keyHash,
            KeyPrefix = keyPrefix,
            Scopes = request.Scopes,
            ExpiresAt = request.ExpiresAt
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<CreateApiKeyResponse>.Success(new CreateApiKeyResponse(
            apiKey.Id, apiKey.Name, plaintext, keyPrefix,
            apiKey.Scopes, apiKey.ExpiresAt, apiKey.CreatedAt));
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }
}
