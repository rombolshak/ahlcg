using System.Data;
using System.Security.Claims;
using System.Text.Json;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Tablier.Auth;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.Execution;
using Tablier.Games.Sessions;

namespace Tablier.Games;

public static partial class GameEndpoints
{
    [PublicAPI]
    public record CreateGameRequest(JsonElement Configuration);

    [PublicAPI]
    public record JoinGameRequest(string Code);

    [PublicAPI]
    public record GameDto(
        Guid Id,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastPlayedAt,
        DateTimeOffset? CompletedAt,
        JsonElement Configuration
    );

    [PublicAPI]
    public record MemberDto(string UserId, string? UserName, bool IsAnonymous, bool IsOnline);

    [PublicAPI]
    public record SetMembersCountRequest(int Count);

    public static RouteGroupBuilder MapGameEndpoints(this RouteGroupBuilder group)
    {
        group.WithDescription("Game creation and lifecycle.");
        MapCreateGame(group);
        MapJoinGame(group);
        MapGetRecentGames(group);
        MapGetArchivedGames(group);
        MapGetLatestGame(group);
        MapGetMembers(group);
        MapRemoveMember(group);
        MapSetMembersCount(group);
        return group;
    }

    private static void MapCreateGame(RouteGroupBuilder group)
    {
        group
            .MapPost("", CreateGame)
            .RequireAuthorization()
            .WithDescription(
                "Creates a new game owned by the calling user. "
                    + "The configuration payload is stored in a jsonb column and handed back unchanged. The engine never "
                    + "inspects it, but the game's rules module reads it: omitting it, or sending one the rules cannot "
                    + "read, yields a 400 with ConfigurationRequired or ConfigurationUnreadable in errors.Configuration and nothing is saved. Creation also begins the game's history at version 0. "
                    + "createdAt and lastPlayedAt are equal on creation. "
                    + "Requires an Idempotency-Key header; repeating the same key for the same user "
                    + "returns the game created the first time instead of creating a new one, while the same key from a "
                    + "different user creates a separate game. A unique index on (OwnerId, IdempotencyKey) enforces this, "
                    + "not a check-then-insert."
            )
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static void MapJoinGame(RouteGroupBuilder group)
    {
        group
            .MapPost("join", JoinGame)
            .RequireAuthorization()
            .RequireRateLimiting(RateLimits.JoinPolicy)
            .WithDescription(
                "Redeems an invite code (#527) into a membership of the game whose session holds it. The code is "
                    + "uppercased before lookup and matched against live sessions only — one with no live session behind "
                    + "it, whether because it never existed, is malformed, or the session it belonged to has ended, reads "
                    + "as unknown. Idempotent: a caller who is already a member gets that game back unchanged rather than "
                    + "a duplicate row or an error, which is what lets the same code double as a resume link. Unknown, "
                    + "malformed and expired codes return 404 with code UnusableInvite. A live invite for a full game "
                    + "returns 409 with code GameFull. A join that fills the last seat clears the session's "
                    + "invite code in the same request — no reconnect or disconnect needed to notice. Throttled per "
                    + "account; exceeding it returns 429. A join that adds a membership also commits a step adding the member to "
                    + "the game's state, and connected members receive a StateChanged for it. Never reads or writes "
                    + "Configuration."
            )
            .Produces(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status429TooManyRequests);
    }

    private static void MapGetRecentGames(RouteGroupBuilder group)
    {
        group
            .MapGet("recent", GetRecentGames)
            .RequireAuthorization()
            .WithDescription(
                "Lists the games the calling user is a member of: every game still in progress, most recently "
                    + "played first, followed by the 2 most recently completed. "
                    + "Membership is a GameMember row, never Game.OwnerId: a game the caller created but is not a member "
                    + "of is absent, and a game the caller joined but did not create is present. "
                    + "lastPlayedAt is the caller's own last play, not the game's, so two members of one game can see "
                    + "different values for it; the active games are ordered by that lastPlayedAt, while the completed "
                    + "games are ordered by Game.CompletedAt instead and always sort after every active game. "
                    + "Each configuration payload is opaque and returned exactly as stored."
            )
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static void MapGetArchivedGames(RouteGroupBuilder group)
    {
        group
            .MapGet("archive", GetArchivedGames)
            .RequireAuthorization()
            .WithDescription(
                "Lists every completed game the calling user is a member of, ordered by Game.CompletedAt "
                    + "descending — most recently completed first. "
                    + "Membership is a GameMember row, never Game.OwnerId: a game the caller created but is not a member "
                    + "of is absent, and a game the caller joined but did not create is present. "
                    + "Each configuration payload is opaque and returned exactly as stored."
            )
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static void MapGetLatestGame(RouteGroupBuilder group)
    {
        group
            .MapGet("latest", GetLatestGame)
            .RequireAuthorization()
            .WithDescription(
                "Returns the most recently played game that is not completed, for callers that need one game and "
                    + "nothing else. Membership is a GameMember row, never Game.OwnerId, and lastPlayedAt is the "
                    + "caller's own last play, not the game's. completedAt is null for a game that is not completed. "
                    + "A caller who is a member of no active game gets 204, not 404: having nothing to resume is a "
                    + "normal state, not a missing resource."
            )
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static void MapGetMembers(RouteGroupBuilder group)
    {
        group
            .MapGet("{id:guid}/members", GetMembers)
            .RequireAuthorization()
            .WithDescription(
                "Lists the game's members ordered by JoinedAt, each with userName and isAnonymous from AppUser "
                    + "(no email: members must not see each other's) and its online state. isOnline is derived from "
                    + "the in-memory session registry: true when the member has a live connection in this game's "
                    + "session, false otherwise — including every member of a game with no session. Membership is the "
                    + "entire authorization check, never Game.OwnerId: any member may call this for any game they "
                    + "belong to, and a caller with no row for the game gets 403, including for a game that does not "
                    + "exist."
            )
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);
    }

    private static void MapRemoveMember(RouteGroupBuilder group)
    {
        group
            .MapDelete("{id:guid}/members/{userId}", RemoveMember)
            .RequireAuthorization()
            .WithDescription(
                "Removes a member from the game — a hard delete, not a soft flag. Any member may remove any "
                    + "other member, the game's creator included: Game.OwnerId confers no special standing. A caller "
                    + "with no row for the game gets 403. A target that is not a member is a no-op that still returns "
                    + "204: removal is idempotent. Removing the game's only remaining member is rejected with a "
                    + "validation problem (userId: LastMember) rather than leaving the game with nobody in it. The "
                    + "read, the guard and the write run in one serializable transaction so a concurrent removal "
                    + "cannot both pass the last-member check. Otherwise the row is deleted and IntendedPlayersCount "
                    + "is decremented to match, and the session's invite code is rotated: cleared unconditionally, "
                    + "then reissued only if seats remain open, so a member still holding the old code cannot use it "
                    + "to walk back in. A removal that deletes a row also commits a step removing the member from the "
                    + "game's state, and the remaining connected members receive a StateChanged for it. A removed member connected at the time is dropped from the game's SignalR "
                    + "group and sent Exit(NotAMember)."
            )
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);
    }

    private static void MapSetMembersCount(RouteGroupBuilder group)
    {
        group
            .MapPut("{id:guid}/membersCount", SetMembersCount)
            .RequireAuthorization()
            .WithDescription(
                "Sets Game.IntendedPlayersCount — a bare number (#198), not a seat or an investigator count. "
                    + "Any member may call this, and a caller with no row for the game gets 403. Count below the "
                    + "current member count is rejected with a validation problem (Count: BelowMemberCount) instead "
                    + "of being clamped. Otherwise the session's invite code is synced: raising the count above the "
                    + "member count issues one if none exists yet, and lowering it to match the member count clears "
                    + "one if it does."
            )
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);
    }

    internal static async Task<Results<Ok<GameDto>, ValidationProblem, UnauthorizedHttpResult>> CreateGame(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        [FromHeader(Name = "Idempotency-Key")] string idempotencyKey,
        CreateGameRequest request,
        IGameEngine engine,
        CancellationToken ct = default
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var result = await engine.Create(user.Id, idempotencyKey, request.Configuration, ct);
        if (result is CreateGameResult.InvalidConfiguration invalid)
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    [nameof(CreateGameRequest.Configuration)] =
                    [
                        invalid.IsMissing ? "ConfigurationRequired" : "ConfigurationUnreadable",
                    ],
                }
            );

