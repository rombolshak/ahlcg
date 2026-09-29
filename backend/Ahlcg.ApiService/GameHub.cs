using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService;

public readonly record struct GameConnection(Guid GameId, string UserId, string ConnectionId);

public enum ExitReason
{
    NotAMember
}

public interface IGameClient
{
    Task MemberConnected(string userId);

    Task MemberDisconnected(string userId);

    Task Exit(ExitReason reason);
}

[Authorize]
public partial class GameHub(
    GameSessions sessions, ApplicationDbContext db, TimeProvider timeProvider, ILogger<GameHub> logger)
    : Hub<IGameClient>
{
    public Task<DateTime> Ping() => Task.FromResult(timeProvider.GetUtcNow().UtcDateTime);

    public override async Task OnConnectedAsync()
    {
        var gameId = ParseGameId(Context.GetHttpContext())
            ?? throw new HubException("A gameId query parameter is required.");
        var userId = Context.UserIdentifier ?? throw new HubException("The connection has no user id.");

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        await Connect(sessions, db, timeProvider, Clients, Groups, connection, logger);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var gameId = ParseGameId(Context.GetHttpContext())
            ?? throw new HubException("A gameId query parameter is required.");
        var userId = Context.UserIdentifier ?? throw new HubException("The connection has no user id.");

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        if (exception is not null) LogConnectionLost(logger, gameId, userId, Context.ConnectionId, exception);
        await Disconnect(sessions, db, timeProvider, Clients, connection, logger);
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
        ILogger logger)
    {
        var (gameId, userId, connectionId) = connection;

        var game = await db.Games
            .Where(g => g.Id == gameId && g.Members.Any(m => m.UserId == userId))
            .Select(g => new { g.IntendedPlayersCount, MemberCount = g.Members.Count })
            .SingleOrDefaultAsync();
        if (game is null)
        {
            LogNotAMember(logger, gameId, userId, connectionId);
            await clients.Caller.Exit(ExitReason.NotAMember);
            return;
        }

        var change = sessions.Join(gameId, userId, connectionId, timeProvider.GetUtcNow());
        await groups.AddToGroupAsync(connectionId, gameId.ToString());
        LogConnected(logger, gameId, userId, connectionId);
        sessions.SyncInviteCode(gameId, game.MemberCount, game.IntendedPlayersCount);

        if (change.MemberPresenceChanged)
            await clients.Group(gameId.ToString()).MemberConnected(userId);
    }

    public static async Task Disconnect(
        GameSessions sessions,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        IHubCallerClients<IGameClient> clients,
        GameConnection connection,
        ILogger logger)
    {
        var (gameId, userId, connectionId) = connection;

        var now = timeProvider.GetUtcNow();
        var change = sessions.Leave(gameId, userId, connectionId, now);
        LogDisconnected(logger, gameId, userId, connectionId);

        var member = await db.GameMembers.FirstOrDefaultAsync(m => m.GameId == gameId && m.UserId == userId);
        if (member is not null)
        {
            member.LastPlayedAt = now;
            await db.SaveChangesAsync();
        }

        if (change.MemberPresenceChanged)
            await clients.Group(gameId.ToString()).MemberDisconnected(userId);
    }

    [LoggerMessage(LogLevel.Warning,
        "User {UserId} is not a member of game {GameId}; asked connection {ConnectionId} to exit")]
    private static partial void LogNotAMember(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "User {UserId} connected to game {GameId} on {ConnectionId}")]
    private static partial void LogConnected(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "User {UserId} disconnected from game {GameId} on {ConnectionId}")]
    private static partial void LogDisconnected(ILogger logger, Guid gameId, string userId, string connectionId);

    [LoggerMessage(LogLevel.Information, "Connection {ConnectionId} of user {UserId} to game {GameId} was lost")]
    private static partial void LogConnectionLost(
        ILogger logger, Guid gameId, string userId, string connectionId, Exception exception);
}
