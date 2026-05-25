using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.ApiKeys.Commands;

public record RevokeApiKeyCommand(Guid ApiKeyId) : IRequest<Result>;

public class RevokeApiKeyCommandHandler : IRequestHandler<RevokeApiKeyCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public RevokeApiKeyCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RevokeApiKeyCommand request, CancellationToken cancellationToken)
    {
        var key = await _context.ApiKeys
            .FirstOrDefaultAsync(k => k.Id == request.ApiKeyId
                && k.OrganizationId == _currentUser.OrganizationId
                && !k.IsDeleted, cancellationToken);

        if (key is null)
            return Result.Failure("API key bulunamadı.");

        key.IsRevoked = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
