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
    public async Task Rewind_NegativeDestination_IsRefusedWithoutDatabase()
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var storedState = new StoredState<TestState>(3, new TestState(1));

        var restored = await history.Rewind(Guid.NewGuid(), current: storedState, targetVersion: -1);

        Assert.Null(restored);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    public async Task Rewind_DestinationAtOrAfterHead_IsRefusedWithoutDatabase(int destinationVersion)
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var storedState = new StoredState<TestState>(3, new TestState(1));

        var restored = await history.Rewind(Guid.NewGuid(), current: storedState, targetVersion: destinationVersion);

        Assert.Null(restored);
    }

    [Fact]
    public async Task Rewind_ZeroDestination_IsRefusedWithoutDatabase()
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);

        Assert.Null(
            await history.Rewind(Guid.NewGuid(), new StoredState<TestState>(3, new TestState(1)), targetVersion: 0)
        );
    }

    [Fact]
    public async Task GetHistorySummary_NegativeHead_IsRefusedWithoutDatabase()
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);

        Assert.Null(await history.GetHistorySummary(Guid.NewGuid(), headVersion: -1));
    }

    [Theory]
    [InlineData(-1, 3)]
    [InlineData(3, 2)]
    public async Task GetActorsForRange_InvalidBounds_IsRefusedWithoutDatabase(int fromVersion, int toVersion)
    {
        await using var db = new ApplicationDbContext(new DbContextOptions<ApplicationDbContext>());
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);

        Assert.Null(
            await history.GetActorsForRange(
                Guid.NewGuid(),
                fromVersionExclusive: fromVersion,
                toVersionInclusive: toVersion
            )
        );
    }

    private sealed record TestState(int Counter) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }
}
