namespace Tablier.Contract;

public sealed record StepResult<TState>(
    TState State,
    IReadOnlyList<string> Checkpoints,
    bool IsIrreversible = false,
    bool IsBaseline = false
)
{
    public StepResult(TState state)
        : this(state, []) { }
}
