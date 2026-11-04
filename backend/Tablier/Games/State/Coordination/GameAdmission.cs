using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier.Games.State.Coordination;

public sealed partial class GameAdmission(
    ApplicationDbContext db,
    GameMutationRegistry registry,
    ILogger<GameAdmission> logger
)
{
    public async Task<GameMutationLease?> EnterMember(Guid gameId, string memberId, CancellationToken ct = default)
    {
        if (!await IsMember(gameId, memberId, ct))
        {
            LogRefused(logger, gameId, memberId);
            return null;
        }
        var lease = await registry.Acquire(gameId, ct);
        var admitted = false;
        try
        {
            admitted = await IsMember(gameId, memberId, ct);
            if (admitted)
                return lease;
            LogRefused(logger, gameId, memberId);
            return null;
        }
        finally
        {
            if (!admitted)
                lease.Dispose();
        }
    }

    public Task<bool> IsMember(Guid gameId, string memberId, CancellationToken ct = default) =>
        db.GameMembers.AsNoTracking().AnyAsync(m => m.GameId == gameId && m.UserId == memberId, ct);

    [LoggerMessage(LogLevel.Warning, "Game {GameId} admission refused for member {UserId}: not_member")]
    private static partial void LogRefused(ILogger logger, Guid gameId, string userId);
}
