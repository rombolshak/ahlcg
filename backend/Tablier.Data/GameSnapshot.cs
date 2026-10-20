using System.Text.Json;

namespace Tablier.Data;

public class GameSnapshot
{
    public Guid GameId { get; set; }
    public int Version { get; set; }
    public required JsonDocument State { get; set; }
    public int SchemaVersion { get; set; }
}
