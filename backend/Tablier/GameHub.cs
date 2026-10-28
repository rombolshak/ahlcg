using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier;

#pragma warning disable MA0048
public readonly record struct GameConnection(Guid GameId, string UserId, string ConnectionId);
#pragma warning restore MA0048

[Authorize]
public partial class GameHub(
    GameSessions sessions,
    ApplicationDbContext db,
    TimeProvider timeProvider,
    IGameEngine engine,
    ILogger<GameHub> logger
) : Hub<IGameClient>
{
    private const string MissingGameIdMessage = "A gameId query parameter is required.";
    private const string MissingUserIdMessage = "The connection has no user id.";

    public Task<DateTime> Ping() => Task.FromResult(timeProvider.GetUtcNow().UtcDateTime);

    public Task<MemberState?> GetState()
    {
        var (gameId, userId) = GetCaller();

        return engine.GetMemberState(gameId, userId, Context.ConnectionAborted);
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
        await Connect(sessions, db, timeProvider, Clients, Groups, connection, logger);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (gameId, userId) = GetCaller();

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        if (exception is not null)
            LogConnectionLost(logger, gameId, userId, Context.ConnectionId, exception);
        await Disconnect(sessions, db, timeProvider, Clients, connection, logger);
        await base.OnDisconnectedAsync(exception);
    }

    private (Guid GameId, string UserId) GetCaller()
    {
        var gameId = ParseGameId(Context.GetHttpContext()) ?? throw new HubException(MissingGameIdMessage);
        var userId = Context.UserIdentifier ?? throw new HubException(MissingUserIdMessage);
        return (gameId, userId);
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
        ILogger logger
    )
    {
        var (gameId, userId, connectionId) = connection;

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

        var change = sessions.Join(gameId, userId, connectionId, timeProvider.GetUtcNow());
        await groups.AddToGroupAsync(connectionId, gameId.ToString());
        await groups.AddToGroupAsync(connectionId, GetMemberGroupName(gameId, userId));
        LogConnected(logger, gameId, userId, connectionId);
        var session = sessions.SyncInviteCode(gameId, game.MemberCount, game.IntendedPlayersCount);
        await SendInviteCode(clients, gameId, session);

        if (change.MemberPresenceChanged)
            await clients.Group(gameId.ToString()).MemberConnected(userId);
    }

    public static async Task SendInviteCode(IHubClients<IGameClient> clients, Guid gameId, GameSession? session)
    {
        if (session is not null)
            await clients.Group(gameId.ToString()).InviteCodeChanged(session.InviteCode);
    }

    public static async Task Disconnect(
        GameSessions sessions,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        IHubCallerClients<IGameClient> clients,
        GameConnection connection,
        ILogger logger
    )
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
