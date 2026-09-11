# Backend

.NET 10 solution in `backend/`. All projects set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` — warnings break the build.

[comments.md](comments.md) applies here as it does to the frontend: a comment is an exception, and XML-doc is for non-obvious public contracts only.

## Projects

| Project | Role |
| --- | --- |
| `Ahlcg.ApiService` | The API — endpoints, entities, the `DbContext`, migrations, the SignalR hub |
| `Ahlcg.AppHost` | .NET Aspire orchestration for local dev |
| `Ahlcg.Migrator` | One-shot `BackgroundService` that applies migrations and stops the host |
| `Ahlcg.ServiceDefaults` | Shared OpenTelemetry, health checks, and HTTP resilience |
| `unit-tests/Ahlcg.ApiService.Tests` | xUnit + Moq, handler-level, no database |
| `integration-tests/Ahlcg.ApiService.IntegrationTests` | xUnit + Aspire.Hosting.Testing, drives the real API over real HTTP against real Postgres — see [testing.md](testing.md) |

## Startup

`Program.cs` is short — read it rather than any summary. What is worth knowing before you do:

- The connection string name is `ahlcg`, supplied by Aspire.
- OpenAPI, Scalar, and the developer exception page are **Development-only**. A missing endpoint in a deployed environment is usually this, not a bug.
- `Ahlcg.AppHost` registers `apiservice` with `launchProfileName: "https"` so it exposes the HTTPS endpoint in addition to the default `http` one. This exists for the integration tests: the auth cookie is `Secure`, and .NET's `CookieContainer` will not send a `Secure` cookie over plain HTTP. See [testing.md](testing.md).

## Endpoints

One route group per feature: a static class with a `Map*Endpoints(this RouteGroupBuilder)` extension and static handler methods, registered from `Program.cs`. `AuthEndpoints.cs` and `GameEndpoints.cs` are the pattern to copy.

- Handlers return `Results<TOk, TError…>` (typed results), not `IResult`. That is what makes them directly unit-testable — the tests call the handler with mocks and assert on `result.Result`. Keep new handlers testable the same way.
- Dependencies arrive as handler parameters, resolved by the framework — no constructor injection, since the handlers are static.
- Request/response DTOs are `record`s nested in the endpoint class, annotated `[PublicAPI]`, with data-annotation validation. Validation runs via `AddValidation()`.
- Every route carries `.WithDescription(...)`, and so does the group. These become the Scalar/OpenAPI docs, and an integration test asserts they are non-empty.
- Auth is opt-in per route with `.RequireAuthorization()`.

There is no service layer, repository layer, or DTO folder. Do not invent one for a single handler; extract only when logic is genuinely shared.

Identity is ASP.NET Core Identity with cookie auth. The account lifecycle — how one route serves sign-in, registration and anonymous upgrade, and which branches destroy an anonymous account — is in [api.md](api.md); the hardening and its known gaps are in [security.md](security.md).

## Entities and the DbContext

**An entity is declared in the endpoint file that owns it**, next to its routes — `AppUser` in `AuthEndpoints.cs`, the game entities in `GameEndpoints.cs`. There is no `Models/` or `Entities/` folder, and adding one is not the fix for a file getting long.

`ApplicationDbContext` is `IdentityDbContext<AppUser>` plus a `DbSet` per entity, and every relationship, key, index, and column mapping is configured in its single `OnModelCreating` override rather than by attributes on the entity. `base.OnModelCreating(builder)` must stay first — Identity's own model configuration lives there.

Conventions that are not obvious from the code:

- **Foreign keys to `AppUser` cascade.** Logout deletes a still-anonymous user, so anything hanging off that row has to go with it rather than orphan the FK.
- **Navigation properties are nullable; scalar FKs are not.** A navigation describes *load state* — it is genuinely null after a query that did not `Include` it — while the FK is data that is always present. Where a non-nullable reference-typed FK carries `required`, that is a CS8618 artifact and nothing more; value-typed FKs need no such marker, which is why the two look inconsistent.
- **`JsonDocument` columns need an explicit `HasConversion`** to their `jsonb` column. Without it the model fails to build under EF's InMemory provider, which the unit tests use: the automatic scalar mapping for `JsonDocument` is Npgsql-specific, and InMemory instead tries to treat it as a navigable entity.

## The game data model

Three rules govern it. Everything else is in the code.

**A stored game's configuration payload is opaque.** The backend checks that it is present and never parses, validates, or reads it (#198). This is the engine rule: the backend models no card-game concepts. An integer on an entity is allowed to exist, but it must name no card-game concept — not a seat, not an investigator, not a scenario.

**Membership is the access check, never ownership.** A user may resume a game if and only if a `GameMember` row exists for them. `Game.OwnerId` is provenance — it records who created the game and grants nothing — so no authorization may read it. Creating a game writes the creator's membership row in the same `SaveChangesAsync`, so the two cannot come apart, and the idempotency retry path detaches both entities so a repeated key cannot leave a duplicate.

**"Last played" is a per-user question.** Two members of the same game have different answers, so the value that orders anybody's list lives on the membership row; the game-level one is a fact about the game and is not a substitute for it.

**Idempotent creation.** `POST /games` requires a client-supplied `Idempotency-Key`. Repeating a key for the same owner returns the game created the first time — enforced by a database unique index rather than a check-then-insert, which would race. The handler saves optimistically, and on `DbUpdateException` re-reads by owner and key, rethrowing if nothing is found, since that means the failure was something else.

## Persistence and migrations

EF Core 10 with Npgsql, code-first. Migrations live in `Ahlcg.ApiService/Migrations/`; add one with `dotnet ef migrations add {Name}` from `backend/Ahlcg.ApiService`. Naming follows `{Entity}_{Change}`.

**Never hand-edit the model snapshot or a designer file.** They are the record of what EF believes the model is, and editing them makes the next migration wrong. Never hand-edit generated *schema* operations either — if one is wrong, fix the model and regenerate.

A generated migration takes exactly one kind of hand-added line: a **data** operation, `migrationBuilder.Sql(...)`, backfilling rows the schema change needs in order to be correct. A migration that adds an access-granting table has to seed it, or it ships rows nobody can reach. Backfills belong in the migration and not in `Ahlcg.Migrator`, which runs migrations and does not author them, and where they would not be atomic with the schema they repair.

A column with a `HasDefaultValue` is backfilled by the generated `AddColumn` and needs no SQL — but give the CLR property the same initializer, because the InMemory provider ignores store defaults and the unit tests would otherwise read a zero.

Migrations are applied by `Ahlcg.Migrator`, not by the API. It runs them inside `Database.CreateExecutionStrategy()` so transient Postgres failures retry, emits an OTel activity, and stops the host; Aspire's `WaitForCompletion(migrator)` gates the API on that exit.

## SignalR

`GameHub` is mapped at `/game` and authenticated by the same session cookie as the endpoints. It is a `Ping` stub — no groups, no game methods, no client anywhere in the frontend.

## Observability and health

Configured in `Ahlcg.ServiceDefaults/Extensions.cs`, applied by `AddServiceDefaults()`:

- OpenTelemetry logs, metrics, and traces, exported over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. SignalR hub instrumentation is added separately in `Program.cs`.
- Standard resilience handler for outbound `HttpClient`s, plus service discovery.
- `MapDefaultEndpoints()` maps `/health` (all checks) and `/alive` (checks tagged `live`) **only in Development** — it returns early otherwise, by design.

Errors use `AddProblemDetails()`, with one exception: `AuthEndpoints` returns `BadRequest<IdentityResult>` rather than ProblemDetails on validation failures.

## Configuration

`appsettings.json` / `appsettings.Development.json`, overridden by environment variables. Aspire supplies the `ahlcg` connection string and the OTLP endpoint at run time.
