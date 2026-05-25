using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record BulkDeleteRunsCommand(List<Guid>? RunIds = null) : IRequest<Result<int>>;

public class BulkDeleteRunsCommandHandler : IRequestHandler<BulkDeleteRunsCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public BulkDeleteRunsCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<int>> Handle(BulkDeleteRunsCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var query = _context.TestRuns
            .Where(r => r.OrganizationId == orgId
                && !r.IsDeleted
                && (r.Status == TestRunStatus.Completed
                    || r.Status == TestRunStatus.Failed
                    || r.Status == TestRunStatus.Cancelled));

        if (request.RunIds is { Count: > 0 })
            query = query.Where(r => request.RunIds.Contains(r.Id));

        var runs = await query.ToListAsync(cancellationToken);

        if (runs.Count == 0)
            return Result<int>.Success(0);

        var now = DateTime.UtcNow;
        foreach (var run in runs)
        {
            run.IsDeleted = true;
            run.DeletedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<int>.Success(runs.Count);
    }
}
