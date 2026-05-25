using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.RunNotes;

// ── DTOs ────────────────────────────────────────────────────────────────────

public record RunNoteDto(Guid Id, string Content, Guid AuthorId, string AuthorName, DateTime CreatedAt);

// ── Add Note ─────────────────────────────────────────────────────────────────

public record AddRunNoteCommand(Guid RunId, string Content) : IRequest<Result<RunNoteDto>>;

public class AddRunNoteCommandHandler : IRequestHandler<AddRunNoteCommand, Result<RunNoteDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AddRunNoteCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<RunNoteDto>> Handle(AddRunNoteCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content) || request.Content.Length > 2000)
            return Result<RunNoteDto>.Failure("Not 1-2000 karakter arasında olmalıdır.");

        var orgId = _currentUser.OrganizationId!.Value;
        var userId = _currentUser.UserId!.Value;

        var run = await _context.TestRuns
            .AnyAsync(r => r.Id == request.RunId && r.OrganizationId == orgId && !r.IsDeleted, cancellationToken);

        if (!run) return Result<RunNoteDto>.Failure("Koşum bulunamadı.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        var note = new RunNote
        {
            TestRunId = request.RunId,
            OrganizationId = orgId,
            AuthorId = userId,
            Content = request.Content.Trim(),
        };

        _context.RunNotes.Add(note);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new RunNoteDto(note.Id, note.Content, userId, user?.DisplayName ?? "—", note.CreatedAt);
        return Result<RunNoteDto>.Success(dto);
    }
}

// ── List Notes ───────────────────────────────────────────────────────────────

public record ListRunNotesQuery(Guid RunId) : IRequest<Result<List<RunNoteDto>>>;

public class ListRunNotesQueryHandler : IRequestHandler<ListRunNotesQuery, Result<List<RunNoteDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ListRunNotesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<RunNoteDto>>> Handle(ListRunNotesQuery request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;

        var notes = await _context.RunNotes
            .Where(n => n.TestRunId == request.RunId && n.OrganizationId == orgId && !n.IsDeleted)
            .OrderBy(n => n.CreatedAt)
            .Join(_context.Users, n => n.AuthorId, u => u.Id,
                (n, u) => new RunNoteDto(n.Id, n.Content, n.AuthorId, u.DisplayName, n.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result<List<RunNoteDto>>.Success(notes);
    }
}

// ── Delete Note ───────────────────────────────────────────────────────────────

public record DeleteRunNoteCommand(Guid NoteId) : IRequest<Result>;

public class DeleteRunNoteCommandHandler : IRequestHandler<DeleteRunNoteCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteRunNoteCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(DeleteRunNoteCommand request, CancellationToken cancellationToken)
    {
        var orgId = _currentUser.OrganizationId!.Value;
        var userId = _currentUser.UserId!.Value;

        var note = await _context.RunNotes
            .FirstOrDefaultAsync(n => n.Id == request.NoteId && n.OrganizationId == orgId && !n.IsDeleted, cancellationToken);

        if (note is null) return Result.Failure("Not bulunamadı.");
        if (note.AuthorId != userId) return Result.Failure("Yalnızca kendi notunuzu silebilirsiniz.");

        note.IsDeleted = true;
        note.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
