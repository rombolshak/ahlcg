using Tablier.Data;

namespace Tablier.Engine.Execution;

internal abstract record CreateGameResult
{
    internal sealed record Created(Game Game) : CreateGameResult;

    internal sealed record InvalidConfiguration(bool IsMissing) : CreateGameResult;
}
