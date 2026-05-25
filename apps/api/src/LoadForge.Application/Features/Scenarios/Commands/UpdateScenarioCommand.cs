using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace LoadForge.Application.Features.Scenarios.Commands;

public record UpdateScenarioCommand(
    Guid Id,
    string Name,
    string? Description,
    string Content,
    string ContentFormat = "yaml",
    string? ChangeNote = null
) : IRequest<Result<bool>>;

public class UpdateScenarioCommandValidator : AbstractValidator<UpdateScenarioCommand>
{
    public UpdateScenarioCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.ContentFormat).Must(f => f is "yaml" or "json")
            .WithMessage("İçerik formatı 'yaml' veya 'json' olmalıdır.");
    }
}

public class UpdateScenarioCommandHandler : IRequestHandler<UpdateScenarioCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateScenarioCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(UpdateScenarioCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var scenario = await _context.Scenarios
            .Include(s => s.Versions)
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.OrganizationId == orgId && !s.IsDeleted, cancellationToken);

        if (scenario is null)
            return Result<bool>.Failure("Senaryo bulunamadı.");

        scenario.Name = request.Name;
        scenario.Description = request.Description;
        scenario.UpdatedAt = DateTime.UtcNow;

        var latestVersion = scenario.Versions.OrderByDescending(v => v.VersionNo).FirstOrDefault();
        var newVersionNo = (latestVersion?.VersionNo ?? 0) + 1;
        var checksum = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Content))).ToLower();

        // Only add a new version if content changed
        if (latestVersion is null || latestVersion.Checksum != checksum)
        {
            var newVersion = new ScenarioVersion
            {
                ScenarioId = scenario.Id,
                OrganizationId = orgId,
                VersionNo = newVersionNo,
                Content = request.Content,
                ContentFormat = request.ContentFormat,
                Checksum = checksum,
                ChangeNote = request.ChangeNote,
                CreatedBy = _currentUser.UserId!.Value,
            };

            _context.ScenarioVersions.Add(newVersion);
            scenario.CurrentVersionId = newVersion.Id;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }
}
