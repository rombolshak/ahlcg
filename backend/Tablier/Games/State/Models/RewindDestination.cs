namespace Tablier.Games.State.Models;

public sealed record RewindDestination(string Kind, int Version, string? CheckpointId);
