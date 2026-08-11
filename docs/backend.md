# Backend

.NET 10 solution in `backend/`. All projects set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` — warnings break the build.

## Projects

| Project | Role |
| --- | --- |
| `Ahlcg.ApiService` | The API. `Program.cs`, `AuthEndpoints.cs`, `GameEndpoints.cs`, `GameHub.cs`, `ApplicationDbContext.cs`, `Migrations/` |
| `Ahlcg.AppHost` | .NET Aspire orchestration for local dev (`AppHost.cs`) |
| `Ahlcg.Migrator` | One-shot `BackgroundService` that applies migrations and stops the host |
| `Ahlcg.ServiceDefaults` | Shared OpenTelemetry, health checks, and HTTP resilience (`Extensions.cs`) |
| `unit-tests/Ahlcg.ApiService.Tests` | xUnit + Moq, handler-level, no database |
| `integration-tests/Ahlcg.ApiService.IntegrationTests` | xUnit + Aspire.Hosting.Testing, drives the real API over real HTTP against real Postgres — see [testing.md](testing.md) |

## Startup

`Program.cs` is short — read it rather than a summary. Order: `AddServiceDefaults()` → `AddNpgsqlDbContext<ApplicationDbContext>("ahlcg")` → problem details, OpenAPI, `AddValidation()` → SignalR with OTel hub instrumentation → `TryAddSingleton(TimeProvider.System)` → Identity API endpoints + EF stores → cookie configuration. Then `UseExceptionHandler().UseAuthentication().UseAuthorization()`, `MapDefaultEndpoints()`, `MapHub<GameHub>("/game")`, `MapGroup("auth").MapAuthEndpoints()`, `MapGroup("games").MapGameEndpoints()`. OpenAPI, Scalar, and the developer exception page are Development-only.

The connection string name is `ahlcg`, supplied by Aspire.

`Ahlcg.AppHost/AppHost.cs` adds `apiservice` with `launchProfileName: "https"` so it exposes the HTTPS endpoint its own `https` launch profile declares, in addition to the default `http` one. This is needed by the integration test project (see [testing.md](testing.md)) — the auth cookie is `Secure`, and `CookieContainer` will not send a `Secure` cookie over plain HTTP.

## Endpoints

One route group per feature, defined as a static class with a `Map*Endpoints(this RouteGroupBuilder)` extension and static handler methods, registered from `Program.cs`. `AuthEndpoints.cs` and `GameEndpoints.cs` are the existing groups and the pattern to copy:

- Handlers return `Results<TOk, TError…>` (typed results), not `IResult`. This is what makes them directly unit-testable — the tests call `AuthEndpoints.LoginAnonymously(principal, userManager, signInManager)` with mocks and assert on `result.Result`.
- Dependencies (`ClaimsPrincipal`, `UserManager<AppUser>`, `SignInManager<AppUser>`, the request record) arrive as handler parameters.
- Request/response DTOs are `record`s nested in the endpoint class, annotated `[PublicAPI]`, with data-annotation validation (`[Required]`, `[EmailAddress]`). Validation runs via `AddValidation()`.
- Every route carries `.WithDescription(...)`; the group carries one too. These become the Scalar/OpenAPI docs.
- Auth is opt-in per route with `.RequireAuthorization()`.

There is no service layer, repository layer, or DTO folder. Do not invent one for a single handler; extract only when logic is genuinely shared.

## Identity

```csharp
public class AppUser : IdentityUser { public bool IsAnonymous { get; set; } }
```

Declared in `AuthEndpoints.cs`. `ApplicationDbContext` is `IdentityDbContext<AppUser>` plus one additional entity, `Game` (declared in `GameEndpoints.cs`, the same way `AppUser` lives in `AuthEndpoints.cs`), and one `OnModelCreating` override that configures it: a unique index on `(OwnerId, IdempotencyKey)` and a cascade-delete foreign key to the owning `AppUser` (so a deleted anonymous user's games go with it, rather than orphaning the FK).

Lifecycle: anonymous login creates a user with a GUID `UserName` and no password → `signIn` either upgrades that user in place (adds a password, sets email/username, `IsAnonymous = false`, **same id**) when the email is new, or verifies the password against the existing account, deletes the anonymous one, and signs the existing one in → logout deletes the user if still anonymous. A caller with no session takes the same route: unknown email creates a permanent user outright.

`SignIn` carries a `// TODO transfer all data to the linked account` — the branch that signs in to an *existing* account while anonymous discards the anonymous account's data. The upgrade branch has no such problem, which is why it exists.

