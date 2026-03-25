# Conventions

## Purpose
Naming conventions, file structure patterns, and quick navigation table by feature.

## When to Load
Read this when starting a new task, navigating the codebase, or enforcing consistency.

## Related Files
- [Architecture Overview](../02_architecture/overview.md) — System structure
- [All Implementation Files](../03_implementation) — Code patterns
- [Build & Release](../05_operations/build_and_release.md) — Build configuration

---

## Naming Conventions

### TypeScript (Frontend)

| Item | Pattern | Example |
|------|---------|---------|
| File | kebab-case | `game-state.store.ts` |
| Component | `ClassName + class` | `export class GameViewComponent` |
| File naming | Component files: `-component.ts`, stores: `.store.ts`, services: `.service.ts` | `card-list.component.ts`, `auth.service.ts` |
| Variable | camelCase | `let gameState = ...` |
| Constant | UPPER_SNAKE_CASE | `const MAX_PLAYERS = 4;` |
| Pipe | camelCase in code, kebab-case in template | `| healthFormat` template uses pipe registered as `HealthFormatPipe` |
| Selector | `app-` prefix for all components | `<app-game-view>` |
| Service | `service` suffix; injectable | `@Injectable() class GameService` |
| Store | `.store.ts` suffix using `signalStore()` | `export const gameStateStore = signalStore(...)` |
| Interface | `I` prefix (optional, but common) | `IGameState` or `GameState` (both acceptable) |
| Enum | PascalCase | `enum PlayerStatus { Active, Defeated, }` |

### C# (Backend)

| Item | Pattern | Example |
|------|---------|---------|
| File | PascalCase, matches class name | `AuthEndpoints.cs` (contains `AuthEndpoints` class) |
| Class | PascalCase | `public class AppUser` |
| Method | PascalCase | `public async Task LoginAsync()` |
| Property | PascalCase | `public string Email { get; set; }` |
| Local Variable | camelCase | `var userId = user.Id;` |
| Constant | UPPER_SNAKE_CASE or PascalCase | `const string DEFAULT_ROLE = "User";` |
| Interface | `I` prefix | `public interface IGameService` |
| Enum | PascalCase | `enum PlayerStatus { Active, Defeated }` |
| Async Method | `Async` suffix | `public async Task LoginAsync()` |
| Parameter | camelCase | `public void UpdateUser(string userId, AppUser user)` |

### SQL/EF Core

| Item | Pattern | Example |
|------|---------|---------|
| Table | PascalCase plural | `Users`, `GameSessions` |
| Column | PascalCase | `UserId`, `CreatedAt` |
| Foreign Key | `{EntityName}Id` | `UserId`, `ScenarioId` |
| Migration | Descriptive verb + date | `20251114145044_Initial.cs` |

---

## File Structure

### Frontend

```
frontend/src/
├── app/
│   ├── app.component.ts           # Root component
│   ├── app.config.ts              # App configuration (providers, etc.)
│   ├── app.routes.ts              # Route definitions
│   ├── transloco-loader.ts        # i18n setup
│   ├── pages/                     # Page-level (smart) components
│   │   ├── game-view/
│   │   │   ├── game-view.component.ts
│   │   │   ├── game-view.component.html
│   │   │   ├── game-view.component.css
│   │   │   └── store/
│   │   │       └── game-state.store.ts
│   │   └── main-menu/
│   │       ├── main-menu.component.ts
│   │       └── ...
│   └── shared/
│       ├── domain/                # DTOs, interfaces, enums
│       │   ├── app-user.ts
│       │   ├── game-state.ts
│       │   └── ...
│       ├── services/              # HTTP, SignalR, business logic
│       │   ├── auth.service.ts
│       │   ├── game.service.ts
│       │   └── ...
│       └── ui/                    # Presentational components
│           ├── card-list/
│           ├── player-card/
│           └── ...
├── public/
│   ├── assets/
│   │   ├── cards/                 # Card JSON definitions
│   │   ├── i18n/                  # Transloco language files
│   │   └── images/                # Images, icons
│   └── site.webmanifest
└── styles.css                     # Global styles (Tailwind)
```

**Key Rules:**
- Pages under `/pages` are smart (connected to store/API)
- Components under `/ui` are presentational (pure input/output)
- Services handle HTTP, SignalR, business logic
- Stores manage state (signal store)

### Backend

```
backend/
├── Ahlcg.ApiService/
│   ├── Program.cs                 # Startup, DI, middleware
│   ├── ApplicationDbContext.cs    # EF Core DbContext
│   ├── AuthEndpoints.cs           # Auth routes
│   ├── GameHub.cs                 # SignalR hub
│   ├── Models/                    # Domain entities
│   │   ├── AppUser.cs
│   │   ├── Investigator.cs
│   │   └── ...
│   ├── Services/                  # Business logic
│   │   ├── IGameService.cs
│   │   ├── GameService.cs
│   │   └── ...
│   ├── Dtos/                      # Request/response types
│   │   ├── AppUserDto.cs
│   │   └── ...
│   ├── Migrations/
│   │   ├── 20251114145044_Initial.cs
│   │   └── ...
│   └── appsettings.json
├── Ahlcg.AppHost/
│   ├── AppHost.cs                 # Orchestration (dev only)
│   └── appsettings.json
├── Ahlcg.Migrator/
│   ├── Program.cs                 # EF Core migration runner
│   └── Worker.cs
├── Ahlcg.ServiceDefaults/
│   ├── Extensions.cs              # Health checks, OTEL
│   └── ...
└── unit-tests/
    └── Ahlcg.ApiService.Tests/
        ├── AuthEndpointsTests.cs
        └── ...
```

