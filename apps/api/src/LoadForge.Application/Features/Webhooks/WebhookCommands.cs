using FluentValidation;
using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Webhooks;

// ── DTOs ─────────────────────────────────────────────────────────────────────

public record WebhookDto(Guid Id, string Name, string Url, string[] Events, bool IsActive, DateTime CreatedAt);

// ── List ─────────────────────────────────────────────────────────────────────

public record ListWebhooksQuery : IRequest<Result<List<WebhookDto>>>;

public class ListWebhooksQueryHandler : IRequestHandler<ListWebhooksQuery, Result<List<WebhookDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListWebhooksQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<WebhookDto>>> Handle(ListWebhooksQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var webhooks = await _context.Webhooks
            .Where(w => w.OrganizationId == orgId && !w.IsDeleted)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = webhooks.Select(w => new WebhookDto(
            w.Id, w.Name, w.Url,
            w.Events.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries),
            w.IsActive, w.CreatedAt
        )).ToList();

        return Result<List<WebhookDto>>.Success(dtos);
    }
}

// ── Create ────────────────────────────────────────────────────────────────────

public record CreateWebhookCommand(string Name, string Url, string[] Events) : IRequest<Result<WebhookDto>>;

public class CreateWebhookCommandValidator : AbstractValidator<CreateWebhookCommand>
{
    private static readonly string[] AllowedEvents = ["run.completed", "run.failed", "run.quality_gate_failed"];

    public CreateWebhookCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Url).NotEmpty()
            .Must(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) && (uri.Scheme == "http" || uri.Scheme == "https"))
            .WithMessage("Geçerli bir HTTP/HTTPS URL giriniz.");
        RuleFor(x => x.Events).NotEmpty()
            .Must(evts => evts.All(e => AllowedEvents.Contains(e)))
            .WithMessage("Geçersiz olay tipi. İzin verilenler: run.completed, run.failed, run.quality_gate_failed");
    }
}

public class CreateWebhookCommandHandler : IRequestHandler<CreateWebhookCommand, Result<WebhookDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateWebhookCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<WebhookDto>> Handle(CreateWebhookCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var webhook = new Webhook
        {
            OrganizationId = orgId,
            Name = request.Name,
            Url = request.Url,
            Events = string.Join(",", request.Events),
            IsActive = true,
        };

        _context.Webhooks.Add(webhook);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<WebhookDto>.Success(new WebhookDto(
            webhook.Id, webhook.Name, webhook.Url,
            request.Events, webhook.IsActive, webhook.CreatedAt));
    }
}

// ── Toggle Active ─────────────────────────────────────────────────────────────

public record ToggleWebhookCommand(Guid Id) : IRequest<Result<bool>>;

public class ToggleWebhookCommandHandler : IRequestHandler<ToggleWebhookCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ToggleWebhookCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(ToggleWebhookCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;
        var webhook = await _context.Webhooks
            .FirstOrDefaultAsync(w => w.Id == request.Id && w.OrganizationId == orgId && !w.IsDeleted, cancellationToken);

        if (webhook is null)
            return Result<bool>.Failure("Webhook bulunamadı.");

        webhook.IsActive = !webhook.IsActive;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(webhook.IsActive);
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeleteWebhookCommand(Guid Id) : IRequest<Result>;

public class DeleteWebhookCommandHandler : IRequestHandler<DeleteWebhookCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteWebhookCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(DeleteWebhookCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;
        var webhook = await _context.Webhooks
            .FirstOrDefaultAsync(w => w.Id == request.Id && w.OrganizationId == orgId && !w.IsDeleted, cancellationToken);

        if (webhook is null)
            return Result.Failure("Webhook bulunamadı.");

        webhook.IsDeleted = true;
        webhook.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// ── Test ──────────────────────────────────────────────────────────────────────

public record TestWebhookCommand(Guid Id) : IRequest<Result<string>>;

public class TestWebhookCommandHandler : IRequestHandler<TestWebhookCommand, Result<string>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IWebhookService _webhookService;

    public TestWebhookCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IWebhookService webhookService)
    {
        _context = context;
        _currentUser = currentUser;
        _webhookService = webhookService;
    }

    public async Task<Result<string>> Handle(TestWebhookCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;
        var webhook = await _context.Webhooks
            .FirstOrDefaultAsync(w => w.Id == request.Id && w.OrganizationId == orgId && !w.IsDeleted, cancellationToken);

        if (webhook is null)
            return Result<string>.Failure("Webhook bulunamadı.");

        var response = await _webhookService.TestAsync(webhook, cancellationToken);
        return Result<string>.Success(response);
    }
}