        var game = ((CreateGameResult.Created)result).Game;
        return TypedResults.Ok(
            new GameDto(
                game.Id,
                game.CreatedAt,
                game.LastPlayedAt,
                game.CompletedAt,
                game.Configuration.RootElement.Clone()
            )
        );
    }

    internal static async Task<Results<Ok<GameDto>, ProblemHttpResult, UnauthorizedHttpResult>> JoinGame(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        JoinGameRequest request,
        IGameEngine engine,
        CancellationToken ct = default
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var result = await engine.Join(user.Id, request.Code, ct);
        return result switch
        {
            JoinGameResult.Joined joined => TypedResults.Ok(ToDto(joined.Membership)),
            JoinGameResult.UnusableInvite => TypedResults.Problem(
                extensions: new Dictionary<string, object?> { ["code"] = "UnusableInvite" },
                statusCode: StatusCodes.Status404NotFound
            ),
            JoinGameResult.GameFull => TypedResults.Problem(
                extensions: new Dictionary<string, object?> { ["code"] = "GameFull" },
                statusCode: StatusCodes.Status409Conflict
            ),
            _ => throw new InvalidOperationException("Unknown join result."),
        };
    }

    public static async Task<Results<Ok<IReadOnlyList<GameDto>>, UnauthorizedHttpResult>> GetRecentGames(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var active = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt == null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.LastPlayedAt)
            .ToListAsync();

        var completed = await db
            .GameMembers.AsNoTracking()
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
        ApplicationDbContext db
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var memberships = await db
            .GameMembers.AsNoTracking()
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
        ApplicationDbContext db
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var membership = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.UserId == user.Id && m.Game!.CompletedAt == null)
            .Include(m => m.Game)
            .OrderByDescending(m => m.LastPlayedAt)
            .FirstOrDefaultAsync();

        if (membership is null)
            return TypedResults.NoContent();

        return TypedResults.Ok(ToDto(membership));
    }

    public static async Task<
        Results<Ok<IReadOnlyList<MemberDto>>, ProblemHttpResult, UnauthorizedHttpResult>
    > GetMembers(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db,
        GameSessions sessions,
        Guid id,
        ILogger<Game> logger
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var members = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.GameId == id)
            .Include(m => m.User)
            .OrderBy(m => m.JoinedAt)
            .ToListAsync();

        if (members.TrueForAll(m => m.UserId != user.Id))
        {
            LogNotAMember(logger, id, user.Id);
            return TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden);
        }

        var session = sessions.Find(id);
        IReadOnlyList<MemberDto> dtos =
        [
            .. members.Select(m => new MemberDto(
                m.UserId,
                m.User!.UserName,
                m.User.IsAnonymous,
                session?.Connections.ContainsKey(m.UserId) ?? false
            )),
        ];

        return TypedResults.Ok(dtos);
    }

    // Minimal API injects each service as a parameter; [AsParameters] would make validation walk the DbContext.
