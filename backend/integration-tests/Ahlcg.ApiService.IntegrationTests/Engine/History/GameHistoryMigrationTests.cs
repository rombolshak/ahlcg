using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class GameHistoryMigrationTests(AppFixture fixture)
{
    [Fact]
    public async Task Migrate_ScalarCheckpoints_PreservesTagsAndStoredPayloads()
    {
        var schema = "history_migration_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(fixture.ConnectionString);
        await admin.OpenAsync();
        await using var createSchema = new NpgsqlCommand("CREATE SCHEMA " + schema, admin);
        await createSchema.ExecuteNonQueryAsync();
        try
        {
            var connection = new NpgsqlConnectionStringBuilder(fixture.ConnectionString) { SearchPath = schema };
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connection.ConnectionString, postgres =>
                    postgres.MigrationsHistoryTable("__EFMigrationsHistory", schema)
                )
                .Options;
            await using var db = new ApplicationDbContext(options);
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261020120903_GameHistory_Add");
            var gameId = await SeedScalarHistory(db);
            var configuration = (await db.Games.AsNoTracking().SingleAsync()).Configuration.RootElement.GetRawText();
            var snapshot = (await db.GameSnapshots.AsNoTracking().SingleAsync()).State.RootElement.GetRawText();
            var patches = await db
                .Database.SqlQuery<string>($"""SELECT "Patch"::text AS "Value" FROM "GameSteps" ORDER BY "Version" """)
                .ToListAsync();

            await migrator.MigrateAsync();

            var steps = await db.GameSteps.AsNoTracking().OrderBy(s => s.Version).ToListAsync();
            Assert.Equal(4, steps.Count);
            Assert.Empty(steps[0].Checkpoints);
            Assert.Equal([""], steps[1].Checkpoints);
            Assert.Equal(["reveal"], steps[2].Checkpoints);
            Assert.Equal(["undo"], steps[3].Checkpoints);
            Assert.All(steps, step => Assert.Equal(gameId, step.GameId));
            Assert.Equal(patches, steps.Select(s => s.Patch.RootElement.GetRawText()));
            Assert.Equal(
                configuration,
                (await db.Games.AsNoTracking().SingleAsync()).Configuration.RootElement.GetRawText()
            );
            Assert.Equal(
                snapshot,
                (await db.GameSnapshots.AsNoTracking().SingleAsync()).State.RootElement.GetRawText()
            );
            await VerifyDowngrade(db, migrator);
        }
        finally
        {
            await using var dropSchema = new NpgsqlCommand("DROP SCHEMA " + schema + " CASCADE", admin);
            await dropSchema.ExecuteNonQueryAsync();
        }
    }

    private static async Task VerifyDowngrade(ApplicationDbContext db, IMigrator migrator)
    {
        await db.Database.ExecuteSqlRawAsync(
            """UPDATE "GameSteps" SET "Checkpoints" = ARRAY['turn', 'phase'] WHERE "Version" = 1"""
        );

        var exception = await Assert.ThrowsAsync<PostgresException>(() =>
            migrator.MigrateAsync("20261020120903_GameHistory_Add")
        );

        Assert.Equal(PostgresErrorCodes.RaiseException, exception.SqlState);
        var retained = await db.GameSteps.Where(s => s.Version == 1).Select(s => s.Checkpoints).SingleAsync();
        Assert.Equal(["turn", "phase"], retained);
        await db.Database.ExecuteSqlRawAsync(
            """UPDATE "GameSteps" SET "Checkpoints" = ARRAY[]::text[] WHERE "Version" = 1"""
        );

        await migrator.MigrateAsync("20261020120903_GameHistory_Add");

        var checkpoints = await db
            .Database.SqlQuery<string?>($"""SELECT "Checkpoint" AS "Value" FROM "GameSteps" ORDER BY "Version" """)
            .ToListAsync();
        Assert.Equal([null, "", "reveal", "undo"], checkpoints);
    }

    private static async Task<Guid> SeedScalarHistory(ApplicationDbContext db)
    {
        var user = new AppUser { Id = Guid.NewGuid().ToString(), IsAnonymous = true };
        var game = new Game
        {
            OwnerId = user.Id,
            IdempotencyKey = "migration",
            Configuration = JsonDocument.Parse("{\"opaque\": [1, 2]}"),
            CreatedAt = DateTimeOffset.UtcNow,
            LastPlayedAt = DateTimeOffset.UtcNow,
        };
        db.Users.Add(user);
        db.Games.Add(game);
        db.GameSnapshots.Add(
            new GameSnapshot
            {
                GameId = game.Id,
                Version = 0,
                SchemaVersion = 1,
                State = JsonDocument.Parse("{\"random\": [11, 19], \"journal\": [\"saved\"]}"),
            }
        );
        await db.SaveChangesAsync();
        string?[] checkpoints = [null, "", "reveal", "undo"];
        for (var index = 0; index < checkpoints.Length; index++)
        {
            var version = index + 1;
            var checkpoint = checkpoints[index];
            await db.Database.ExecuteSqlInterpolatedAsync(
                $$"""
                INSERT INTO "GameSteps" ("GameId", "Version", "Patch", "Checkpoint", "IsIrreversible", "IsBaseline")
                VALUES ({{game.Id}}, {{version}}, '[{"op":"replace","path":"/random/0","value":23}]'::jsonb, {{checkpoint}}, false, false)
                """
            );
        }
        db.ChangeTracker.Clear();
        return game.Id;
    }
}
