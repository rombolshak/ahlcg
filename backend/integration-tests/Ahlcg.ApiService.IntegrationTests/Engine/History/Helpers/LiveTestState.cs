using System.Globalization;
using Tablier.Contract;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;

internal sealed record LiveTestState(int Counter, GameRandom Random, string[] Journal) : ISchemaVersioned
{
    public int SchemaVersion => 1;

    public static LiveTestState CreateState(int counter)
    {
        var random = GameRandom.FromSeed(782);
        for (var i = 0; i < counter; i++)
            (_, random) = random.Next(0, 100);

        return new LiveTestState(counter, random, ["saved", counter.ToString(CultureInfo.InvariantCulture)]);
    }
}
