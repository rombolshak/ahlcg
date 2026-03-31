# Domain Model

## Purpose
Describes the core domain entities, their relationships, and validation rules.

## When to Load
Read this when designing new domain entities, adding validation logic, or understanding business rules.

## Related Files
- [Backend Architecture](../../02_architecture/backend.md) — Service structure
- [Backend Services](./services.md) — Endpoints that use these entities
- [Persistence Layer](./persistence.md) — How entities are stored
- [Backend Testing](../../04_testing/backend.md) — Testing domain logic

---

## Current Domain

Currently, only **Identity** is implemented. Domain entities are planned.

### Implemented: AppUser (Identity)

Located: `backend/Ahlcg.ApiService/AuthEndpoints.cs`

```csharp
public class AppUser : IdentityUser {
  public bool IsAnonymous { get; set; }
}
```

**Properties:**
- `Id` (from IdentityUser) — Unique user identifier
- `Email` — User email address (null for anonymous)
- `UserName` — Username (null for anonymous)
- `PasswordHash` — Hashed password (null for anonymous)
- `IsAnonymous` (custom) — Flag for temporary accounts

**Validation:**
- Email must be unique (if set)
- Password must meet complexity requirements (8+ chars, mixed case, numbers, special)
- Anonymous accounts must be upgraded before email is set

**Lifecycle:**
1. **Create:** Anonymous login creates with `IsAnonymous = true`, no email/password
2. **Upgrade:** Optional email/password added, `IsAnonymous = false`
3. **Delete:** On logout if still anonymous
4. **Persist:** Forever if permanent account

---

## Validation Patterns

### Property-Level Validation

Using data annotations:

```csharp
public class Investigator {
  [Required]
  [StringLength(100, MinimumLength = 1)]
  public string Name { get; set; }
  
  [Range(0, 100)]
  public int Health { get; set; }
}
```

### Custom Validation Logic

In service methods:

```csharp
public class GameService {
  public async Task<Result> CanPlayerJoinGame(string userId, string gameId) {
    var game = await _db.GameSessions.FindAsync(gameId);
    if (game == null) return Result.Failure("Game not found");
    
    if (game.Participants.Count >= game.MaxParticipants) {
      return Result.Failure("Game is full");
    }
    
    if (game.Status != "setup") {
      return Result.Failure("Game has already started");
    }
    
    return Result.Success();
  }
}
```

### Domain Validations (Invariants)

Methods that enforce business rules:

```csharp
public class Investigator {
  public void TakeDamage(int amount) {
    if (amount < 0) throw new InvalidOperationException("Damage cannot be negative");
    
    Health -= amount;
    
    if (Health <= 0) {
      Status = "defeated";
      // Trigger other effects, e.g., shuffle into discard
    }
  }
  
  public bool CanActThisTurn(GameState gameState) {
    return Status == "active" 
      && gameState.CurrentPhase == "action"
      && gameState.ActiveInvestigatorId == this.Id;
  }
}
```

---

## Relationships

---

## Serialization (JSON)

For API contracts and SignalR transmission:

---

## Future: Event Sourcing

Consider event sourcing for game state changes:

Benefits:
- Complete audit trail
- Easy to replay games
- Supports temporal queries ("What was the state at turn 5?")

---

## Constraints & Future Considerations

- **Large State Blobs:** Storing entire game state as JSON in a single column is simple but doesn't scale to complex queries; consider normalization later
- **Optimistic Locking:** Game state changes may conflict if multiple clients submit actions; add version/timestamp for conflict detection
- **Invariants:** Implement domain validation in constructors/methods, not just database constraints
- **Transactions:** Multi-step operations (e.g., "play card + apply effect") need ACID guarantees
