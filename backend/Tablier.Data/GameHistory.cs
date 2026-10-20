using System.Text.Json;

namespace Tablier.Data;

public class GameStep
{
    public Guid GameId { get; set; }
    public int Version { get; set; }
    public string? Actor { get; set; }
    public string? Action { get; set; }
    public required JsonDocument Patch { get; set; }
    public string? Checkpoint { get; set; }
    public bool Irreversible { get; set; }
    public bool Baseline { get; set; }
}

public class GameSnapshot
{
    public Guid GameId { get; set; }
    public int Version { get; set; }
    public required JsonDocument State { get; set; }
    public int SchemaVersion { get; set; }
}
