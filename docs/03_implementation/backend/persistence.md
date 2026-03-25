# Persistence Layer

## Purpose
Describes Entity Framework Core setup, migrations, database schemas, and data access patterns.

## When to Load
Read this when modifying the database schema, running migrations, or working with EF Core queries.

## Related Files
- [Backend Architecture](../../02_architecture/backend.md) — Database layer overview
- [Domain Model](./domain_model.md) — Entities mapped to database
- [Backend Services](./services.md) — LINQ queries in services
- [Build & Release](../../05_operations/build_and_release.md) — How migrations run in CI
- [Backend Testing](../../04_testing/backend.md) — Testing with test databases

---

## Entity Framework Core Setup

Configured in `Program.cs`:

```csharp
// Add DbContext
builder.AddNpgsqlDbContext<ApplicationDbContext>("ahlcg");
```

**Connection String** in appsettings.Development.json.
**Production:** Use environment variables or KeyVault, NOT source code.

---

## DbContext

Located: `backend/Ahlcg.ApiService/ApplicationDbContext.cs`

**Inheritance:**
- `IdentityDbContext<AppUser>` — Provides Identity schema + custom migrations
- Tables created by Identity: `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, etc.

---

## Migrations

Migrations are auto-generated change scripts that evolve the schema.

### Current Migrations

Located: `backend/Ahlcg.ApiService/Migrations/`

1. **20251114145044_Initial.cs** — Identity schema setup
2. **20251114153547_User_AddIsAnonymous.cs** — Add `IsAnonymous` column to `AspNetUsers`
3. **ApplicationDbContextModelSnapshot.cs** — Current schema snapshot (auto-generated)

### Creating a New Migration

When you add/modify a domain entity:

```bash
# From backend/ folder
dotnet ef migrations add {MigrationName} 

# Example: Add Deck table
dotnet ef migrations add AddDeckTable 
```

This generates a migration file.

### Applying Migrations

**Local Development:**

Migrations applied automatically by Migrator service when AppHost starts.

**Manual (if needed):**

```bash
dotnet ef database update 
```

**Specific migration:**

```bash
dotnet ef database update AddDeckTable
```

**Revert last migration:**

```bash
dotnet ef database update PreviousMigration
```

**Production:** Via deployment pipeline (not yet defined).

---

## Current Schema

See **backend/Ahlcg.ApiService/Migrations/ApplicationDbContextModelSnapshot.cs**

---

## Querying with LINQ

### Examples

**Single entity lookup:**

```csharp
var user = await _db.Users.FindAsync(userId);
if (user == null) return NotFound();
return Ok(user);
```

**Filtered query:**

```csharp
var decks = await _db.Decks
  .Where(d => d.UserId == userId)
  .OrderByDescending(d => d.CreatedAt)
  .ToListAsync();
```

**Join across tables:**

```csharp
var usersWithDecks = await _db.Users
  .Include(u => u.Decks)  // Eager load
  .Where(u => u.Decks.Count > 0)
  .ToListAsync();
```

**Projection (selecting specific columns):**

```csharp
var deckNames = await _db.Decks
  .Where(d => d.UserId == userId)
  .Select(d => new { d.Id, d.Name })
  .ToListAsync();
```

**Aggregation:**

```csharp
var deckCount = await _db.Decks
  .Where(d => d.UserId == userId)
  .CountAsync();
```

---

## Relationships & Foreign Keys

---

## Change Tracking

EF Core tracks changes to entities:

```csharp
var user = await _db.Users.FindAsync(userId);

// Modify property
user.Email = "new@example.com";

// EF tracks this as a change
await _db.SaveChangesAsync();  // UPDATE query issued

// Verify tracked state
var entry = _db.Entry(user);
var state = entry.State;  // Modified, Added, Deleted, Unchanged, Detached
```

### Explicit SaveChanges

Batch multiple operations:

```csharp
var user = await _db.Users.FindAsync(userId);
user.Email = "new@example.com";

var deck = new Deck { UserId = userId, Name = "New Deck" };
_db.Decks.Add(deck);

// Issue both UPDATE and INSERT in single transaction
await _db.SaveChangesAsync();
```

---

## Connection Pooling

Configured automatically by `AddNpgsqlDbContext`:

```csharp
// Customization (optional):
builder.Services.AddDbContextPool<ApplicationDbContext>(options => {
  options.UseNpgsql("connection_string");
}, poolSize: 128);  // Pool up to 128 connections
```

Benefits:
- Reuses connections (faster than creating new)
- Limits concurrent connections
- Prevents connection exhaustion

---

## Indexing

Define indexes in `OnModelCreating`:

```csharp
// Single column index
modelBuilder.Entity<Deck>()
  .HasIndex(d => d.UserId)
  .HasName("IX_Decks_UserId");

