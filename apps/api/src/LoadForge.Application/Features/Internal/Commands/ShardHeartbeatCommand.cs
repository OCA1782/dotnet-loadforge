using LoadForge.Application.Common.Interfaces;
using LoadForge.Application.Common.Models;
using LoadForge.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Application.Features.Internal.Commands;

public record ShardHeartbeatCommand(Guid ShardId) : IRequest<Result>;

public class ShardHeartbeatCommandHandler : IRequestHandler<ShardHeartbeatCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ShardHeartbeatCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ShardHeartbeatCommand request, CancellationToken cancellationToken)
    {
        var shard = await _context.TestRunShards
            .FirstOrDefaultAsync(s => s.Id == request.ShardId, cancellationToken);

        if (shard is null)
            return Result.Failure("Shard bulunamadı.");

        shard.LastHeartbeatAt = DateTime.UtcNow;

        if (shard.Status == ShardStatus.Pending || shard.Status == ShardStatus.Assigned)
        {
            shard.Status = ShardStatus.Running;
            shard.StartedAt ??= DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
