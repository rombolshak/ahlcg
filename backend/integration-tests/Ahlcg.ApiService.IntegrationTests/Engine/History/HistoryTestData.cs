using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

internal static class HistoryTestData
{
    public static async Task<Guid> SeedGame(AppFixture fixture, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = Guid.NewGuid().ToString(),
            IsAnonymous = true,
        };
        var game = new Game
        {
            OwnerId = user.Id,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = now,
            LastPlayedAt = now,
        };

        await using var db = fixture.CreateDbContext();
        db.Users.Add(user);
        db.Games.Add(game);
        await db.SaveChangesAsync(ct);
        return game.Id;
    }
}
