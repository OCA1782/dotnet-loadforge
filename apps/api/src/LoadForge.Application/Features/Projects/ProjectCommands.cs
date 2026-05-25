using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace LoadForge.Application.Features.Projects;

public record CreateProjectCommand(
    string Name,
    string? Description,
    string? BaseUrl
) : IRequest<Result<Guid>>;

public class CreateProjectCommandValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.BaseUrl).MaximumLength(500).When(x => x.BaseUrl is not null);
    }
}

public class CreateProjectCommandHandler : IRequestHandler<CreateProjectCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateProjectCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<Guid>> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.OrganizationId == orgId && !w.IsDeleted, cancellationToken);

        if (workspace is null)
            return Result<Guid>.Failure("Workspace bulunamadı.");

        var baseSlug = GenerateSlug(request.Name);
        var slug = await ResolveUniqueSlugAsync(orgId, baseSlug, cancellationToken);

        var project = new Project
        {
            OrganizationId = orgId,
            WorkspaceId = workspace.Id,
            Workspace = workspace,
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            BaseUrl = request.BaseUrl,
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(project.Id);
    }

    private async Task<string> ResolveUniqueSlugAsync(Guid orgId, string baseSlug, CancellationToken ct)
    {
        if (!await _context.Projects.AnyAsync(p => p.OrganizationId == orgId && p.Slug == baseSlug && !p.IsDeleted, ct))
            return baseSlug;

        for (var i = 2; i < 100; i++)
        {
            var candidate = $"{baseSlug}-{i}";
            if (!await _context.Projects.AnyAsync(p => p.OrganizationId == orgId && p.Slug == candidate && !p.IsDeleted, ct))
                return candidate;
        }
        return $"{baseSlug}-{Guid.NewGuid():N[..6]}";
    }

    private static string GenerateSlug(string name) =>
        Regex.Replace(name.ToLower().Trim(), @"[^a-z0-9]+", "-").Trim('-');
}

public record DeleteProjectCommand(Guid Id) : IRequest<Result<Unit>>;

public class DeleteProjectCommandHandler : IRequestHandler<DeleteProjectCommand, Result<Unit>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteProjectCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<Unit>> Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.OrganizationId == orgId && !p.IsDeleted, cancellationToken);

        if (project is null)
            return Result<Unit>.Failure("Proje bulunamadı.");

        var hasScenarios = await _context.Scenarios
            .AnyAsync(s => s.ProjectId == project.Id && !s.IsDeleted, cancellationToken);

        if (hasScenarios)
            return Result<Unit>.Failure("Senaryo içeren bir proje silinemez.");

        project.IsDeleted = true;
        project.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