#pragma warning disable S107
    internal static async Task<
        Results<NoContent, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult>
    > RemoveMember(
#pragma warning restore S107
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db,
        GameSessions sessions,
        IHubContext<GameHub, IGameClient> hub,
        Guid id,
        string userId,
        IGameEngine engine,
        ILogger<Game> logger,
        CancellationToken ct = default
    )
    {
        var caller = await userManager.GetUserAsync(principal);
        if (caller is null)
            return TypedResults.Unauthorized();

        var (result, game) = await DeleteMembership(db, id, caller.Id, userId, logger);
        if (game is null)
            return result;

        await engine.SyncMembers(id, ct);

        await DisconnectMember(sessions, hub, id, userId);
        var session = sessions.RotateInviteCode(id, game.Members.Count, game.IntendedPlayersCount);
        await GameHub.SendInviteCode(hub.Clients, id, session);

        return result;
    }

    private static Task<(
        Results<NoContent, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult> Result,
        Game? Updated
    )> DeleteMembership(ApplicationDbContext db, Guid id, string callerId, string userId, ILogger logger) =>
        db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync<(Results<NoContent, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult>, Game?)>(
                async () =>
                {
                    db.ChangeTracker.Clear();
                    await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

                    var game = await db.Games.Include(g => g.Members).SingleOrDefaultAsync(g => g.Id == id);
                    if (game is null || game.Members.All(m => m.UserId != callerId))
                    {
                        LogNotAMember(logger, id, callerId);
                        return (TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden), null);
                    }

                    var target = game.Members.SingleOrDefault(m => m.UserId == userId);
                    if (target is null)
                    {
                        LogRemovalTargetNotAMember(logger, id, userId);
                        return (TypedResults.NoContent(), null);
                    }

                    if (game.Members.Count == 1)
                    {
                        LogRemovalRefusedLastMember(logger, id, userId);
                        return (
                            TypedResults.ValidationProblem(
                                new Dictionary<string, string[]> { [nameof(userId)] = ["LastMember"] }
                            ),
                            null
                        );
                    }

                    game.Members.Remove(target);
                    game.IntendedPlayersCount -= 1;
                    await db.SaveChangesAsync();
                    await transaction.CommitAsync();
                    LogMemberRemoved(logger, id, userId, callerId);

                    return (TypedResults.NoContent(), game);
                }
            );

    private static async Task DisconnectMember(
        GameSessions sessions,
        IHubContext<GameHub, IGameClient> hub,
        Guid id,
        string userId
    )
    {
        var session = sessions.Find(id);
        if (session is null || !session.Connections.TryGetValue(userId, out var connectionIds))
            return;

        var gameGroup = id.ToString();
        var memberGroup = GameHub.GetMemberGroupName(id, userId);
        foreach (var connectionId in connectionIds)
        {
            await hub.Groups.RemoveFromGroupAsync(connectionId, gameGroup);
            await hub.Groups.RemoveFromGroupAsync(connectionId, memberGroup);
        }
        await hub.Clients.Clients([.. connectionIds]).Exit(ExitReason.NotAMember);
    }

    // Minimal API injects each service as a parameter; [AsParameters] would make validation walk the DbContext.
