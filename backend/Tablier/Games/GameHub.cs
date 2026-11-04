using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Games.Sessions;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Tablier.Games;

#pragma warning disable MA0048
public readonly record struct GameConnection(Guid GameId, string UserId, string ConnectionId);
#pragma warning restore MA0048

[Authorize]
public partial class GameHub(
    GameSessions sessions,
    ApplicationDbContext db,
    TimeProvider timeProvider,
    IGameEngine engine,
    GameAdmission admission,
    GameMutationRegistry registry,
    TablierMetrics metrics,
    ILogger<GameHub> logger
) : Hub<IGameClient>
{
    private const string MissingGameIdMessage = "A gameId query parameter is required.";
    private const string MissingUserIdMessage = "The connection has no user id.";

    public Task<DateTime> Ping() => Task.FromResult(timeProvider.GetUtcNow().UtcDateTime);

    public async Task<MemberState?> GetState(string trigger = "initial")
    {
        var (gameId, userId) = GetCaller();

        var started = timeProvider.GetTimestamp();
        var outcome = "error";
        try
        {
            var state = await engine.GetMemberState(gameId, userId, Context.ConnectionAborted);
            outcome = state is null ? "refused" : "ok";
            return state;
        }
        finally
        {
            var boundedTrigger = trigger is "initial" or "reconnect" or "version_gap" or "generation_change"
                ? trigger
                : "initial";
            metrics.SynchronizationDuration.Record(
                timeProvider.GetElapsedTime(started).TotalSeconds,
                new KeyValuePair<string, object?>("trigger", boundedTrigger),
                new KeyValuePair<string, object?>("outcome", outcome)
            );
        }
    }

    public Task<int?> Execute(string action)
    {
        var (gameId, userId) = GetCaller();

        return engine.Execute(gameId, userId, action, Context.ConnectionAborted);
    }

    public static string GetMemberGroupName(Guid gameId, string userId) => $"{gameId}:{userId}";

    public override async Task OnConnectedAsync()
    {
        var (gameId, userId) = GetCaller();

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        await Connect(sessions, db, timeProvider, Clients, Groups, connection, admission, engine, logger);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (gameId, userId) = GetCaller();

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        if (exception is not null)
            LogConnectionLost(logger, gameId, userId, Context.ConnectionId, exception);
        await Disconnect(sessions, db, timeProvider, Clients, connection, registry, engine, logger);
        await base.OnDisconnectedAsync(exception);
    }

    public static Guid? ParseGameId(HttpContext? httpContext)
    {
        var value = httpContext?.Request.Query["gameId"].ToString();
        return Guid.TryParse(value, out var gameId) ? gameId : null;
    }

    public static async Task Connect(
        GameSessions sessions,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        IHubCallerClients<IGameClient> clients,
        IGroupManager groups,
        GameConnection connection,
        GameAdmission admission,
        IGameEngine engine,
        ILogger logger
    )
    {
        var (gameId, userId, connectionId) = connection;

        using var lease = await admission.EnterMember(gameId, userId);
        if (lease is null)
        {
            LogNotAMember(logger, gameId, userId, connectionId);
            await clients.Caller.Exit(ExitReason.NotAMember);
            return;
        }
        var game = await db
            .Games.Where(g => g.Id == gameId && g.Members.Any(m => m.UserId == userId))
            .Select(g => new { g.IntendedPlayersCount, MemberCount = g.Members.Count })
            .SingleOrDefaultAsync();
        if (game is null)
        {
            LogNotAMember(logger, gameId, userId, connectionId);
            await clients.Caller.Exit(ExitReason.NotAMember);
            return;
        }

        await groups.AddToGroupAsync(connectionId, gameId.ToString());
        await groups.AddToGroupAsync(connectionId, GetMemberGroupName(gameId, userId));
        sessions.Join(gameId, userId, connectionId, timeProvider.GetUtcNow());
        LogConnected(logger, gameId, userId, connectionId);
        sessions.SyncInviteCode(gameId, game.MemberCount, game.IntendedPlayersCount);
        await engine.SyncMembers(lease);
    }

    public static async Task Disconnect(
        GameSessions sessions,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        IHubCallerClients<IGameClient> clients,
        GameConnection connection,
        GameMutationRegistry registry,
        IGameEngine engine,
        ILogger logger
    )
    {
        var (gameId, userId, connectionId) = connection;

        if (sessions.Find(gameId) is null)
        {
            LogDisconnectSkipped(logger, gameId, userId, connectionId);
            return;
        }
        using var lease = await registry.Acquire(gameId);
        var now = timeProvider.GetUtcNow();
        sessions.Leave(gameId, userId, connectionId, now);
        LogDisconnected(logger, gameId, userId, connectionId);

        var member = await db.GameMembers.FirstOrDefaultAsync(m => m.GameId == gameId && m.UserId == userId);
        if (member is not null)
        {
            member.LastPlayedAt = now;
            await db.SaveChangesAsync();
        }

        await engine.SyncMembers(lease);
    }

    private (Guid GameId, string UserId) GetCaller()
    {
        var gameId = ParseGameId(Context.GetHttpContext()) ?? throw new HubException(MissingGameIdMessage);
        var userId = Context.UserIdentifier ?? throw new HubException(MissingUserIdMessage);
        return (gameId, userId);
    }

    [LoggerMessage(
        LogLevel.Debug,
        "Connection {ConnectionId} for member {UserId} of game {GameId} needs no disconnect work: no_session"
    )]
    private static partial void LogDisconnectSkipped(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(
        LogLevel.Warning,
        "User {UserId} is not a member of game {GameId}; asked connection {ConnectionId} to exit"
    )]
    private static partial void LogNotAMember(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "User {UserId} connected to game {GameId} on {ConnectionId}")]
    private static partial void LogConnected(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "User {UserId} disconnected from game {GameId} on {ConnectionId}")]
    private static partial void LogDisconnected(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "Connection {ConnectionId} of user {UserId} to game {GameId} was lost")]
    private static partial void LogConnectionLost(
        ILogger logger,
        Guid gameId,
        string userId,
        string connectionId,
        Exception exception
    );
}
