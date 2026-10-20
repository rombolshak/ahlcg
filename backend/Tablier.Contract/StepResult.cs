namespace Tablier.Contract;

public sealed record StepResult<TState>(
    TState State,
    string? Checkpoint = null,
    bool IsIrreversible = false,
    bool IsBaseline = false);
