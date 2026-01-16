# Architecture

This document describes Ahlcg’s runtime components, data flow, public endpoints, and notable architectural patterns. Each claim includes evidence drawn directly from the repository (path and short snippet). Where something is not explicit, it is marked as INFERENCE with a confidence note.

## 1) Components

### 1.1 Frontend (Angular SPA)
- Purpose: UI rendering, game-state visualization and interaction, local validation of domain models, internationalization, and component/stories development.
- Key elements:
  - Routing and lazy-loaded pages:
    - Path: frontend/src/app/app.routes.ts
    - Snippet: `path: '', ... loadComponent: () => import('pages/main-menu/main-menu.component') ...` and `path: 'game/:id', ...`
  - Game state store with signals, RFC6902 patches, and animations:
    - Path: frontend/src/app/pages/game-view/store/game-state.store.ts
    - Snippet: `export const GameStateStore = signalStore(... withMethods({ setState, updateState }))`
  - Domain model and strict validation via arktype:
    - Path: frontend/src/app/shared/domain/game-state.ts
    - Snippet: `export const gameState = type({...}).narrow((state, ctx) => {...});`
  - Application providers and i18n:
    - Path: frontend/src/app/app.config.ts
    - Snippet: `provideTransloco({ config: {...}, loader: TranslocoHttpLoader })`
- INFERENCE: The SPA currently runs on test data and is not yet wired to backend APIs or SignalR. Certainty: high.
  - Path: frontend/src/app/pages/game-view/game-view.component.ts
  - Snippet: `ngOnInit() { this.gameState.setState(testGameState); }`

### 1.2 Backend API (ASP.NET Core Minimal APIs)
- Purpose: Identity/authentication, (future) domain APIs, real-time hub, observability, and health checks.
- Entrypoint and service wiring:
  - Path: backend/Ahlcg.ApiService/Program.cs
  - Snippet: `.AddNpgsqlDbContext<ApplicationDbContext>("ahlcg"); ... app.MapHub<GameHub>("/game"); app.MapGroup("auth").MapAuthEndpoints()`
