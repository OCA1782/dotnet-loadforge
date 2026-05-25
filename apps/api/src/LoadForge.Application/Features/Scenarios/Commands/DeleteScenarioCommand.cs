using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Scenarios.Commands;

public record DeleteScenarioCommand(Guid Id) : IRequest<Result<bool>>;

public class DeleteScenarioCommandHandler : IRequestHandler<DeleteScenarioCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteScenarioCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(DeleteScenarioCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var scenario = await _context.Scenarios
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.OrganizationId == orgId && !s.IsDeleted, cancellationToken);

        if (scenario is null)
            return Result<bool>.Failure("Senaryo bulunamadı.");

        scenario.IsDeleted = true;
        scenario.DeletedAt = DateTime.UtcNow;
        scenario.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }
}
