using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record DeleteTestRunCommand(Guid RunId) : IRequest<Result>;

public class DeleteTestRunCommandHandler : IRequestHandler<DeleteTestRunCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteTestRunCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(DeleteTestRunCommand request, CancellationToken cancellationToken)
    {
        var run = await _context.TestRuns
            .FirstOrDefaultAsync(r => r.Id == request.RunId
                && r.OrganizationId == _currentUser.OrganizationId
                && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result.Failure("Test koşumu bulunamadı.");

        if (run.Status is TestRunStatus.Running or TestRunStatus.Queued or TestRunStatus.Stopping)
            return Result.Failure("Aktif koşum silinemez. Önce iptal edin.");

        run.IsDeleted = true;
        run.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
