namespace Tablier.Contract;

public sealed record StepResult<TState>(TState State, string? Checkpoint, bool Irreversible);
