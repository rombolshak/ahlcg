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
    public bool IsIrreversible { get; set; }
    public bool IsBaseline { get; set; }
}
