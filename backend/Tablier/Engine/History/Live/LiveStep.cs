namespace Tablier.Engine.History.Live;

internal sealed record LiveStep(
    int Version,
    int? RestoredVersion,
    string? Actor,
    string? Action,
    string[] Checkpoints,
    bool IsBaseline,
    bool IsIrreversible
);
