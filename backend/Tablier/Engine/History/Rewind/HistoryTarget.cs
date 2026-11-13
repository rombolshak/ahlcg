namespace Tablier.Engine.History.Rewind;

public sealed record HistoryTarget(string CheckpointId, int Version);
