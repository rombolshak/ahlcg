using System.Globalization;
using Tablier.Contract;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;

internal sealed record TestState(int Counter, string Label, bool Flag = false) : ISchemaVersioned
{
    public int SchemaVersion => 1;

    public static TestState CreateState(int counter) =>
        new(counter, string.Create(CultureInfo.InvariantCulture, $"state {counter}"), counter % 2 == 0);

    public static TestState CreateCacheState(int counter) => CreateState(counter) with { Flag = false };

    public static StepResult<TestState> CreateStep(
        int counter,
        string? checkpoint = null,
        bool irreversible = false,
        bool baseline = false
    ) =>
        new(
            CreateState(counter),
            checkpoint is null ? [] : [checkpoint],
            IsIrreversible: irreversible,
            IsBaseline: baseline
        );

    public static StepResult<TestState> CreateCacheStep(int counter) => new(CreateCacheState(counter));
}
