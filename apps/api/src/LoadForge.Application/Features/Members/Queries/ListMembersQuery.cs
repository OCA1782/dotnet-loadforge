using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Members.Queries;

public record ListMembersQuery : IRequest<Result<List<MemberDto>>>;

public record MemberDto(
    Guid UserId,
    string Email,
    string DisplayName,
    UserRole Role,
    DateTime JoinedAt,
    DateTime? LastLoginAt
);

public class ListMembersQueryHandler : IRequestHandler<ListMembersQuery, Result<List<MemberDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListMembersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MemberDto>>> Handle(ListMembersQuery request, CancellationToken cancellationToken)
    {
        var members = await _context.UserOrganizations
            .Where(uo => uo.OrganizationId == _currentUser.OrganizationId && !uo.IsDeleted)
            .OrderBy(uo => uo.Role)
            .ThenBy(uo => uo.JoinedAt)
            .Select(uo => new MemberDto(
                uo.UserId,
                uo.User.Email,
                uo.User.DisplayName,
                uo.Role,
                uo.JoinedAt,
                uo.User.LastLoginAt))
            .ToListAsync(cancellationToken);

        return Result<List<MemberDto>>.Success(members);
    }
}
