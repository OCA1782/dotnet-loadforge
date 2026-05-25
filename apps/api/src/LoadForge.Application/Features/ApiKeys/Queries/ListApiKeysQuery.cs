using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.ApiKeys.Queries;

public record ListApiKeysQuery : IRequest<Result<List<ApiKeyDto>>>;

public record ApiKeyDto(
    Guid Id,
    string Name,
    string KeyPrefix,
    string[] Scopes,
    DateTime? ExpiresAt,
    DateTime? LastUsedAt,
    bool IsRevoked,
    DateTime CreatedAt
);

public class ListApiKeysQueryHandler : IRequestHandler<ListApiKeysQuery, Result<List<ApiKeyDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListApiKeysQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ApiKeyDto>>> Handle(ListApiKeysQuery request, CancellationToken cancellationToken)
    {
        var keys = await _context.ApiKeys
            .Where(k => k.OrganizationId == _currentUser.OrganizationId && !k.IsDeleted)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new ApiKeyDto(
                k.Id, k.Name, k.KeyPrefix, k.Scopes,
                k.ExpiresAt, k.LastUsedAt, k.IsRevoked, k.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<List<ApiKeyDto>>.Success(keys);
    }
}