**Key Rules:**
- Endpoints group related routes (`AuthEndpoints`, future `GameEndpoints`)
- Services implement business logic (dependency injection pattern)
- Models in `/Models` are domain entities
- DTOs in `/Dtos` are request/response types
- Migrations auto-generated; never edit manually

---

## By Feature: Quick Reference

Use this table to find files by feature:

| Feature | Frontend File | Backend File |
|---------|---------------|--------------|
| **Authentication** | `auth.service.ts`, `app-user.ts` | `AuthEndpoints.cs`, `AppUser.cs` |
| **Game State** | `game-state.store.ts` | `GameService.cs`, `GameSession.cs` |
| **Card Display** | `card-list.component.ts`, `card.ts` | Card JSON in `public/assets/cards/` |
| **Board UI** | `board.component.ts` | (None; UI-only) |
| **Player Status** | `player-card.component.ts` | `Investigator.cs`, `PlayerService.cs` |
| **Animations** | `game-view.component.ts` (GSAP Flip) | (None; frontend-only) |
| **Real-time Updates** | `game.service.ts` (SignalR client) | `GameHub.cs` (SignalR server) |
| **Localization** | `transloco-loader.ts`, `i18n/*.json` | (None; frontend-only) |
| **HTTP Requests** | `HttpClient` in services | Minimal API endpoints |
| **Database** | (None; frontend-only) | `ApplicationDbContext.cs`, migrations |
| **Tests (Frontend)** | `*.component.spec.ts` | (None) |
| **Tests (Backend)** | (None) | `Ahlcg.ApiService.Tests/*.cs` |

---

## Patterns & Best Practices

### Frontend

#### Component Structure

```typescript
// ✅ Smart component (connected to store)
@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, GameBoardComponent],
  template: `<app-game-board [gameState]="gameStore.state()"></app-game-board>`
})
export class GameViewComponent {
  gameStore = inject(GameStateStore);
  
  ngOnInit() {
    // Fetch initial state
    this.gameService.loadGame().subscribe(...);
  }
}

// ✅ Presentational component (pure input/output)
@Component({
  selector: 'app-game-board',
  standalone: true,
  inputs: ['gameState'],
  outputs: ['playerClicked']
})
export class GameBoardComponent {
  gameState = input.required<GameState>();
  playerClicked = output<PlayerId>();
}
```

#### Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly API = 'https://api.example.com';
  
  constructor(private http: HttpClient) {}
  
  loadGame(gameId: string) {
    return this.http.get<GameState>(`${this.API}/games/${gameId}`);
  }
}
```

#### Store Pattern (Signal Store)

```typescript
export const gameStateStore = signalStore(
  withState(() => ({ game: null as Game | null })),
  withMethods((store, gameService = inject(GameService)) => ({
    loadGame: async (gameId: string) => {
      const game = await gameService.loadGame(gameId).toPromise();
      patchState(store, { game });
    }
  }))
);
```

### Backend

#### Endpoint Pattern

```csharp
static class AuthEndpoints {
  public static void MapAuthEndpoints(this WebApplication app) {
    var group = app.MapGroup("/auth")
      .WithName("Auth")
      .WithOpenApi();
    
    group.MapPost("/login-anonymous", LoginAnonymouslyAsync)
      .WithSummary("Create anonymous account");
    
    group.MapPost("/logout", LogoutAsync)
      .RequireAuthorization();
  }
  
  static async Task<IResult> LoginAnonymouslyAsync(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    ILogger<Program> logger) {
    // Implementation
  }
}
```

#### Service Pattern

```csharp
public interface IGameService {
  Task<Game> GetGameAsync(string gameId);
  Task UpdateGameStateAsync(string gameId, GameState state);
}

@Injectable()
public class GameService : IGameService {
  private readonly ApplicationDbContext _db;
  private readonly ILogger<GameService> _logger;
  
  public GameService(ApplicationDbContext db, ILogger<GameService> logger) {
    _db = db;
    _logger = logger;
  }
  
  public async Task<Game> GetGameAsync(string gameId) {
    var game = await _db.Games.FindAsync(gameId);
    if (game == null) throw new InvalidOperationException("Game not found");
    return game;
  }
}
```

#### Entity Pattern

```csharp
public class Game : Entity {
  public string Id { get; set; } = Guid.NewGuid().ToString();
  public string ScenarioId { get; set; } // FK
  public Scenario Scenario { get; set; } // Navigation
  public List<Investigator> Investigators { get; set; } = new();
  public GameState CurrentState { get; set; } = new();
  