Cookie settings (`ConfigureApplicationCookie`): 90-day expiry, sliding, `HttpOnly`, `SecurePolicy = Always`, `SameSite = Lax`. See [security.md](security.md).

## Games

`Game` (id, `OwnerId`, `IdempotencyKey`, `Configuration`, `CreatedAt`, `LastPlayedAt`) is the first game-shaped entity the backend stores. `Configuration` is a `JsonDocument`, mapped with an explicit `HasConversion` to a `jsonb` column — the conversion exists so the model also builds under EF's InMemory provider (used by the unit tests); without it, InMemory tries to treat `JsonDocument` as a navigable/owned entity and fails, since the automatic scalar mapping for `JsonDocument` is Npgsql-provider-specific. The backend never parses or validates `Configuration` (#198) — presence is checked, contents are not.

`POST /games` (`GameEndpoints.CreateGame`) requires a client-supplied `Idempotency-Key` header. Repeating the same key for the same owner returns the game created the first time; enforced by the database unique index rather than a check-then-insert, which would race. The handler saves optimistically and, on `DbUpdateException`, re-reads by `(OwnerId, IdempotencyKey)` and returns that row instead — rethrowing if nothing is found, since that means the failure was something else.

## Persistence and migrations

EF Core 10 with Npgsql, code-first. Migrations live in `Ahlcg.ApiService/Migrations/`:

- `20251114145044_Initial` — Identity schema
- `20251114153547_User_AddIsAnonymous` — the `IsAnonymous` column
- `20260806164122_Game_Add` — the `Games` table

Add one with `dotnet ef migrations add {Name}` from `backend/Ahlcg.ApiService`. Never hand-edit generated migrations or the model snapshot.

Migrations are applied by `Ahlcg.Migrator`, not by the API. `Worker.ExecuteAsync` opens a scope, resolves `ApplicationDbContext`, runs the migration inside `Database.CreateExecutionStrategy()` (so transient Postgres failures retry), emits an OTel activity from the `Migrations` source, and then calls `hostApplicationLifetime.StopApplication()`. Aspire's `WaitForCompletion(migrator)` gates the API on that exit.

## SignalR

`GameHub.cs` in full:

```csharp
[Authorize]
public class GameHub : Hub
{
    public async Task Ping() => await Clients.Caller.SendAsync("ping", DateTime.UtcNow);
}
```

Mapped at `/game`, authenticated by the same session cookie. No groups, no game methods, no client.

## Observability and health

Configured in `Ahlcg.ServiceDefaults/Extensions.cs`, applied by `AddServiceDefaults()`:

- OpenTelemetry logs, metrics, and traces; exported over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. SignalR hub instrumentation is added in `Program.cs`.
- Standard resilience handler for outbound `HttpClient`s, plus service discovery.
- `MapDefaultEndpoints()` maps `/health` (all checks) and `/alive` (checks tagged `live`) **only when the environment is Development** — it returns early otherwise, by design.

Errors use `AddProblemDetails()`; note that `AuthEndpoints` returns `BadRequest<IdentityResult>` rather than ProblemDetails on validation failures.

## Configuration

`appsettings.json` / `appsettings.Development.json`, overridden by environment variables. Aspire supplies the `ahlcg` connection string and OTLP endpoint at run time.
