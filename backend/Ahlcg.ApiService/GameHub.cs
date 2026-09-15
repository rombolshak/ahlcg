using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService;

public readonly record struct GameConnection(Guid GameId, string UserId, string ConnectionId);

public interface IGameClient
{
    Task Ping(DateTime timestamp);

    Task MemberConnected(string userId);

    Task MemberDisconnected(string userId);
}

[Authorize]
public class GameHub(GameSessions sessions, ApplicationDbContext db, TimeProvider timeProvider) : Hub<IGameClient>
{
    public async Task Ping() => await Clients.Caller.Ping(DateTime.UtcNow);

    public override async Task OnConnectedAsync()
    {
        var gameId = ParseGameId(Context.GetHttpContext())
            ?? throw new HubException("A gameId query parameter is required.");
        var userId = Context.UserIdentifier ?? throw new HubException("The connection has no user id.");

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        await Connect(sessions, db, timeProvider, Clients, Groups, connection);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var gameId = ParseGameId(Context.GetHttpContext())
            ?? throw new HubException("A gameId query parameter is required.");
        var userId = Context.UserIdentifier ?? throw new HubException("The connection has no user id.");

        var connection = new GameConnection(gameId, userId, Context.ConnectionId);
        await Disconnect(sessions, db, timeProvider, Clients, connection);
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
        GameConnection connection)
    {
        var (gameId, userId, connectionId) = connection;

        var isMember = await db.GameMembers.AnyAsync(m => m.GameId == gameId && m.UserId == userId);
        if (!isMember) throw new HubException("You are not a member of this game.");

        var change = sessions.Join(gameId, userId, connectionId, timeProvider.GetUtcNow());
        await groups.AddToGroupAsync(connectionId, gameId.ToString());

        if (change.MemberPresenceChanged)
            await clients.Group(gameId.ToString()).MemberConnected(userId);
    }

    public static async Task Disconnect(
        GameSessions sessions,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        IHubCallerClients<IGameClient> clients,
        GameConnection connection)
    {
        var (gameId, userId, connectionId) = connection;

        var now = timeProvider.GetUtcNow();
        var change = sessions.Leave(gameId, userId, connectionId, now);

        var member = await db.GameMembers.FirstOrDefaultAsync(m => m.GameId == gameId && m.UserId == userId);
        if (member is not null)
        {
            member.LastPlayedAt = now;
            await db.SaveChangesAsync();
        }

        if (change.MemberPresenceChanged)
            await clients.Group(gameId.ToString()).MemberDisconnected(userId);
    }
}
