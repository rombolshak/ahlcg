using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;

namespace Tablier.Tests.Engine.History;

public class GameHistoryTests
{
    [Fact]
    public async Task LoadAt_NegativeVersion_IsRefusedWithoutDatabase()
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);

        var loaded = await history.LoadAt(Guid.NewGuid(), version: -1);

        Assert.Null(loaded);
    }

    [Fact]
    public async Task Restore_NegativeDestination_IsRefusedWithoutDatabase()
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var storedState = new StoredState<TestState>(3, new TestState(1));

        var restored = await history.Restore(Guid.NewGuid(), previous: storedState, targetVersion: -1);

        Assert.Null(restored);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    public async Task Restore_DestinationAtOrAfterHead_IsRefusedWithoutDatabase(int destinationVersion)
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var storedState = new StoredState<TestState>(3, new TestState(1));

        var restored = await history.Restore(Guid.NewGuid(), previous: storedState, targetVersion: destinationVersion);

        Assert.Null(restored);
    }

    private sealed record TestState(int Counter) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }
}
