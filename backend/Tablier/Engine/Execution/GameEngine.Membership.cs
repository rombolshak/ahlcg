using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Games;

namespace Tablier.Engine.Execution;

internal sealed partial class GameEngine<TConfiguration, TState, TView>
{
    public async Task<CreateGameResult> Create(
        string owner,
        string idempotencyKey,
        JsonElement configuration,
        CancellationToken ct = default
    )
    {
        var missing = configuration.ValueKind == JsonValueKind.Undefined;
        if (missing || TryRead(configuration) is null)
        {
            LogConfigurationRefusedUnreadable(logger);
            return new CreateGameResult.InvalidConfiguration(IsMissing: missing);
        }

        var now = timeProvider.GetUtcNow();
        var game = new Game
        {
            OwnerId = owner,
            IdempotencyKey = idempotencyKey,
            Configuration = JsonDocument.Parse(configuration.GetRawText()),
            CreatedAt = now,
            LastPlayedAt = now,
        };
        var member = new GameMember
        {
            UserId = owner,
            JoinedAt = now,
            LastPlayedAt = now,
        };
        game.Members.Add(member);
        game = await SaveOrFindReplayed(game, member, ct);
        await RunMutation(
            game.Id,
            async () =>
            {
                try
                {
                    await Begin(game.Id, game.Configuration.RootElement, owner, ct);
                }
                catch (GameHistoryConflictException error) when (error.GameId == game.Id)
                {
                    LogHistoryAlreadyAdvanced(logger, game.Id, error.Version);
                }
                return true;
            },
            ct
        );
        return new CreateGameResult.Created(game);
    }

    public async Task<JoinGameResult> Join(string member, string code, CancellationToken ct = default)
    {
        var normalizedCode = code?.ToUpperInvariant();
        var gameId = string.IsNullOrEmpty(normalizedCode) ? null : sessions.FindByInviteCode(normalizedCode);
        if (gameId is null)
        {
            LogJoinRefusedUnknownCode(logger, member);
            return new JoinGameResult.UnusableInvite();
        }

        return await RunMutation(gameId.Value, () => JoinCore(gameId.Value, normalizedCode!, member, ct), ct);
    }

    private async Task<JoinGameResult> JoinCore(Guid gameId, string code, string member, CancellationToken ct = default)
    {
        var outcome = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(() => CommitJoin(gameId, code, member, ct));
        LogJoinOutcome(gameId, member, outcome);

        if (outcome.Result is JoinGameResult.Joined joined)
        {
            var game = joined.Membership.Game!;
            var session = sessions.SyncInviteCode(game.Id, game.Members.Count, game.IntendedPlayersCount);
            await GameHub.SendInviteCode(hub.Clients, game.Id, session);
            if (outcome.Committed is not null)
            {
                await SendStateChanged(game.Id, outcome.Previous!, outcome.Committed);
                await AdvanceNonPlayerSteps(game.Id, outcome.Committed, ct);
            }
        }
        return outcome.Result;
    }

    private void LogJoinOutcome(Guid gameId, string member, JoinOutcome outcome)
    {
        switch (outcome.Decision)
        {
            case JoinDecision.UnknownInvite:
                LogJoinRefusedUnknownCode(logger, member);
                break;
            case JoinDecision.MissingGame:
                LogJoinRefusedGameMissing(logger, gameId, member);
                break;
            case JoinDecision.AlreadyMember:
                LogJoinedAlreadyMember(logger, gameId, member);
                break;
            case JoinDecision.FullGame:
                LogJoinRefusedGameFull(logger, gameId, member, outcome.IntendedPlayersCount);
                break;
            case JoinDecision.Joined:
                LogMemberJoined(logger, gameId, member);
                break;
        }
    }

    private enum JoinDecision
    {
        UnknownInvite,
        MissingGame,
        AlreadyMember,
        FullGame,
        Joined,
    }

    private sealed record JoinOutcome(
        JoinGameResult Result,
        JoinDecision Decision,
        StoredState<TState>? Previous = null,
        StoredState<TState>? Committed = null,
        int IntendedPlayersCount = 0
    );

