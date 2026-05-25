using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Members.Commands;

public record UpdateMemberRoleCommand(Guid MemberId, UserRole Role) : IRequest<Result>;

public class UpdateMemberRoleCommandHandler : IRequestHandler<UpdateMemberRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateMemberRoleCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateMemberRoleCommand request, CancellationToken cancellationToken)
    {
        if (request.Role == UserRole.Owner)
            return Result.Failure("Owner rolü atanamaz.");

        var membership = await _context.UserOrganizations
            .FirstOrDefaultAsync(uo => uo.UserId == request.MemberId
                && uo.OrganizationId == _currentUser.OrganizationId
                && !uo.IsDeleted, cancellationToken);

        if (membership is null)
            return Result.Failure("Üye bulunamadı.");

        if (membership.Role == UserRole.Owner)
            return Result.Failure("Owner rolü değiştirilemez.");

        membership.Role = request.Role;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
