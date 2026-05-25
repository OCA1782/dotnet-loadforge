using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.TestRuns.Commands;

public record SetBaselineCommand(Guid RunId) : IRequest<Result>;

public class SetBaselineCommandHandler : IRequestHandler<SetBaselineCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SetBaselineCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(SetBaselineCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var run = await _context.TestRuns
            .FirstOrDefaultAsync(r => r.Id == request.RunId
                && r.OrganizationId == orgId
                && !r.IsDeleted, cancellationToken);

        if (run is null)
            return Result.Failure("Test koşumu bulunamadı.");

        if (run.Status is not (TestRunStatus.Completed or TestRunStatus.Failed))
            return Result.Failure("Yalnızca tamamlanmış koşumlar temel çizgi olarak işaretlenebilir.");

        // Aynı senaryo için önceki temel çizgiyi kaldır
        var previous = await _context.TestRuns
            .Where(r => r.ScenarioId == run.ScenarioId
                && r.OrganizationId == orgId
                && r.IsBaseline
                && !r.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var prev in previous)
            prev.IsBaseline = false;

        run.IsBaseline = !run.IsBaseline; // toggle
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
