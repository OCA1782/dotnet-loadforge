using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Scenarios.Queries;

public record ListScenariosQuery : IRequest<Result<List<ScenarioListDto>>>;

public record ScenarioListDto(
    Guid Id,
    string Name,
    string? Description,
    string Protocol,
    DateTime CreatedAt,
    Guid? LatestVersionId,
    int? LatestVersionNo
);

public class ListScenariosQueryHandler : IRequestHandler<ListScenariosQuery, Result<List<ScenarioListDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListScenariosQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ScenarioListDto>>> Handle(ListScenariosQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var scenarios = await _context.Scenarios
            .Where(s => s.OrganizationId == orgId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new ScenarioListDto(
                s.Id,
                s.Name,
                s.Description,
                "http",
                s.CreatedAt,
                s.CurrentVersionId,
                s.Versions
                    .Where(v => v.Id == s.CurrentVersionId)
                    .Select(v => (int?)v.VersionNo)
                    .FirstOrDefault()
            ))
            .ToListAsync(cancellationToken);

        return Result<List<ScenarioListDto>>.Success(scenarios);
    }
}
