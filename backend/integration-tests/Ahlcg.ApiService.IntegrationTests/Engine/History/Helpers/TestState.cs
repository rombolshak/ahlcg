using Tablier.Contract;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;

internal sealed record TestState(int Counter, string Label, bool Flag = false) : ISchemaVersioned
{
    public int SchemaVersion => 1;
}
