using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;

internal static class HistoryTestSetup
{
    internal static async Task<HistoryTestCase<TState>> Begin<TState>(
        AppFixture fixture,
        Func<int, TState> createState,
        IGameHistory<TState>? history = null,
        Guid? gameId = null,
        CancellationToken ct = default
    )
        where TState : ISchemaVersioned
    {
        var seededGameId = gameId ?? await SeedGame(fixture, ct);
        history ??= CreateHistory<TState>(fixture);
        var initial = createState(0);
        var head = await history.Begin(seededGameId, initial, ct);
        Assert.Equal(0, head.Version);
        Assert.Equal(JsonSerializer.Serialize(initial), JsonSerializer.Serialize(head.State));
        return new HistoryTestCase<TState>(seededGameId, history, head, createState, fixture.CreateDbContext());
    }

    internal static GameHistory<TState> CreateHistory<TState>(
        AppFixture fixture,
        ILogger<GameHistory<TState>>? logger = null
    )
        where TState : ISchemaVersioned =>
        new(fixture.CreateDbContext(), logger ?? NullLogger<GameHistory<TState>>.Instance);

    internal static async Task<Guid> SeedGame(AppFixture fixture, CancellationToken ct = default)
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
