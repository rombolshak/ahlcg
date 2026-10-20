namespace Tablier.Contract;

public sealed record StepResult<TState>(
    TState State,
    string? Checkpoint = null,
    bool Irreversible = false,
    bool Baseline = false);
