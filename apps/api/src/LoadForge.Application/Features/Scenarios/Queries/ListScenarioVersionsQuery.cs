using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Scenarios.Queries;

public record ScenarioVersionDto(
    Guid Id,
    int VersionNo,
    string? ChangeNote,
    Guid CreatedBy,
    DateTime CreatedAt,
    int RunCount
);

public record ListScenarioVersionsQuery(Guid ScenarioId) : IRequest<Result<List<ScenarioVersionDto>>>;

public class ListScenarioVersionsQueryHandler : IRequestHandler<ListScenarioVersionsQuery, Result<List<ScenarioVersionDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListScenarioVersionsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ScenarioVersionDto>>> Handle(ListScenarioVersionsQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var scenario = await _context.Scenarios
            .FirstOrDefaultAsync(s => s.Id == request.ScenarioId && s.OrganizationId == orgId && !s.IsDeleted, cancellationToken);

        if (scenario is null)
            return Result<List<ScenarioVersionDto>>.Failure("Senaryo bulunamadı.");

        var versions = await _context.ScenarioVersions
            .Where(v => v.ScenarioId == request.ScenarioId && !v.IsDeleted)
            .OrderByDescending(v => v.VersionNo)
            .Select(v => new ScenarioVersionDto(
                v.Id,
                v.VersionNo,
                v.ChangeNote,
                v.CreatedBy,
                v.CreatedAt,
                v.TestRuns.Count(r => !r.IsDeleted)
            ))
            .ToListAsync(cancellationToken);

        return Result<List<ScenarioVersionDto>>.Success(versions);
    }
}
