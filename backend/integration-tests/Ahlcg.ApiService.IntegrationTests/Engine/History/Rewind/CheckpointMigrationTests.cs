using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Rewind;

[Collection(AppCollection.Name)]
public class CheckpointMigrationTests(AppFixture fixture)
{
    [Fact]
    public async Task Migrate_LegacyScalarCheckpoint_PreservesTagsPatchesAndSavedJson()
    {
        var schema = "checkpoint_migration_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(fixture.ConnectionString);
        await connection.OpenAsync();
        await using var create = new NpgsqlCommand("CREATE SCHEMA " + schema, connection);
        await create.ExecuteNonQueryAsync();
        try
        {
            var connectionString = new NpgsqlConnectionStringBuilder(fixture.ConnectionString)
            {
                SearchPath = schema,
            }.ConnectionString;
            await using var db = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(connectionString).Options
            );
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261103231555_GameStep_AddRestoredVersion");
            await SeedLegacyHistory(db);
            var savedJson = (await db.GameSnapshots.AsNoTracking().SingleAsync()).State.RootElement.GetRawText();
            db.ChangeTracker.Clear();

            await migrator.MigrateAsync();

            var steps = await db.GameSteps.OrderBy(step => step.Version).ToListAsync();
            Assert.Equal(3, steps.Count);
            Assert.Equal(["turn"], steps[0].Checkpoints);
            Assert.Empty(steps[1].Checkpoints);
            Assert.Equal([string.Empty], steps[2].Checkpoints);
            Assert.Equal(43, steps[0].Patch.RootElement[0].GetProperty("value").GetInt32());
            var snapshot = await db.GameSnapshots.AsNoTracking().SingleAsync();
            Assert.Equal(7, snapshot.SchemaVersion);
            Assert.Equal(savedJson, snapshot.State.RootElement.GetRawText());
            Assert.True((await db.Games.SingleAsync()).Configuration.RootElement.GetProperty("old").GetBoolean());
        }
        finally
        {
            await using var drop = new NpgsqlCommand("DROP SCHEMA " + schema + " CASCADE", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static async Task SeedLegacyHistory(ApplicationDbContext db)
    {
        var user = new AppUser
        {
            Id = "migration-owner",
            UserName = "migration-owner",
            IsAnonymous = true,
        };
        var game = new Game
        {
            OwnerId = user.Id,
            IdempotencyKey = "migration-game",
            Configuration = JsonDocument.Parse("{\"old\":true}"),
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
                SchemaVersion = 7,
                State = JsonDocument.Parse("{\"SchemaVersion\":7,\"journal\":[\"kept\"],\"random\":42}"),
            }
        );
        await db.SaveChangesAsync();
        var patch = """[{"op":"replace","path":"/random","value":43}]""";
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "GameSteps" ("GameId", "Version", "Patch", "Checkpoint", "IsIrreversible", "IsBaseline")
            VALUES ({game.Id}, 1, {patch}::jsonb, 'turn', false, false),
                   ({game.Id}, 2, '[]'::jsonb, NULL, false, false),
                   ({game.Id}, 3, '[]'::jsonb, '', false, false)
            """
        );
    }
}
