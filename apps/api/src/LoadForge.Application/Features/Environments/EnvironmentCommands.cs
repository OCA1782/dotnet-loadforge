using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Environments;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record EnvironmentDto(Guid Id, string Name, string? BaseUrl, DateTime CreatedAt);

// ── List ─────────────────────────────────────────────────────────────────────

public record ListEnvironmentsQuery : IRequest<Result<List<EnvironmentDto>>>;

public class ListEnvironmentsQueryHandler : IRequestHandler<ListEnvironmentsQuery, Result<List<EnvironmentDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListEnvironmentsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<EnvironmentDto>>> Handle(ListEnvironmentsQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var envs = await _context.Environments
            .Where(e => e.OrganizationId == orgId && !e.IsDeleted)
            .OrderBy(e => e.Name)
            .Select(e => new EnvironmentDto(e.Id, e.Name, e.BaseUrl, e.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<List<EnvironmentDto>>.Success(envs);
    }
}

// ── Create ────────────────────────────────────────────────────────────────────

public record CreateEnvironmentCommand(string Name, string? BaseUrl) : IRequest<Result<EnvironmentDto>>;

public class CreateEnvironmentCommandValidator : AbstractValidator<CreateEnvironmentCommand>
{
    public CreateEnvironmentCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.BaseUrl).Must(url => url == null || Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("BaseUrl geçerli bir URL olmalıdır.");
    }
}

public class CreateEnvironmentCommandHandler : IRequestHandler<CreateEnvironmentCommand, Result<EnvironmentDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateEnvironmentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<EnvironmentDto>> Handle(CreateEnvironmentCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var project = await _context.Projects
            .Where(p => p.OrganizationId == orgId && !p.IsDeleted)
            .OrderBy(p => p.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (project is null)
            return Result<EnvironmentDto>.Failure("Proje bulunamadı.");

        var env = new ProjectEnvironment
        {
            OrganizationId = orgId,
            WorkspaceId = project.WorkspaceId,
            ProjectId = project.Id,
            Name = request.Name,
            BaseUrl = request.BaseUrl,
        };

        _context.Environments.Add(env);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<EnvironmentDto>.Success(new EnvironmentDto(env.Id, env.Name, env.BaseUrl, env.CreatedAt));
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeleteEnvironmentCommand(Guid Id) : IRequest<Result>;

public class DeleteEnvironmentCommandHandler : IRequestHandler<DeleteEnvironmentCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteEnvironmentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(DeleteEnvironmentCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var env = await _context.Environments
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.OrganizationId == orgId && !e.IsDeleted, cancellationToken);

        if (env is null)
            return Result.Failure("Ortam bulunamadı.");

        env.IsDeleted = true;
        env.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
