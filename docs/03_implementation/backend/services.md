# Backend Services

## Purpose
Describes how to create API endpoints, structure business logic, and handle requests in the backend.

## When to Load
Read this when implementing new endpoints, adding service logic, or understanding request/response flow.

## Related Files
- [Backend Architecture](../../02_architecture/backend.md) — Service overview
- [Domain Model](./domain_model.md) — Entities used by services
- [Persistence Layer](./persistence.md) — Database access patterns
- [API Reference](../../99_reference/api.md) — Complete endpoint specs
- [Backend Testing](../../04_testing/backend.md) — Testing service logic

---

## Endpoint Structure

All endpoints are registered in `Program.cs`.

Each route group is implemented in a separate file (e.g., `AuthEndpoints.cs`, future: `GameEndpoints.cs`).

---

## Example: Authentication Endpoints

Implemented in `AuthEndpoints.cs`.

---

## Service Layer Pattern (Aspirational)

The current codebase mostly uses direct endpoint handlers via `MapPost`/`MapGet` patterns (see `AuthEndpoints.cs`, `Program.cs`).

The service layer pattern below is provided as a recommended future refactor to isolate business logic and improve testability.

```csharp
public interface IGameService { /* ... */ }
public class GameService : IGameService { /* ... implementation */ }
```

**Register in Program.cs:**

```csharp
builder.Services.AddScoped<IGameService, GameService>();
```

**Use in endpoint:**

```csharp
app.MapPost("games", async (CreateGameRequest req, IGameService gameService, HttpContext context) => {
  var userId = context.User.FindFirst("sub")?.Value
    ?? throw new InvalidOperationException("User not found");
  
  var game = await gameService.CreateGameAsync(req.ScenarioId, userId, context.RequestAborted);
  return Results.Created($"/games/{game.Id}", game);
})
.RequireAuthorization()
.WithName("CreateGame")
.WithOpenApi();
```

**Current implementation style** in this repo uses direct route handlers in `AuthEndpoints.cs`.

---

## Error Handling

Standard error response using ProblemDetails (RFC 7807):

---

## Input Validation

Using annotations and FluentValidation:

```csharp
public class CreateGameRequest {
  [Required]
  [StringLength(36, MinimumLength = 36)]  // UUID length
  public string ScenarioId { get; set; }
}

// Or FluentValidation:
public class CreateGameRequestValidator : AbstractValidator<CreateGameRequest> {
  public CreateGameRequestValidator() {
    RuleFor(x => x.ScenarioId)
      .NotEmpty()
      .Matches(@"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
      .WithMessage("ScenarioId must be a valid UUID");
  }
}

// In Program.cs
builder.Services.AddValidation();

// In endpoint (automatic validation)
app.MapPost("games", CreateGame)
  .Validate<CreateGameRequest>();
```

---

## Logging & Diagnostics

Structured logging:

```csharp
private readonly ILogger<GameService> _logger;

public async Task MethodAsync(string gameId) {
  _logger.LogInformation("Loading game {GameId}", gameId);
  
  try {
    var game = await _db.GameSessions.FindAsync(gameId);
    if (game == null) {
      _logger.LogWarning("Game {GameId} not found", gameId);
      return null;
    }
    
    _logger.LogInformation("Loaded game {GameId} with {ParticipantCount} participants",
      gameId, game.Participants.Count);
    
    return game;
  }
  catch (Exception ex) {
    _logger.LogError(ex, "Failed to load game {GameId}", gameId);
    throw;
  }
}
```

**Structured Logging Benefits:**
- Machine-readable (JSON logs)
- Searchable in log aggregation tools
- Performance context (request ID, user, timing)

---

## Async/Await Best Practices

All I/O operations are async:

```csharp
// ✅ Good
private async Task<User> GetUserAsync(string id) {
  return await _db.Users.FindAsync(id);
}

// ❌ Bad
private User GetUser(string id) {
  return _db.Users.Find(id);  // Blocks thread
}

// Use in endpoint
app.MapGet("users/{id}", async (string id, IUserService service) => {
  var user = await service.GetUserAsync(id);
  return user == null ? Results.NotFound() : Results.Ok(user);
});
```

---

## Dependency Injection

Register services in `Program.cs`:

```csharp
// Scoped: New instance per HTTP request
builder.Services.AddScoped<IGameService, GameService>();

// Transient: New instance every time
builder.Services.AddTransient<ITimestampService, UtcTimestampService>();

// Singleton: Single instance for app lifetime
builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();
```

**Inject in endpoint:**

```csharp
app.MapGet("games/{id}", async (
  string id,
  IGameService gameService,
  ILogger<Program> logger) => {
  
  logger.LogInformation("Fetching game {Id}", id);
  return await gameService.GetGameAsync(id);
});
```

---

## Content Negotiation

Accept multiple formats (JSON, XML, etc):

```csharp
// In Program.cs
builder.Services.AddControllers()
  .AddXmlDataContractSerializerFormatters();  // Enable XML support

// Endpoint automatically negotiates based on Accept header
app.MapGet("games/{id}", GetGame)
  .Produces<GameDto>(contentType: "application/json")
  .Produces<GameDto>(contentType: "application/xml");
```

---

## Testing Services

Unit test example:

```csharp
[Fact]
public async Task CreateGameAsync_CreatesGameWithHost() {
  // Arrange
  var db = new MockApplicationDbContext();
  var logger = new Mock<ILogger<GameService>>();
  var service = new GameService(db, logger.Object);
  
  // Act
  var game = await service.CreateGameAsync("scenario-1", "user-1", CancellationToken.None);
  
  // Assert
  Assert.NotNull(game);
  Assert.Equal("scenario-1", game.ScenarioId);
  Assert.Single(game.Participants);
  Assert.True(game.Participants.First().IsHost);
}
```

---

## OpenAPI Integration

Swagger documentation:

```csharp
app.MapGet("games/{id}", GetGame)
  .WithName("GetGame")
  .WithOpenApi()
  .WithSummary("Retrieve a game session")
  .WithDescription("Fetch details of a specific game session")
  .WithParameterValidation()
  .Produces<GameDto>(StatusCodes.Status200OK)
  .Produces(StatusCodes.Status404NotFound)
  .ProducesProblem(StatusCodes.Status500InternalServerError);
```

Visit `/openapi/v1.json` (dev) to see full API spec.
Interactive docs at `/scalar/v1` (dev).
