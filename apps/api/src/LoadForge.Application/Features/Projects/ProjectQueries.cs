using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Projects;

public record ListProjectsQuery : IRequest<Result<List<ProjectListDto>>>;

public record ProjectListDto(
    Guid Id,
    string Name,
    string? Description,
    string Slug,
    string? BaseUrl,
    int ScenarioCount,
    DateTime CreatedAt
);

public class ListProjectsQueryHandler : IRequestHandler<ListProjectsQuery, Result<List<ProjectListDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListProjectsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ProjectListDto>>> Handle(ListProjectsQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var projects = await _context.Projects
            .Where(p => p.OrganizationId == orgId && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectListDto(
                p.Id,
                p.Name,
                p.Description,
                p.Slug,
                p.BaseUrl,
                p.Scenarios.Count(s => !s.IsDeleted),
                p.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result<List<ProjectListDto>>.Success(projects);
    }
}
