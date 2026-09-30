using System.Text.Json;

namespace Tablier.Data;

public class Game
{
    public Guid Id { get; set; }
    public required string OwnerId { get; set; }
    public AppUser? Owner { get; set; }
    public required string IdempotencyKey { get; set; }
    public required JsonDocument Configuration { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int IntendedPlayersCount { get; set; } = 1;
    public ICollection<GameMember> Members { get; } = [];
}

public class GameMember
{
    public Guid GameId { get; set; }
    public Game? Game { get; set; }
    public required string UserId { get; set; }
    public AppUser? User { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset LastPlayedAt { get; set; }
}
