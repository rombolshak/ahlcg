namespace Tablier.Engine.History.Live;

internal sealed record LiveFact(
    string Kind,
    bool Valid,
    int BarrierVersion,
    int Version,
    int SourceVersion,
    string? Actor,
    string? Action,
    string? Tag
);