- Authentication endpoints (route group "auth"):
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `group.MapGet("info", GetCurrentUser).RequireAuthorization(); group.MapPost("loginAnonymously", ...); group.MapPost("linkCredentials", ...).RequireAuthorization(); group.MapPost("logout", Logout);`
- Identity + EF Core (PostgreSQL):
  - Path: backend/Ahlcg.ApiService/ApplicationDbContext.cs
  - Snippet: `: IdentityDbContext<AppUser>(options);`
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `public class AppUser : IdentityUser { public bool IsAnonymous { get; set; } }`
  - Path: backend/Ahlcg.ApiService/Migrations/*
  - Snippet: Identity tables + `IsAnonymous` migration column
- OpenAPI/Scalar (dev only) and developer exception page:
  - Path: backend/Ahlcg.ApiService/Program.cs
  - Snippet: `if (app.Environment.IsDevelopment()) { app.MapOpenApi(); app.MapScalarApiReference(); app.UseDeveloperExceptionPage(); }`

### 1.3 Real-time Hub (SignalR)
- Purpose: Bi-directional updates (future). Currently includes a demo method.
- Path: backend/Ahlcg.ApiService/GameHub.cs
- Snippet: `[Authorize] public class GameHub : Hub { public async Task Ping() => await Clients.Caller.SendAsync("ping", DateTime.UtcNow); }`

### 1.4 Database Migrator (BackgroundService)
- Purpose: Applies EF Core migrations at startup (idempotent strategy) and then stops.
- Path: backend/Ahlcg.Migrator/Worker.cs
- Snippet: `await dbContext.Database.MigrateAsync(cancellationToken); hostApplicationLifetime.StopApplication();`

### 1.5 AppHost (.NET Aspire)
- Purpose: Local orchestration of Postgres (+PgAdmin), Migrator, API, and Frontend dev server.
- Path: backend/Ahlcg.AppHost/AppHost.cs
- Snippet: `builder.AddPostgres(...).AddDatabase("ahlcg"); ... AddProject<Ahlcg_Migrator>(...) ... AddProject<Ahlcg_ApiService>(...) ... AddViteApp("webfrontend", "../../frontend", "start")`
- INFERENCE: `AddViteApp(..., "start")` runs `npm run start` which maps to Angular’s `ng serve`. Certainty: medium (works as a generic npm app runner here).

### 1.6 Service Defaults (Observability, Health, Resilience)
- Purpose: Adds OpenTelemetry (traces/metrics/logging), health checks (dev), service discovery and HTTP resilience.
- Path: backend/Ahlcg.ServiceDefaults/Extensions.cs
- Snippet: `builder.Services.AddOpenTelemetry().WithMetrics(...).WithTracing(... .AddSignalRInstrumentation()); app.MapHealthChecks("/health"); app.MapHealthChecks("/alive", ...)`


## 2) Data Flow and Interactions

### 2.1 Authentication Flow
- Anonymous login:
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `LoginAnonymously` creates an `AppUser { IsAnonymous = true }` and signs in.
- Linking credentials to upgrade:
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `LinkCredentials` validates the current anonymous session, optionally merges with an existing permanent user, or upgrades the anonymous account by setting email/username/password.
- Logout behavior:
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `Logout` deletes the account if it is anonymous, then signs out.
- Current user info:
  - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - Snippet: `GetCurrentUser` returns `UserDto(Email, IsAnonymous)`, `401` when not authenticated.

Sequence (simplified):
1) Client calls POST `/auth/loginAnonymously` → receives auth cookie; app session begins.
2) Client optionally calls POST `/auth/linkCredentials` while authenticated as anonymous → becomes permanent.
3) Client calls GET `/auth/info` to get profile data.
4) Client calls POST `/auth/logout` → signs out (and deletes if anonymous).

### 2.2 Real-time Hub (/game)
- INFERENCE: The hub is prepared for future real-time collaboration (e.g., pushing state changes, notifications). Currently only `Ping()` exists. Certainty: high (stub present).

### 2.3 Frontend Game State Lifecycle
- Initial state:
  - Path: frontend/src/app/pages/game-view/game-view.component.ts
  - Snippet: `ngOnInit() { this.gameState.setState(testGameState); }`
- Validation on transitions:
  - Path: frontend/src/app/pages/game-view/store/game-state.store.ts
  - Snippet: `validateState(newState);`
  - Path: frontend/src/app/shared/domain/game-state.ts
  - Snippet: `export const gameState = type({...}).narrow((state, ctx) => {...});`
- Applying changes:
  - Path: frontend/src/app/pages/game-view/store/game-state.store.ts
  - Snippet: `updateState(changes: Operation[]): ... applyPatch(draft, changes) ... GSAP Flip animation`

INFERENCE: A future integration will replace local test data with server-driven updates (REST and/or SignalR), reusing the same patch/animation workflow. Certainty: medium.

### 2.4 Persistence
- The backend uses EF Core with PostgreSQL. Migrations define an Identity schema and `IsAnonymous` on `AspNetUsers`. No domain tables yet.
- Paths: backend/Ahlcg.ApiService/Migrations/*


## 3) Endpoints and Contracts

### 3.1 REST (Minimal APIs)
- Auth route group (`/auth`):
  - GET `/auth/info`
    - Returns: 200 with `{ email, isAnonymous }` when signed-in; 401 otherwise.
    - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - POST `/auth/loginAnonymously`
    - Side effects: Creates anonymous user; signs in; returns 200 or 400 when already logged in or creation fails.
    - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - POST `/auth/linkCredentials` (requires auth)
    - Side effects: Upgrades anonymous user to permanent, or merges with existing account after password check; returns 200/403/400.
    - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs
  - POST `/auth/logout`
    - Side effects: Signs out; deletes account if anonymous.
    - Path: backend/Ahlcg.ApiService/AuthEndpoints.cs

- Health (dev only):
  - GET `/health` (readiness) and `/alive` (liveness)
  - Path: backend/Ahlcg.ServiceDefaults/Extensions.cs

- OpenAPI & Scalar UI (dev only):
  - Path: backend/Ahlcg.ApiService/Program.cs
  - Snippet: `app.MapOpenApi(); app.MapScalarApiReference();`

### 3.2 SignalR
- Hub route: `/game`
- Server → client event (demo): sends `"ping"` with `DateTime.UtcNow`
- Authorization: Required for connection.
- Path: backend/Ahlcg.ApiService/GameHub.cs

### 3.3 Frontend integration (current and future)
- Current: Uses local `testGameState` and deterministic UI animations for state changes.
- Future (INFERENCE): Will subscribe to `/game` hub and/or call REST endpoints for domain actions, applying RFC6902 patches client-side. Certainty: medium.


## 4) Observability and Health

- OpenTelemetry:
  - Metrics: ASP.NET Core, HTTP client, runtime
  - Tracing: ASP.NET Core (filters out health checks), HTTP client, SignalR
  - Path: backend/Ahlcg.ServiceDefaults/Extensions.cs
- Health checks (dev only):
  - `/health` and `/alive` endpoints
  - Path: backend/Ahlcg.ServiceDefaults/Extensions.cs
- OTLP exporter:
  - Controlled by `OTEL_EXPORTER_OTLP_ENDPOINT` config
  - Path: backend/Ahlcg.ServiceDefaults/Extensions.cs


## 5) Notable Patterns and Conventions

### Backend
- Minimal APIs with logical route grouping (`MapGroup("auth")`) and pipeline configuration in `Program.cs`.
- Identity cookie auth with extended lifetime and sliding expiration:
  - Path: backend/Ahlcg.ApiService/Program.cs
  - Snippet: `options.ExpireTimeSpan = TimeSpan.FromDays(90); options.SlidingExpiration = true;`
- EF Core migrations applied by a dedicated hosted service (migrator), improving startup reliability.
- Dev-only exposure of API docs and health endpoints to reduce prod surface area.
- OpenTelemetry instrumentation and health checks centralized in a shared project (`Ahlcg.ServiceDefaults`).

### Frontend
- Strict TypeScript configuration and signal-based store (`@ngrx/signals`).
- Schema-first validation with arktype; updates are applied as RFC6902 patches to the store, then animated with GSAP Flip for smooth UI transitions.
- i18n with Transloco, Storybook for component-driven development, and Chromatic for visual regression.
- Standalone Angular components and lazy-loaded pages for route-based code splitting.

### Orchestration
- .NET Aspire used for local developer experience, spinning up Postgres (with PgAdmin), applying migrations, and starting both API and frontend dev server with health checks and dependencies.
- INFERENCE: Production orchestration is not yet defined (no Dockerfiles/IaC). Certainty: high.