// Composite index
modelBuilder.Entity<GameSession>()
  .HasIndex(g => new { g.ScenarioId, g.CreatedAt })
  .HasName("IX_Games_ScenarioId_CreatedAt");

// Unique index
modelBuilder.Entity<AppUser>()
  .HasIndex(u => u.Email)
  .IsUnique()
  .HasName("IX_Users_Email_Unique");
```

Generated migration:

```sql
CREATE INDEX "IX_Decks_UserId" ON public."Decks" ("UserId");
CREATE UNIQUE INDEX "IX_Users_Email_Unique" ON public."AspNetUsers" ("NormalizedEmail");
```

---

## Transactions

Explicit transaction control:

```csharp
using (var transaction = await _db.Database.BeginTransactionAsync()) {
  try {
    var user = await _db.Users.FindAsync(userId);
    user.Email = "new@example.com";
    
    var deck = new Deck { UserId = userId, Name = "Deck" };
    _db.Decks.Add(deck);
    
    await _db.SaveChangesAsync();
    await transaction.CommitAsync();
  }
  catch (Exception) {
    await transaction.RollbackAsync();
    throw;
  }
}
```

For simple SaveChangesAsync(), EF wraps in transaction automatically.

---

## Query Performance

### Eager vs. Lazy Loading

**Eager loading** (recommended):

```csharp
var decks = await _db.Decks
  .Include(d => d.Cards)  // Load cards upfront
  .ToListAsync();
// Single query if using one-to-many, but larger result set
```

**Lazy loading** (can cause N+1 problems):

```csharp
var decks = await _db.Decks.ToListAsync();
foreach (var deck in decks) {
  var cards = deck.Cards;  // Separate query per deck (N queries total)
}
```

**Explicit loading:**

```csharp
var deck = await _db.Decks.FindAsync(id);
await _db.Entry(deck).Collection(d => d.Cards).LoadAsync();
```

### SELECT Only Needed Columns

```csharp
// Instead of loading full entities:
var deckNames = await _db.Decks
  .Where(d => d.UserId == userId)
  .Select(d => new { d.Id, d.Name })  // Only 2 columns
  .ToListAsync();
```

### Database-Level Filtering

```csharp
// Good: Filter in database
var activeGames = await _db.GameSessions
  .Where(g => g.Status == "in_progress")
  .ToListAsync();

// Bad: Load all, filter in memory
var activeGames = (await _db.GameSessions.ToListAsync())
  .Where(g => g.Status == "in_progress")
  .ToList();
```

---

## Seeding Data

Seed initial data in migrations or `OnModelCreating`:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder) {
  base.OnModelCreating(modelBuilder);
  
  // Seed scenarios (if not user-generated)
  modelBuilder.Entity<Scenario>().HasData(
    new Scenario {
      Id = "tg-01",
      Name = "The Gathering",
      Campaign = "core",
      MinInvestigators = 1,
      MaxInvestigators = 4,
    },
    new Scenario {
      Id = "tg-02",
      Name = "The Midnight Masks",
      Campaign = "core",
      MinInvestigators = 1,
      MaxInvestigators = 4,
    }
  );
}
```

---

## Testing with EF Core

Use in-memory or test database:

```csharp
[Fact]
public async Task CreateDeck_SavesAndRetrievable() {
  // Arrange
  var options = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseInMemoryDatabase("test-db-" + Guid.NewGuid())
    .Options;
  
  using (var context = new ApplicationDbContext(options)) {
    var deck = new Deck { Id = "deck-1", UserId = "user-1", Name = "Test" };
    context.Decks.Add(deck);
    await context.SaveChangesAsync();
  }
  
  // Act & Assert
  using (var context = new ApplicationDbContext(options)) {
    var retrieved = await context.Decks.FindAsync("deck-1");
    Assert.NotNull(retrieved);
    Assert.Equal("Test", retrieved.Name);
  }
}
```

---

## Future Considerations

- **Sharding:** Split large tables by user or game ID for horizontal scalability
- **Read Replicas:** Separate read-only replicas for reporting queries
- **Archival:** Move old games to archive table after conclusion
- **Denormalization:** Cache frequently-accessed computed values
- **Event Sourcing:** Store events instead of just final state
