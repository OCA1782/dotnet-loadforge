using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace LoadForge.Application.Features.Scenarios.Commands;

public record CreateScenarioCommand(
    string Name,
    string? Description,
    string Content,
    string ContentFormat = "yaml",
    string? ChangeNote = null,
    Guid? ProjectId = null
) : IRequest<Result<Guid>>;

public class CreateScenarioCommandValidator : AbstractValidator<CreateScenarioCommand>
{
    public CreateScenarioCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.ContentFormat).Must(f => f is "yaml" or "json")
            .WithMessage("İçerik formatı 'yaml' veya 'json' olmalıdır.");
    }
}

public class CreateScenarioCommandHandler : IRequestHandler<CreateScenarioCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateScenarioCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<Guid>> Handle(CreateScenarioCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        // Resolve project: use provided ID or fall back to org's first project
        Project? project;
        if (request.ProjectId.HasValue)
        {
            project = await _context.Projects
                .FirstOrDefaultAsync(p => p.Id == request.ProjectId.Value
                    && p.OrganizationId == orgId && !p.IsDeleted, cancellationToken);
            if (project is null)
                return Result<Guid>.Failure("Proje bulunamadı.");
        }
        else
        {
            project = await _context.Projects
                .FirstOrDefaultAsync(p => p.OrganizationId == orgId && !p.IsDeleted, cancellationToken);
            if (project is null)
                return Result<Guid>.Failure("Organizasyona ait proje bulunamadı.");
        }

        var checksum = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Content))).ToLower();

        var scenario = new Scenario
        {
            OrganizationId = orgId,
            WorkspaceId = project.WorkspaceId,
            ProjectId = project.Id,
            Name = request.Name,
            Description = request.Description
        };

        var version = new ScenarioVersion
        {
            ScenarioId = scenario.Id,
            OrganizationId = orgId,
            VersionNo = 1,
            Content = request.Content,
            ContentFormat = request.ContentFormat,
            Checksum = checksum,
            ChangeNote = request.ChangeNote,
            CreatedBy = _currentUser.UserId!.Value
        };

        scenario.CurrentVersionId = version.Id;

        _context.Scenarios.Add(scenario);
        _context.ScenarioVersions.Add(version);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(scenario.Id);
    }
}