  public void StartNewTurn() {
    if (CurrentState.IsActive) throw new InvalidOperationException();
    CurrentState.TurnNumber++;
  }
}
```

---

## Code Style

### TypeScript/Angular

```typescript
// ✅ DO
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MyService {
  constructor(private http: HttpClient) {}
  
  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data');
  }
}

// ❌ DON'T
export class BadService {
  http: HttpClient; // Missing @Injectable
  
  constructor(http: HttpClient) {
    this.http = http; // Verbose assignment
  }
  
  getData() { // Untyped return
    return this.http.get('/api/data');
  }
}
```

### C#/.NET

```csharp
// ✅ DO
public async Task<IResult> HandleRequestAsync(string id) {
  var item = await _db.Items.FindAsync(id);
  ArgumentNullException.ThrowIfNull(item);
  return Results.Ok(new ItemDto(item));
}

// ❌ DON'T
public IResult HandleRequest(string id) { // Blocking sync call
  var item = _db.Items.FirstOrDefault(x => x.Id == id);
  if (item == null) return Results.NotFound(); // No validation exception
  return Results.Ok(item); // Exposing entity instead of DTO
}
```

---

## Git & Version Control

### Branching Strategy

```
main
├── feature/auth-improvement          # Feature branch
├── bugfix/login-timeout              # Bug fix branch
└── docs/update-api-reference         # Docs branch

PR → Merge to main → Tag release
```

**Branch Naming:**
- `feature/description` — New feature
- `bugfix/issue-number` — Bug fix
- `docs/description` — Documentation only
- `refactor/description` — No behavior change

### Commit Messages

```
# ✅ Good
commit "feat: implement anonymous login flow"
commit "fix: prevent cookie expiration on each request"
commit "docs: update API reference for game state endpoint"
commit "test: add unit tests for GameService"

# ❌ Bad
commit "update"
commit "fix bug"
commit "wip"
commit "final version"
```

**Format:** `type: description`

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`

### Husky Hooks

Automatically enforced on commit:
- Lint frontend changes
- Format staged files
- Type check before push

---

## Testing Conventions

### Frontend

```typescript
// ✅ Test file naming
game-state.store.spec.ts  // Matches store file

// ✅ Test structure
describe('GameStateStore', () => {
  let store: typeof GameStateStore;
  
  beforeEach(() => {
    // Setup
    store = TestBed.inject(GameStateStore);
  });
  
  it('should initialize with empty game', () => {
    expect(store.game()).toBeNull();
  });
});
```

### Backend

```csharp
// ✅ Test file naming
AuthEndpointsTests.cs  // Matches endpoint class

// ✅ Test structure
public class AuthEndpointsTests {
  [Fact]
  public async Task LoginAnonymously_NotLoggedIn_CreatesAccount() {
    // Arrange
    var mockUserManager = new Mock<UserManager<AppUser>>();
    
    // Act
    var result = await AuthEndpoints.LoginAnonymouslyAsync(
      mockUserManager.Object, ...);
    
    // Assert
    Assert.NotNull(result);
  }
}
```

---

## Configuration Files

### Frontend

| File | Purpose |
|------|---------|
| `angular.json` | Angular CLI config (routing, build) |
| `tsconfig.json` | TypeScript compiler config |
| `eslint.config.js` | ESLint rules |
| `karma.conf.cjs` | Test runner (Jasmine) |
| `package.json` | Dependencies, scripts |

### Backend

| File | Purpose |
|------|---------|
| `Ahlcg.sln` | Solution file (all projects) |
| `.csproj` | Project file (dependencies, compile options) |
| `appsettings.json` | Configuration (non-dev) |
| `appsettings.Development.json` | Development overrides |

---

## Common Tasks Quick Link

| Task | Go to | File(s) |
|------|-------|---------|
| Add new auth endpoint | Backend Services | [AuthEndpoints.cs](../../backend/Ahlcg.ApiService/AuthEndpoints.cs) |
| Add new page | Frontend Structure | `frontend/src/app/pages/` + implement component |
| Add new database table | Backend Persistence | [Migrations](../03_implementation/backend/persistence.md) |
| Fix TypeScript error | Frontend UI Patterns | [tsconfig.json](../../frontend/tsconfig.json) |
| Debug failing test | Testing | Test file + [Testing Strategy](../04_testing/strategy.md) |
| Setup CI secret | Build & Release | [GitHub Actions](../../.github/workflows/) |
| Configure CORS | Security | [Program.cs](../../backend/Ahlcg.ApiService/Program.cs) |
| Add translation | Frontend UI Patterns | `frontend/public/assets/i18n/*.json` |
| Review API contract | API Reference | This file or [Swagger UI](https://localhost:5001/scalar/v1) |

---

## Useful Commands

```bash
# Frontend
npm start                      # Dev server
npm run build                  # Production build
npm run test                   # Run tests
npm run lint:all              # All linters
npm run format                # Auto-format code

# Backend
dotnet build                  # Compile
dotnet test                   # Run tests
dotnet run                    # Run API
dotnet ef migrations add NAME # Create migration

# Docker (future)
docker build -t ahlcg-api backend/
docker run -p 5001:5001 ahlcg-api
```
