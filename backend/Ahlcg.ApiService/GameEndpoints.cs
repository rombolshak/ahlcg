using System.Security.Claims;
using System.Text.Json;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService;

public class Game
{
    public Guid Id { get; set; }
    public required string OwnerId { get; set; }
    public AppUser? Owner { get; set; }
    public required string IdempotencyKey { get; set; }
    public required JsonDocument Configuration { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int IntendedPlayersCount { get; set; } = 1;
    public ICollection<GameMember> Members { get; } = [];
}

public class GameMember
{
    public Guid GameId { get; set; }
    public Game? Game { get; set; }
    public required string UserId { get; set; }
    public AppUser? User { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; }
}

public static class GameEndpoints
{
    [PublicAPI]
    public record CreateGameRequest(JsonElement Configuration);

    [PublicAPI]
    public record GameDto(
        Guid Id, DateTimeOffset CreatedAt, DateTimeOffset LastPlayedAt, DateTimeOffset? CompletedAt, JsonElement Configuration);

    [PublicAPI]
    public record MemberDto(string UserId, DateTimeOffset JoinedAt, bool Online);

    [PublicAPI]
    public record SetMembersCountRequest(int Count);

    public static RouteGroupBuilder MapGameEndpoints(this RouteGroupBuilder group)
    {
        group.WithDescription("Game creation and lifecycle.");

        group.MapPost("", CreateGame)
            .RequireAuthorization()
            .WithDescription(
                "Creates a new game owned by the calling user. " +
                "The configuration payload is opaque: it is stored in a jsonb column and handed back unchanged, and " +
                "only its presence is checked — omitting it is the one thing that yields a 400. " +
                "createdAt and lastPlayedAt are equal on creation. " +
                "Requires an Idempotency-Key header; repeating the same key for the same user " +
                "returns the game created the first time instead of creating a new one, while the same key from a " +
                "different user creates a separate game. A unique index on (OwnerId, IdempotencyKey) enforces this, " +
                "not a check-then-insert.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("recent", GetRecentGames)
            .RequireAuthorization()
            .WithDescription(
                "Lists the games the calling user is a member of: every game still in progress, most recently " +
                "played first, followed by the 2 most recently completed. " +
                "Membership is a GameMember row, never Game.OwnerId: a game the caller created but is not a member " +
                "of is absent, and a game the caller joined but did not create is present. " +
                "lastPlayedAt is the caller's own last play, not the game's, so two members of one game can see " +
                "different values for it; the active games are ordered by that lastPlayedAt, while the completed " +
                "games are ordered by Game.CompletedAt instead and always sort after every active game. " +
                "Each configuration payload is opaque and returned exactly as stored.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("archive", GetArchivedGames)
            .RequireAuthorization()
            .WithDescription(
                "Lists every completed game the calling user is a member of, ordered by Game.CompletedAt " +
                "descending — most recently completed first. " +
                "Membership is a GameMember row, never Game.OwnerId: a game the caller created but is not a member " +
                "of is absent, and a game the caller joined but did not create is present. " +
                "Each configuration payload is opaque and returned exactly as stored.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("latest", GetLatestGame)
            .RequireAuthorization()
            .WithDescription(
                "Returns the most recently played game that is not completed, for callers that need one game and " +
                "nothing else. Membership is a GameMember row, never Game.OwnerId, and lastPlayedAt is the " +
                "caller's own last play, not the game's. completedAt is null for a game that is not completed. " +
                "A caller who is a member of no active game gets 204, not 404: having nothing to resume is a " +
                "normal state, not a missing resource.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("{id}/members", GetMembers)
            .RequireAuthorization()
            .WithDescription(
                "Lists the game's members ordered by JoinedAt, each with its online state. " +
                "online is derived from the in-memory session registry: true when the member has a live " +
                "connection in this game's session, false otherwise — including every member of a game with no " +
                "session. Membership is the entire authorization check, never Game.OwnerId: any member may call " +
                "this for any game they belong to, and a caller with no row for the game gets 403, including for " +
                "a game that does not exist.")
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapDelete("{id}/members/{userId}", RemoveMember)
            .RequireAuthorization()
            .WithDescription(
                "Removes a member from the game — a hard delete, not a soft flag. Any member may remove any " +
                "other member, the game's creator included: Game.OwnerId confers no special standing. A caller " +
                "with no row for the game gets 403. An unknown target gets 404. Removing the game's only " +
                "remaining member is rejected with a validation problem rather than leaving the game with " +
                "nobody in it. Otherwise the row is deleted and IntendedPlayersCount is decremented to match, " +
                "and the session's invite code is rotated: cleared unconditionally, then reissued only if seats " +
                "remain open, so a member still holding the old code cannot use it to walk back in. A removed " +
                "member connected at the time is dropped from the game's SignalR group and sent Exit(NotAMember).")
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPut("{id}/membersCount", SetMembersCount)
            .RequireAuthorization()
            .WithDescription(
                "Sets Game.IntendedPlayersCount — a bare number (#198), not a seat or an investigator count. " +
                "Any member may call this, and a caller with no row for the game gets 403. Count below the " +
                "current member count is rejected with a validation problem keyed Count instead of being " +
                "clamped. Otherwise the session's invite code is synced: raising the count above the member " +
                "count issues one if none exists yet, and lowering it to match the member count clears one if " +
                "it does.")
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }

    public static async Task<Results<Ok<GameDto>, ValidationProblem, UnauthorizedHttpResult>> CreateGame(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db,
        TimeProvider timeProvider,
        [FromHeader(Name = "Idempotency-Key")] string idempotencyKey,
        CreateGameRequest request)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        if (request.Configuration.ValueKind == JsonValueKind.Undefined)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(CreateGameRequest.Configuration)] = ["Configuration is required."]
            });

        var now = timeProvider.GetUtcNow();
        var game = new Game
        {
            OwnerId = user.Id,
            IdempotencyKey = idempotencyKey,
            Configuration = JsonDocument.Parse(request.Configuration.GetRawText()),
            CreatedAt = now,
            LastPlayedAt = now
        };
        var member = new GameMember { UserId = user.Id, JoinedAt = now, LastPlayedAt = now };
        game.Members.Add(member);

        db.Games.Add(game);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            db.Entry(member).State = EntityState.Detached;
            db.Entry(game).State = EntityState.Detached;

            var existing =
                await db.Games.FirstOrDefaultAsync(g => g.OwnerId == user.Id && g.IdempotencyKey == idempotencyKey);
            if (existing is null) throw;

            game = existing;
        }

