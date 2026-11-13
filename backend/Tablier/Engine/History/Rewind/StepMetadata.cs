namespace Tablier.Engine.History.Rewind;

public sealed record StepMetadata(
    int Version,
    IReadOnlyList<string> Checkpoints,
    string? Actor = null,
    bool IsBarrier = false
);
