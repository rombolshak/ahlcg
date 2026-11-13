namespace Tablier.Engine.History.Rewind;

public sealed record HistoryAction(int Version, string Actor);