        return TypedResults.Ok(new GameDto(
            game.Id,
            game.CreatedAt,
            game.LastPlayedAt,
            game.CompletedAt,
            game.Configuration.RootElement.Clone()));
    }

    public static async Task<Results<Ok<IReadOnlyList<GameDto>>, UnauthorizedHttpResult>> GetRecentGames(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        var active = await db.GameMembers
            .AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt == null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.LastPlayedAt)
            .ToListAsync();

        var completed = await db.GameMembers
            .AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt != null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.Game!.CompletedAt)
            .Take(2)
            .ToListAsync();

        IReadOnlyList<GameDto> games = active.Concat(completed).Select(ToDto).ToList();

        return TypedResults.Ok(games);
    }

    public static async Task<Results<Ok<IReadOnlyList<GameDto>>, UnauthorizedHttpResult>> GetArchivedGames(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        var memberships = await db.GameMembers
            .AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt != null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.Game!.CompletedAt)
            .ToListAsync();

        IReadOnlyList<GameDto> games = memberships.Select(ToDto).ToList();

        return TypedResults.Ok(games);
    }

    public static async Task<Results<Ok<GameDto>, NoContent, UnauthorizedHttpResult>> GetLatestGame(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        var membership = await db.GameMembers
            .AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt == null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.LastPlayedAt)
            .FirstOrDefaultAsync();

        if (membership is null) return TypedResults.NoContent();

        return TypedResults.Ok(ToDto(membership));
    }

    public static async Task<Results<Ok<IReadOnlyList<MemberDto>>, ProblemHttpResult, UnauthorizedHttpResult>>
        GetMembers(
            ClaimsPrincipal principal,
            UserManager<AppUser> userManager,
            ApplicationDbContext db,
            GameSessions sessions,
            Guid id)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        var isMember = await db.GameMembers.AnyAsync(m => m.GameId == id && m.UserId == user.Id);
        if (!isMember) return TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden);

        var members = await db.GameMembers
            .AsNoTracking()
            .Where(m => m.GameId == id)
            .OrderBy(m => m.JoinedAt)
            .ToListAsync();

        var session = sessions.Find(id);
        IReadOnlyList<MemberDto> dtos = members
            .Select(m => new MemberDto(m.UserId, m.JoinedAt, session?.Connections.ContainsKey(m.UserId) ?? false))
            .ToList();

        return TypedResults.Ok(dtos);
    }

    public static async Task<Results<NoContent, NotFound, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult>>
        RemoveMember(
            ClaimsPrincipal principal,
            UserManager<AppUser> userManager,
            ApplicationDbContext db,
            GameSessions sessions,
            IHubContext<GameHub, IGameClient> hub,
            Guid id,
            string userId)
    {
        var caller = await userManager.GetUserAsync(principal);
        if (caller is null) return TypedResults.Unauthorized();

        var isMember = await db.GameMembers.AnyAsync(m => m.GameId == id && m.UserId == caller.Id);
        if (!isMember) return TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden);

        var target = await db.GameMembers.SingleOrDefaultAsync(m => m.GameId == id && m.UserId == userId);
        if (target is null) return TypedResults.NotFound();

        var remainingCount = await db.GameMembers.CountAsync(m => m.GameId == id) - 1;
        if (remainingCount == 0)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(userId)] = ["The last member of a game cannot be removed."]
            });

        var game = await db.Games.SingleAsync(g => g.Id == id);
        db.GameMembers.Remove(target);
        game.IntendedPlayersCount -= 1;
        await db.SaveChangesAsync();

        var session = sessions.Find(id);
        if (session is not null && session.Connections.TryGetValue(userId, out var connectionIds))
        {
            var gameGroup = id.ToString();
            foreach (var connectionId in connectionIds)
                await hub.Groups.RemoveFromGroupAsync(connectionId, gameGroup);
            await hub.Clients.Clients(connectionIds.ToList()).Exit(ExitReason.NotAMember);
        }

        sessions.RotateInviteCode(id, remainingCount, game.IntendedPlayersCount);

        return TypedResults.NoContent();
    }

    public static async Task<Results<NoContent, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult>>
        SetMembersCount(
            ClaimsPrincipal principal,
            UserManager<AppUser> userManager,
            ApplicationDbContext db,
            GameSessions sessions,
            Guid id,
            SetMembersCountRequest request)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return TypedResults.Unauthorized();

        var isMember = await db.GameMembers.AnyAsync(m => m.GameId == id && m.UserId == user.Id);
        if (!isMember) return TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden);

        var memberCount = await db.GameMembers.CountAsync(m => m.GameId == id);
        if (request.Count < memberCount)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(SetMembersCountRequest.Count)] = ["Count cannot be below the current member count."]
            });

        var game = await db.Games.SingleAsync(g => g.Id == id);
        game.IntendedPlayersCount = request.Count;
        await db.SaveChangesAsync();

        sessions.SyncInviteCode(id, memberCount, request.Count);

        return TypedResults.NoContent();
    }

    private static GameDto ToDto(GameMember membership) => new(
        membership.Game!.Id,
        membership.Game.CreatedAt,
        membership.LastPlayedAt,
        membership.Game.CompletedAt,
        membership.Game.Configuration.RootElement.Clone());
}