    private async Task<JoinOutcome> CommitJoin(Guid gameId, string code, string member, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (sessions.FindByInviteCode(code) != gameId)
        {
            return new JoinOutcome(new JoinGameResult.UnusableInvite(), JoinDecision.UnknownInvite);
        }
        var game = await db.Games.Include(g => g.Members).SingleOrDefaultAsync(g => g.Id == gameId, ct);
        if (game is null)
        {
            return new JoinOutcome(new JoinGameResult.UnusableInvite(), JoinDecision.MissingGame);
        }
        var existing = game.Members.SingleOrDefault(m => m.UserId == member);
        if (existing is not null)
        {
            return new JoinOutcome(new JoinGameResult.Joined(existing), JoinDecision.AlreadyMember);
        }
        if (game.Members.Count >= game.IntendedPlayersCount)
        {
            return new JoinOutcome(
                new JoinGameResult.GameFull(),
                JoinDecision.FullGame,
                IntendedPlayersCount: game.IntendedPlayersCount
            );
        }
        try
        {
            var outcome = await AppendJoinedMember(game, member, ct);
            await transaction.CommitAsync(ct);
            return outcome;
        }
        catch
        {
            foreach (var membership in game.Members.ToList())
                db.Entry(membership).State = EntityState.Detached;
            db.Entry(game).State = EntityState.Detached;
            throw;
        }
    }

    private async Task<JoinOutcome> AppendJoinedMember(Game game, string member, CancellationToken ct = default)
    {
        var stored = await LoadRequiredHistory(game.Id, ct);
        var now = timeProvider.GetUtcNow();
        var membership = new GameMember
        {
            Game = game,
            GameId = game.Id,
            UserId = member,
            JoinedAt = now,
            LastPlayedAt = now,
        };
        game.Members.Add(membership);
        var step = rules.Processor.AddMember(stored.State, member) with { IsIrreversible = true };
        var committed = await history.Append(game.Id, stored, step, choice: null, ct);
        if (committed is null)
            throw new InvalidOperationException("Joining requires the current history head.");
        return new JoinOutcome(new JoinGameResult.Joined(membership), JoinDecision.Joined, stored, committed);
    }

    private async Task<Game> SaveOrFindReplayed(Game game, GameMember member, CancellationToken ct = default)
    {
        db.Games.Add(game);
        try
        {
            await db.SaveChangesAsync(ct);
            LogGameCreated(logger, game.Id, game.OwnerId);
            return game;
        }
        catch (DbUpdateException)
        {
            db.Entry(member).State = EntityState.Detached;
            db.Entry(game).State = EntityState.Detached;
            var existing = await db.Games.FirstOrDefaultAsync(
                g => g.OwnerId == game.OwnerId && g.IdempotencyKey == game.IdempotencyKey,
                ct
            );
            if (existing is null)
                throw;
            LogGameCreationReplayed(logger, existing.Id, game.OwnerId);
            return existing;
        }
    }

    [LoggerMessage(LogLevel.Debug, "Creation replay for game {GameId} preserved history at version {Version}")]
    private static partial void LogHistoryAlreadyAdvanced(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "User {UserId} created game {GameId}")]
    private static partial void LogGameCreated(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Debug, "User {UserId} repeated an idempotency key; returned existing game {GameId}")]
    private static partial void LogGameCreationReplayed(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Information, "User {UserId} could not join: invite code matches no live session")]
    private static partial void LogJoinRefusedUnknownCode(ILogger logger, string userId);

    [LoggerMessage(
        LogLevel.Warning,
        "User {UserId} could not join game {GameId}: the session is live but the game is gone"
    )]
    private static partial void LogJoinRefusedGameMissing(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(
        LogLevel.Information,
        "User {UserId} could not join game {GameId}: all {IntendedPlayersCount} seats are taken"
    )]
    private static partial void LogJoinRefusedGameFull(
        ILogger logger,
        Guid gameId,
        string userId,
        int intendedPlayersCount
    );

    [LoggerMessage(LogLevel.Debug, "User {UserId} redeemed a code for game {GameId} they already belong to")]
    private static partial void LogJoinedAlreadyMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Information, "User {UserId} joined game {GameId}")]
    private static partial void LogMemberJoined(ILogger logger, Guid gameId, string userId);
}
