using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Members.Commands;

public record RemoveMemberCommand(Guid MemberId) : IRequest<Result>;

public class RemoveMemberCommandHandler : IRequestHandler<RemoveMemberCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public RemoveMemberCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(RemoveMemberCommand request, CancellationToken cancellationToken)
    {
        if (request.MemberId == _currentUser.UserId)
            return Result.Failure("Kendinizi organizasyondan çıkaramazsınız.");

        var membership = await _context.UserOrganizations
            .FirstOrDefaultAsync(uo => uo.UserId == request.MemberId
                && uo.OrganizationId == _currentUser.OrganizationId
                && !uo.IsDeleted, cancellationToken);

        if (membership is null)
            return Result.Failure("Üye bulunamadı.");

        if (membership.Role == UserRole.Owner)
            return Result.Failure("Owner organizasyondan çıkarılamaz.");

        membership.IsDeleted = true;
        membership.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
