using System.Security.Claims;
using System.Text.Json;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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

    private static GameDto ToDto(GameMember membership) => new(
        membership.Game!.Id,
        membership.Game.CreatedAt,
        membership.LastPlayedAt,
        membership.Game.CompletedAt,
        membership.Game.Configuration.RootElement.Clone());
}