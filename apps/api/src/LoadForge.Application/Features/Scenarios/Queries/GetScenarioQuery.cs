using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Scenarios.Queries;

public record GetScenarioQuery(Guid Id) : IRequest<Result<ScenarioDetailDto>>;

public record ScenarioDetailDto(
    Guid Id,
    string Name,
    string? Description,
    string Protocol,
    DateTime CreatedAt,
    Guid? LatestVersionId,
    int? LatestVersionNo,
    string? Content,
    string? ContentFormat
);

public class GetScenarioQueryHandler : IRequestHandler<GetScenarioQuery, Result<ScenarioDetailDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetScenarioQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<ScenarioDetailDto>> Handle(GetScenarioQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var scenario = await _context.Scenarios
            .Where(s => s.Id == request.Id && s.OrganizationId == orgId && !s.IsDeleted)
            .Select(s => new ScenarioDetailDto(
                s.Id,
                s.Name,
                s.Description,
                "http",
                s.CreatedAt,
                s.CurrentVersionId,
                s.Versions
                    .Where(v => v.Id == s.CurrentVersionId)
                    .Select(v => (int?)v.VersionNo)
                    .FirstOrDefault(),
                s.Versions
                    .Where(v => v.Id == s.CurrentVersionId)
                    .Select(v => v.Content)
                    .FirstOrDefault(),
                s.Versions
                    .Where(v => v.Id == s.CurrentVersionId)
                    .Select(v => v.ContentFormat)
                    .FirstOrDefault()
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (scenario is null)
            return Result<ScenarioDetailDto>.Failure("Senaryo bulunamadı.");

        return Result<ScenarioDetailDto>.Success(scenario);
    }
}
