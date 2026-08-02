# Backend

.NET 10 solution in `backend/`. All projects set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` — warnings break the build.

## Projects

| Project | Role |
| --- | --- |
| `Ahlcg.ApiService` | The API. `Program.cs`, `AuthEndpoints.cs`, `GameHub.cs`, `ApplicationDbContext.cs`, `Migrations/` |
| `Ahlcg.AppHost` | .NET Aspire orchestration for local dev (`AppHost.cs`) |
| `Ahlcg.Migrator` | One-shot `BackgroundService` that applies migrations and stops the host |
| `Ahlcg.ServiceDefaults` | Shared OpenTelemetry, health checks, and HTTP resilience (`Extensions.cs`) |
| `unit-tests/Ahlcg.ApiService.Tests` | xUnit + Moq |

## Startup

`Program.cs` is short — read it rather than a summary. Order: `AddServiceDefaults()` → `AddNpgsqlDbContext<ApplicationDbContext>("ahlcg")` → problem details, OpenAPI, `AddValidation()` → SignalR with OTel hub instrumentation → Identity API endpoints + EF stores → cookie configuration. Then `UseExceptionHandler().UseAuthentication().UseAuthorization()`, `MapDefaultEndpoints()`, `MapHub<GameHub>("/game")`, `MapGroup("auth").MapAuthEndpoints()`. OpenAPI, Scalar, and the developer exception page are Development-only.

The connection string name is `ahlcg`, supplied by Aspire.

## Endpoints

One route group per feature, defined as a static class with a `Map*Endpoints(this RouteGroupBuilder)` extension and static handler methods, registered from `Program.cs`. `AuthEndpoints.cs` is the only existing group and the pattern to copy:

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

Declared in `AuthEndpoints.cs`. `ApplicationDbContext` is `IdentityDbContext<AppUser>` with no additional entities or `OnModelCreating` overrides — the schema is stock Identity plus the `IsAnonymous` column.

Lifecycle: anonymous login creates a user with a GUID `UserName` and no password → `linkCredentials` either adds a password and sets email/username (`IsAnonymous = false`) or, if the email already exists, verifies the password, deletes the anonymous user, and signs in the existing one → logout deletes the user if still anonymous.

`LinkCredentials` carries a `// TODO transfer all data to the linked account` — the merge path currently discards the anonymous account's data.

Cookie settings (`ConfigureApplicationCookie`): 90-day expiry, sliding, `HttpOnly`, `SecurePolicy = Always`, `SameSite = Lax`. See [security.md](security.md).

## Persistence and migrations

EF Core 10 with Npgsql, code-first. Migrations live in `Ahlcg.ApiService/Migrations/`:

- `20251114145044_Initial` — Identity schema
- `20251114153547_User_AddIsAnonymous` — the `IsAnonymous` column

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
