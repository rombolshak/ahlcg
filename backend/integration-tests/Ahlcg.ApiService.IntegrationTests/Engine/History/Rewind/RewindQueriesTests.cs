using System.Data.Common;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Tablier.Data;
using Tablier.Engine.History.Rewind;
using Xunit.Abstractions;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Rewind;

[Collection(AppCollection.Name)]
public class RewindQueriesTests(AppFixture fixture, ITestOutputHelper output)
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Load_RestoredRepresentations_MatchesReferenceWithoutResurrectingDestination(bool nested)
    {
        var steps = Enumerable.Range(1, 34).Select(version => CreateStep(version)).ToList();
        steps[9].Checkpoint = "turn";
        steps[19].Checkpoint = "phase";
        steps[29].Checkpoint = "turn";
        steps[30].RestoredVersion = 20;
        steps[30].Actor = null;
        steps[30].Checkpoint = "phase";
        if (nested)
        {
            steps[32].RestoredVersion = 31;
            steps[32].Actor = null;
            steps[32].Checkpoint = "phase";
        }
        var gameId = await SeedHistory(steps);
        await using var db = fixture.CreateDbContext();
        var query = new RewindQueries(db, NullLogger<RewindQueries>.Instance);

        var metadata = await query.Load(gameId, steps.Count);

        Assert.Equivalent(Traverse(steps), metadata, strict: true);
        Assert.Equal(10, metadata.Checkpoints["turn"]);
        Assert.Equal(nested ? 33 : 31, metadata.Checkpoints["phase"]);
        Assert.DoesNotContain(20, metadata.Checkpoints.Values);
    }

    [Fact]
    public async Task Load_RestoredPlayerAction_UsesOriginalActorAndPrecedingPhysicalVersion()
    {
        var steps = Enumerable.Range(1, 7).Select(version => CreateStep(version)).ToList();
        steps[2].Actor = "alice";
        steps[2].Checkpoint = "turn";
        steps[4].Actor = "bob";
        steps[5].RestoredVersion = 3;
        steps[5].Checkpoint = "turn";
        var gameId = await SeedHistory(steps);
        await using var db = fixture.CreateDbContext();

        var metadata = await new RewindQueries(db, NullLogger<RewindQueries>.Instance).Load(gameId, 7);

        Assert.Equal(new UndoTarget(2, "alice"), metadata.Undo);
        Assert.Equivalent(Traverse(steps), metadata, strict: true);
    }

    [Theory]
    [InlineData(6)]
    [InlineData(8)]
    public async Task Load_RepeatedRestoreOfRestores_RetainsOnlyLiveRepresentationAndOriginalActionActor(int head)
    {
        var steps = Enumerable.Range(1, head).Select(version => CreateStep(version)).ToList();
        steps[0].Actor = "actor-a";
        steps[1].Actor = "actor-b";
        steps[1].Checkpoint = "turn-b";
        steps[3].RestoredVersion = 2;
        steps[3].Checkpoint = "turn-b";
        steps[4].Actor = "actor-c";
        steps[5].RestoredVersion = 4;
        steps[5].Checkpoint = "turn-b";
        if (head == 8)
        {
            steps[6].Actor = "actor-c";
            steps[7].RestoredVersion = 6;
            steps[7].Checkpoint = "turn-b";
        }
        var gameId = await SeedHistory(steps);
        await using var db = fixture.CreateDbContext();

        var metadata = await new RewindQueries(db, NullLogger<RewindQueries>.Instance).Load(gameId, head);

        Assert.Equal(head, metadata.Checkpoints["turn-b"]);
        Assert.Single(metadata.Checkpoints);
        Assert.Equal(new UndoTarget(1, "actor-b"), metadata.Undo);
        Assert.Equivalent(Traverse(steps), metadata, strict: true);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Load_RealBarrier_MatchesReferenceAndOrdinaryIncrementalMetadata(bool baseline)
    {
        var steps = Enumerable.Range(1, 6).Select(CreateStep).ToList();
        steps[0].Checkpoint = "old";
        steps[1].Actor = "alice";
        steps[2].Actor = "barrier-actor";
        steps[2].Checkpoint = "boundary";
        steps[2].IsBaseline = baseline;
        steps[2].IsIrreversible = !baseline;
        steps[4].Actor = "bob";
        steps[5].Checkpoint = "turn";
        var gameId = await SeedHistory(steps.Take(3).ToList());
        await using var db = fixture.CreateDbContext();
        var query = new RewindQueries(db, NullLogger<RewindQueries>.Instance);

        var atBarrier = await query.Load(gameId, headVersion: 3);

        Assert.Equal(3, atBarrier.Boundary);
        Assert.Equal(3, atBarrier.Checkpoints["boundary"]);
        Assert.Null(atBarrier.Undo);
        Assert.False(atBarrier.Checkpoints.ContainsKey("old"));
        Assert.Equivalent(Traverse(steps.Take(3).ToArray()), atBarrier, strict: true);
        foreach (var step in steps.Skip(3))
            step.GameId = gameId;
        db.GameSteps.AddRange(steps.Skip(3));
        await db.SaveChangesAsync();
        var reconstructed = await query.Load(gameId, headVersion: 6);
        var maintained = steps.Aggregate(
            RewindMetadata.Empty,
            (metadata, step) =>
                metadata.Apply(
                    new HistoryMetadata(
                        step.Version,
                        step.Actor,
                        step.Checkpoint,
                        step.IsBaseline || step.IsIrreversible,
                        step.RestoredVersion
                    )
                )
        );
        Assert.Equivalent(Traverse(steps), reconstructed, strict: true);
        Assert.Equivalent(maintained, reconstructed, strict: true);
        Assert.Equal(new UndoTarget(4, "bob"), reconstructed.Undo);
    }

    [Fact]
    public async Task Load_RestoreBeforeAnInterveningRestore_ExcludesItsEntireReplacedSpan()
    {
        var steps = Enumerable.Range(1, 8).Select(CreateStep).ToList();
        steps[0].Checkpoint = "start";
        steps[1].Actor = "bob";
        steps[1].Checkpoint = "turn";
        steps[2].Checkpoint = "phase";
        steps[3].Checkpoint = "turn";
        steps[4].RestoredVersion = 3;
        steps[4].Checkpoint = "phase";
        steps[5].Actor = "alice";
        steps[6].RestoredVersion = 2;
        steps[6].Checkpoint = "turn";
        var gameId = await SeedHistory(steps);
        await using var db = fixture.CreateDbContext();

        var reconstructed = await new RewindQueries(db, NullLogger<RewindQueries>.Instance).Load(
            gameId,
            headVersion: 8
        );

        Assert.Equivalent(Traverse(steps), reconstructed, strict: true);
        Assert.Equal(7, reconstructed.Checkpoints["turn"]);
        Assert.Equal(1, reconstructed.Checkpoints["start"]);
        Assert.False(reconstructed.Checkpoints.ContainsKey("phase"));
        Assert.Equal(new UndoTarget(1, "bob"), reconstructed.Undo);
    }

    [Fact]
    public async Task Load_LongHistoryWithRestores_ReturnsCompactMetadataAndRecordsActualPlans()
    {
        var steps = Enumerable.Range(1, 2000).Select(version => CreateStep(version)).ToList();
        foreach (var step in steps)
        {
            step.Checkpoint = step.Version % 10 == 0 ? "turn" : null;
            step.Actor = step.Version % 3 == 0 ? "alice" : null;
            if (step.Version % 50 == 0)
            {
                step.RestoredVersion = step.Version - 20;
                step.Actor = null;
                step.Checkpoint = steps[step.RestoredVersion.Value - 1].Checkpoint;
            }
        }
        var gameId = await SeedHistory(steps);
        var probe = new QueryProbe();
        await using var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(fixture.ConnectionString)
                .AddInterceptors(probe)
                .Options
        );

        var metadata = await new RewindQueries(db, NullLogger<RewindQueries>.Instance).Load(gameId, steps.Count);

        Assert.Equivalent(Traverse(steps), metadata, strict: true);
        Assert.Single(metadata.Checkpoints);
        foreach (var query in probe.Queries)
            await WritePlan(query.Sql, query.Parameters);
    }

    private async Task<Guid> SeedHistory(List<GameStep> steps)
    {
        using var client = fixture.CreateClient();
        await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        await using var db = fixture.CreateDbContext();
        foreach (var step in steps)
            step.GameId = gameId;
        db.GameSteps.AddRange(steps);
        await db.SaveChangesAsync();
        return gameId;
    }

    private static GameStep CreateStep(int version) => new() { Version = version, Patch = JsonDocument.Parse("[]") };

    private static RewindMetadata Traverse(IReadOnlyList<GameStep> steps)
    {
        var byVersion = steps.ToDictionary(step => step.Version);
        var boundary = steps
            .Where(step => step.IsBaseline || step.IsIrreversible)
            .Select(step => step.Version)
            .DefaultIfEmpty()
            .Max();
        var restores = steps.Where(step => step.RestoredVersion is not null).ToList();
        var live = steps
            .Where(step =>
                step.Version >= boundary
                && restores.TrueForAll(restore =>
                    step.Version < restore.RestoredVersion || step.Version >= restore.Version
                )
            )
            .Reverse()
            .ToList();
        var checkpoints = new Dictionary<string, int>(StringComparer.Ordinal);
        UndoTarget? undo = null;
        var foundAction = false;
        foreach (var representation in live)
        {
            if (representation.Checkpoint is not null)
                checkpoints.TryAdd(representation.Checkpoint, representation.Version);
            if (foundAction)
                continue;
            var source = representation;
            while (source.RestoredVersion is not null)
                source = byVersion[source.RestoredVersion.Value];
            if (source.Actor is null)
                continue;
            foundAction = true;
            var destination = source.Version - 1;
            if (destination > 0 && destination >= boundary && live.Exists(step => step.Version == destination))
                undo = new UndoTarget(destination, source.Actor);
        }
        return new RewindMetadata(steps[^1].Version, boundary, checkpoints, undo);
    }

    private async Task WritePlan(string sql, IReadOnlyDictionary<string, object> parameters)
    {
        await using var connection = new NpgsqlConnection(fixture.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("EXPLAIN (ANALYZE, BUFFERS) " + sql, connection);
        foreach (var parameter in parameters)
            command.Parameters.AddWithValue(parameter.Key, parameter.Value);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            output.WriteLine(reader.GetString(0));
    }

    private sealed class QueryProbe : DbCommandInterceptor
    {
        public List<(string Sql, IReadOnlyDictionary<string, object> Parameters)> Queries { get; } = [];

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default
        )
        {
            if (command.CommandText.Contains("WITH RECURSIVE live", StringComparison.Ordinal))
                Queries.Add(
                    (
                        command.CommandText,
                        command
                            .Parameters.Cast<DbParameter>()
                            .ToDictionary(
                                parameter => parameter.ParameterName,
                                parameter => parameter.Value!,
                                StringComparer.Ordinal
                            )
                    )
                );
            return ValueTask.FromResult(result);
        }
    }
}
