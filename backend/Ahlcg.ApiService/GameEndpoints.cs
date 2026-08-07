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
}

public static class GameEndpoints
{
    [PublicAPI]
    public record CreateGameRequest(JsonElement Configuration);

    [PublicAPI]
    public record GameDto(Guid Id, DateTimeOffset CreatedAt, DateTimeOffset LastPlayedAt, JsonElement Configuration);

    public static RouteGroupBuilder MapGameEndpoints(this RouteGroupBuilder group)
    {
        group.WithDescription("Game creation and lifecycle.");

        group.MapPost("", CreateGame)
            .RequireAuthorization()
            .WithDescription(
                "Creates a new game owned by the calling user. " +
                "The configuration payload is opaque and stored unchanged. " +
                "Requires an Idempotency-Key header; repeating the same key for the same user " +
                "returns the game created the first time instead of creating a new one.")
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

        db.Games.Add(game);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
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
            game.Configuration.RootElement.Clone()));
    }
}