#pragma warning disable S107
    internal static async Task<
        Results<NoContent, ValidationProblem, ProblemHttpResult, UnauthorizedHttpResult>
    > SetMembersCount(
#pragma warning restore S107
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        ApplicationDbContext db,
        GameSessions sessions,
        IHubContext<GameHub, IGameClient> hub,
        Guid id,
        SetMembersCountRequest request,
        ILogger<Game> logger
    )
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
            return TypedResults.Unauthorized();

        var members = await db.GameMembers.Where(m => m.GameId == id).Select(m => m.UserId).ToListAsync();
        if (!members.Contains(user.Id))
        {
            LogNotAMember(logger, id, user.Id);
            return TypedResults.Problem(statusCode: StatusCodes.Status403Forbidden);
        }

        var memberCount = members.Count;
        var updated = await db
            .Games.Where(g => g.Id == id && g.Members.Count <= request.Count)
            .ExecuteUpdateAsync(setters => setters.SetProperty(g => g.IntendedPlayersCount, request.Count));
        if (updated == 0)
        {
            LogMembersCountBelowMembers(logger, id, request.Count, memberCount);
            return TypedResults.ValidationProblem(
                new Dictionary<string, string[]> { [nameof(SetMembersCountRequest.Count)] = ["BelowMemberCount"] }
            );
        }

        LogMembersCountChanged(logger, id, request.Count, user.Id);

        var session = sessions.SyncInviteCode(id, memberCount, request.Count);
        await GameHub.SendInviteCode(hub.Clients, id, session);

        return TypedResults.NoContent();
    }

    private static GameDto ToDto(GameMember membership) =>
        new(
            membership.Game!.Id,
            membership.Game.CreatedAt,
            membership.LastPlayedAt,
            membership.Game.CompletedAt,
            membership.Game.Configuration.RootElement.Clone()
        );

    [LoggerMessage(LogLevel.Warning, "User {UserId} is not a member of game {GameId}")]
    private static partial void LogNotAMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Debug, "User {UserId} is already not a member of game {GameId}; nothing to remove")]
    private static partial void LogRemovalTargetNotAMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Information, "User {UserId} was not removed from game {GameId}: they are its last member")]
    private static partial void LogRemovalRefusedLastMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Information, "User {UserId} was removed from game {GameId} by {RemovedBy}")]
    private static partial void LogMemberRemoved(ILogger logger, Guid gameId, string userId, string removedBy);

    [LoggerMessage(
        LogLevel.Information,
        "Game {GameId} kept its seat count: {RequestedCount} is below its {MemberCount} members"
    )]
    private static partial void LogMembersCountBelowMembers(
        ILogger logger,
        Guid gameId,
        int requestedCount,
        int memberCount
    );

    [LoggerMessage(LogLevel.Information, "User {UserId} set game {GameId} to {IntendedPlayersCount} seats")]
    private static partial void LogMembersCountChanged(
        ILogger logger,
        Guid gameId,
        int intendedPlayersCount,
        string userId
    );
}
