# Backend

.NET 10 solution in `backend/`. All projects set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` — warnings break the build.

[comments.md](comments.md) applies here as it does to the frontend: a comment is an exception, and XML-doc is for non-obvious public contracts only.

**Method names start with a verb** — `GetGameStateKey`, `GetMemberGroupName`, `FindNextMembershipChange`, not `CurrentKey`, `MemberGroup`, `NextMembershipChange`. A noun reads as a property and hides that work is done. `[LoggerMessage]` methods are `Log…`, and predicates are `Is…`/`Has…`/`Holds…`.

## Projects

| Project | Role |
| --- | --- |
| `Tablier` | The game-agnostic engine — endpoints, the SignalR hub, sessions, rate limits; `AddTablier()` / `MapTablier()` |
| `Tablier.Data` | The `DbContext`, entities, and migrations |
| `Tablier.Contract` | The rules interfaces — `IGameConfigurator`, `IGameStateProcessor`, `IGameViewProjector` — plus `StepResult`, `ISchemaVersioned` and `GameRandom`; `Tablier` references it, and it references nothing |
| `Ahlcg.ApiService` | The composition root — `Program.cs` only |
| `Ahlcg.AppHost` | .NET Aspire orchestration for local dev |
| `Ahlcg.Migrator` | One-shot `BackgroundService` that applies migrations and stops the host |
| `Ahlcg.ServiceDefaults` | Shared OpenTelemetry, health checks, and HTTP resilience |
| `unit-tests/Tablier.Tests` | xUnit + Moq, handler-level, no database |
| `integration-tests/Ahlcg.ApiService.IntegrationTests` | xUnit + Aspire.Hosting.Testing, drives the real API over real HTTP against real Postgres, and exercises code that needs real Postgres but has no route yet (`GameHistory<TState>`) — see [testing.md](testing.md) |

## Startup

`Ahlcg.ApiService/Program.cs` composes; the registrations and route mapping are in `Tablier/TablierExtensions.cs`. Both are short — read them rather than any summary. What is worth knowing before you do:

- The connection string name is `ahlcg`, supplied by Aspire.
- OpenAPI, Scalar, and the developer exception page are **Development-only**. A missing endpoint in a deployed environment is usually this, not a bug.
- `Ahlcg.AppHost` registers `apiservice` with `launchProfileName: "https"` so it exposes the HTTPS endpoint in addition to the default `http` one. This exists for the integration tests: the auth cookie is `Secure`, and .NET's `CookieContainer` will not send a `Secure` cookie over plain HTTP. See [testing.md](testing.md).

## Endpoints

One route group per feature: a static class with a `Map*Endpoints(this RouteGroupBuilder)` extension and static handler methods, registered from `MapTablier()`. `AuthEndpoints.cs` and `GameEndpoints.cs` are the pattern to copy.

- Handlers return `Results<TOk, TError…>` (typed results), not `IResult`. That is what makes them directly unit-testable — the tests call the handler with mocks and assert on `result.Result`. Keep new handlers testable the same way.
- Dependencies arrive as handler parameters, resolved by the framework — no constructor injection, since the handlers are static.
- Request/response DTOs are `record`s nested in the endpoint class, annotated `[PublicAPI]`, with data-annotation validation. Validation runs via `AddValidation()`.
- Every route carries `.WithDescription(...)`, and so does the group. These become the Scalar/OpenAPI docs. **The description is where a route is documented — there is no markdown copy of it.** Anything a caller needs to know about a route (what a status code means, which field is optional, what a header does, why a normal-but-empty answer is a `204` rather than a `404`) goes in `.WithDescription()` and `.Produces()`, so it ships with the spec and cannot drift away from the code. See [api.md](api.md) for the little that is left over.
- Auth is opt-in per route with `.RequireAuthorization()`.

There is no service layer, repository layer, or DTO folder. Do not invent one for a single handler; extract only when logic is genuinely shared.

Identity is ASP.NET Core Identity with cookie auth. How one route serves sign-in, registration and anonymous upgrade is in that route's own OpenAPI description; the hardening, and which branches destroy an anonymous account, are in [security.md](security.md).

## Entities and the DbContext

**Entities live in `Tablier.Data`**, not next to their routes: `Tablier.Data` cannot reference `Tablier`, and the `DbContext` has to see them. One type per file, as everywhere on the backend: Meziantou's `MA0048` fails the build otherwise. A short record or enum that belongs to one type may share that type's file under `#pragma warning disable MA0048`; an entity always gets its own file.

`ApplicationDbContext` is `IdentityDbContext<AppUser>` plus a `DbSet` per entity, and every relationship, key, index, and column mapping is configured in its single `OnModelCreating` override rather than by attributes on the entity. `base.OnModelCreating(builder)` must stay first — Identity's own model configuration lives there.

Conventions that are not obvious from the code:

- **Foreign keys to `AppUser` cascade.** Logout deletes a still-anonymous user, so anything hanging off that row has to go with it rather than orphan the FK.
- **Navigation properties are nullable; scalar FKs are not.** A navigation describes *load state* — it is genuinely null after a query that did not `Include` it — while the FK is data that is always present. Where a non-nullable reference-typed FK carries `required`, that is a CS8618 artifact and nothing more; value-typed FKs need no such marker, which is why the two look inconsistent.
- **`JsonDocument` columns need an explicit `HasConversion`** to their `jsonb` column. Without it the model fails to build under EF's InMemory provider, which the unit tests use: the automatic scalar mapping for `JsonDocument` is Npgsql-specific, and InMemory instead tries to treat it as a navigable entity.

## The game data model

Three rules govern it. Everything else is in the code.

**A stored game's configuration payload is opaque to the engine.** `Tablier` never inspects it; only the rules module's `IGameConfigurator` reads it, when a game is created, and a configuration the rules cannot read is a `400` and nothing is saved (#198). This is the engine rule: the backend models no card-game concepts. An integer on an entity is allowed to exist, but it must name no card-game concept — not a seat, not an investigator, not a scenario.

**Membership is the access check, never ownership.** A user may resume a game if and only if a `GameMember` row exists for them. `Game.OwnerId` is provenance — it records who created the game and grants nothing — so no authorization may read it. Creating a game writes the creator's membership row in the same `SaveChangesAsync`, so the two cannot come apart, and the idempotency retry path detaches both entities so a repeated key cannot leave a duplicate.

**"Last played" is a per-user question.** Two members of the same game have different answers, so the value that orders anybody's list lives on the membership row; the game-level one is a fact about the game and is not a substitute for it.

**Idempotent creation.** `POST /games` requires a client-supplied `Idempotency-Key`. Repeating a key for the same owner returns the game created the first time — enforced by a database unique index rather than a check-then-insert, which would race. The handler saves optimistically, and on `DbUpdateException` re-reads by owner and key, rethrowing if nothing is found, since that means the failure was something else.

## Game history

`GameHistory<TState>` stores a game as results, never as events to replay: an RFC 6902 patch per step, plus snapshots. Loading never runs rules, so a rules change cannot alter a past game. `Tablier.Data` knows neither `TState` nor the patch library; the store serialises the state itself.

- **The store issues versions.** `Begin`, `Append` and `LoadCurrent` return a `StoredState<TState>`; the caller hands the last one back as `previous` and never computes a version. A stale `previous` is refused, so a caller still holding a state from before a rewind cannot append.
- **The schema version travels in the state** (`TState : ISchemaVersioned`), and is copied to a column on each snapshot so stale snapshots can be found by query. A `TState` is always the current schema: old JSON is upcast before it is deserialised, never after.
- **History is append-only.** A rewind appends the restored state as an irreversible checkpoint; nothing is ever truncated.
- **Retention limits are queries, not deletions.** A checkpoint or baseline writes a snapshot. `LoadAt` refuses any version behind a later irreversible or baseline step, so a snapshot rewind can no longer reach is unreachable whether or not its row still exists. The store does not know what a scenario is.
- **A refusal is a `null`, and is logged; a throw is a bug.** A collision between concurrent writers on the same version hits the primary key and comes back as a refusal. An unknown game id and a patch that will not apply throw.
- **Each write clears the tracker first, inside an execution strategy**, the same shape as the endpoints' transactional writes, and clears it again after its `SaveChanges` so a refused insert is not retried by the next save. Callers save their own changes before calling the engine; anything still tracked is detached.
- **Callers use `IGameHistory<TState>`, which is a cache in front of the store.** `CachedGameHistory` wraps the keyed `"store"` `GameHistory` with Valkey only — no in-process tier, so every replica reads the same entry. Every write to the entry goes through one Lua script that sets it only if its version is newer than the cached one, so a late write from a slower writer can never regress the head. `LoadCurrent` fills a miss from a non-null load; a refused `Append` evicts the key; `LoadAt` is never cached. The engine does not know the cache exists.

## Rules modules

A rules module implements the three `Tablier.Contract` interfaces and is pure: no logging, DI or I/O. `Ahlcg.Rules.Fixture` is the only one so far.

**Randomness lives in the state.** The engine supplies one seed, to `InitializeGame`; the module turns it into a `GameRandom`, keeps it in its state, and every draw stores the advanced generator back. Never use `System.Random`, `Guid`, the clock, or any other entropy. Because the generator is state, a whole campaign draws from one sequence, snapshots persist it, a rewind restores it so a re-done step cannot re-roll, and precomputing every offered action is safe since each starts from the same generator.

## The step loop

`GameEngine<TConfiguration, TState, TView>` is the one place that knows the rules' types. Hub and endpoints depend on the non-generic `IGameEngine`, so they stay non-generic and their tests mock it; `AddGameEngine<,,>()` in `Program.cs` picks the types.

- **The engine is scoped and shares the caller's `DbContext`.** `GameHistory` refuses a tracking context, so every endpoint clears the change tracker after its own save and before calling the engine.
- **Nothing precomputed is stored.** The rules are deterministic because randomness is in the state, so re-running `Execute` gives exactly the state whose patch was offered. Patches are never produced by the rules: the engine diffs the member's view before against after.
- **Serialisation is optimistic only.** There is no per-game lock and no state on `GameSession`; `Append`'s version check decides, and a refusal reloads and retries. That is what leaves room for more than one replica, and it is why events can arrive out of order.
- **Membership is reconciled, not pushed.** `SyncMembers` diffs the `GameMembers` rows against `GetMembers(state)` and commits one `AddMember` or `RemoveMember` step per difference, then advances any pending non-player step. Join, removal and `GetState` all call it, so a crash between a membership commit and its step repairs itself; a row inserted directly reaches the state on that member's next `GetState`.
- **Events go to per-member groups, never `Clients.User`**, which would cross games. A member no longer in the state receives nothing.
- **A step is committed before it is sent.** A connection lost or a send failing in between leaves a committed step with unsent events; clients recover from the version gap.

## Persistence and migrations

EF Core 10 with Npgsql, code-first. Migrations live in `Tablier.Data/Migrations/`; add one with `dotnet ef migrations add {Name} --project Tablier.Data --startup-project Ahlcg.ApiService` from `backend/`. Naming follows `{Entity}_{Change}`.

**Never hand-edit the model snapshot or a designer file.** They are the record of what EF believes the model is, and editing them makes the next migration wrong. Never hand-edit generated *schema* operations either — if one is wrong, fix the model and regenerate.

A generated migration takes exactly one kind of hand-added line: a **data** operation, `migrationBuilder.Sql(...)`, backfilling rows the schema change needs in order to be correct. A migration that adds an access-granting table has to seed it, or it ships rows nobody can reach. Backfills belong in the migration and not in `Ahlcg.Migrator`, which runs migrations and does not author them, and where they would not be atomic with the schema they repair.

A column with a `HasDefaultValue` is backfilled by the generated `AddColumn` and needs no SQL — but give the CLR property the same initializer, because the InMemory provider ignores store defaults and the unit tests would otherwise read a zero.

Migrations are applied by `Ahlcg.Migrator`, not by the API. It runs them inside `Database.CreateExecutionStrategy()` so transient Postgres failures retry, emits an OTel activity, and stops the host; Aspire's `WaitForCompletion(migrator)` gates the API on that exit.

## SignalR

`GameHub` is mapped at `/game` and authenticated by the same session cookie as the endpoints. The wire contract — the `gameId` query parameter, the membership gate, the message names — is in [api.md](api.md#signalr-game); what follows is why the server is shaped this way.

**A caller the hub turns away is asked to leave rather than cut off.** `Connect` sends `Exit(NotAMember)` and returns instead of throwing, so the connection stays open and stopping it is the client's decision. The reason is on the client side: a close is indistinguishable from a network drop, so a client that inferred rejection from one could not also use automatic reconnect. Keep any future "you may not be here" answer on that path — throw only for a malformed request, which is a client bug rather than an answer.

**A session is live-connection state and is deliberately not persisted.** `GameSessions` is a singleton `ConcurrentDictionary` and there is no entity, `DbSet`, or migration for it. Persisting it inverts on restart: `OnDisconnectedAsync` does not fire when the process dies, so a deploy would leave rows claiming members are online with nothing to reap them. An empty registry after a restart is the correct answer, not lost state. The cost is a **single-replica ceiling** — a second instance would need a backplane, which `AddTablier()` does not configure and `AppHost.cs` does not ask for.

**The registry keys connections by user**, `userId -> connection ids`, not as a flat set of connection ids. Every consumer asks a user-shaped question — is this member online, who is at the table — and it is what lets a member with two tabs open produce one connect and one disconnect broadcast instead of four.

**`Join` and `Leave` are compare-and-swap loops, not `AddOrUpdate`.** Two hazards make this necessary and neither is visible to a single-threaded reading:

- Dropping a session when its last connection leaves must be atomic against a connection arriving at the same instant, or that arrival is left in a group nothing broadcasts to. `AddOrUpdate` cannot express this at all; `TryRemove(KeyValuePair)` can, because a join landing in between changes the value and fails the CAS.
- `AddOrUpdate`'s update delegate re-runs under contention, which loses exactly the answer the hub needs — *was this the member's first connection?*

The CAS works because `GameSession.Connections` is an `ImmutableDictionary`, which does not override `Equals`. Giving the record a structural comparer would silently turn both `TryUpdate` and `TryRemove` into no-ops that always succeed.

**Invite-code assignment takes a lock; `Join` and `Leave` do not.** A code must be unique across every live session, and a per-key CAS cannot see other keys — two sessions starting together would each scan, find no clash, and commit the same code. The lock serialises only scan-and-assign; the commit inside it is still a `TryUpdate`, so a concurrent `Join` on that session just forces a retry. Uniqueness is checked by scanning the registry rather than through a `code → game` index, which would need unwinding on every clear and every session end.

**The code is re-derived, not decided once.** `SyncInviteCode` runs on every connect and compares the member count with `IntendedPlayersCount`: a code while seats are open, none otherwise, and no write when that answer has not changed. Anything that later moves either number calls it again.

**Do not remove a disconnecting connection from its groups.** SignalR does that itself, which is why `Disconnect` takes no `IGroupManager` while `Connect` does.

**An unclean disconnect is detected late, not missed.** `OnDisconnectedAsync` still runs for a killed browser or a closed laptop lid — but only once SignalR's own keep-alive timeout notices, so the session reads as live for as long as that takes, and only then is the connection removed, the group told, and `LastPlayedAt` written. This is by design until a heartbeat exists: it must fail toward "the session is still running", never toward "this game is unreachable". The case the callback genuinely misses is the process dying, which is the argument for not persisting sessions above.

**The hub injects a scoped `ApplicationDbContext` by constructor.** This reads like the classic captured-context mistake and is not one — SignalR creates a DI scope per hub invocation, including the connect and disconnect callbacks, so each gets its own context. Endpoints take their dependencies as handler parameters because their handlers are static; a hub is a class and uses constructor injection.

**The hub is a `Hub<IGameClient>`, not a `Hub`.** The client contract is an interface declared alongside it, so broadcasts are compiler-checked method calls rather than `SendAsync("someName", …)` — a typo becomes a build error instead of a message nobody receives, and the tests mock `IGameClient` directly instead of asserting against `SendCoreAsync` argument arrays. The cost is that the wire name is now the method name: renaming an `IGameClient` method silently changes the contract, and nothing in C# will flag it.

Connect and disconnect live in static methods taking their dependencies as parameters, with the overrides as thin wiring, so they are unit-testable the same way the endpoint handlers are.

## Observability and health

Configured in `Ahlcg.ServiceDefaults/Extensions.cs`, applied by `AddServiceDefaults()`:

- OpenTelemetry logs, metrics, and traces, exported over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. SignalR hub instrumentation is added separately in `AddTablier()`.

The step loop has a second meter, `TablierMetrics.MeterName`, recorded only by decorators — `MeteredGameEngine`, `MeteredGameHistory` and one per rules interface, all on the `MeteredDecorator` base — so the engine and the store carry no metric calls. Each seam is one duration histogram tagged by `method` and `outcome`; a histogram exports its count, so call rates come from it rather than from separate counters. The cache adds a hit/miss counter. The instruments sit in a singleton because the decorators are scoped.

Game sessions carry their own meter, `GameSessions.MeterName`, registered in `AddTablier()` rather than in `Ahlcg.ServiceDefaults` — service defaults are shared with `Ahlcg.Migrator`, which has no sessions to measure. `AddOpenTelemetry()` is idempotent, so calling it again after `AddServiceDefaults()` appends rather than replaces. Two things about those instruments are worth knowing before changing them:

- **The active-session count is an `ObservableGauge`, not an `UpDownCounter`.** The registry can simply be asked how many it holds, so a callback cannot drift; a counter needs a matching decrement at every exit path and is permanently wrong the first time one is missed.
- **The per-session histograms are recorded after the CAS succeeds, never inside the retry loop.** A contended swap retries, and a `Record()` inside the loop is counted once per attempt. They also record the session's *peak* member count, not its final one — the final one is always zero, that being why the session ended.
- Standard resilience handler for outbound `HttpClient`s, plus service discovery.
- `MapDefaultEndpoints()` maps `/health` (all checks) and `/alive` (checks tagged `live`) **only in Development** — it returns early otherwise, by design.

Errors use `AddProblemDetails()`, with one exception: `AuthEndpoints` returns `BadRequest<IdentityResult>` rather than ProblemDetails on validation failures.

## Logging

**Every decision the server makes gets a log line.** A branch that refuses, a branch that changes state, and a branch that answers "nothing to do" each log, and each one says *which* branch it was. This matters most where the response is deliberately vague — `POST /games/join` returns one identical `404` for an unknown code, a missing game and a full one, and `signIn` one `403` for a wrong password or a lockout — because the server log is then the only place the difference exists. New code that adds a branch without a log line is incomplete.

What is already logged, so do not log it again: unhandled exceptions (the exception handler logs them at `Error`), exceptions out of the hub's `OnConnectedAsync`/`OnDisconnectedAsync`, EF commands, and every request and hub invocation as a trace span.

**How.** Use source-generated `[LoggerMessage]` methods, never `logger.LogInformation(...)`. Declare them `private static partial` at the bottom of the class whose code calls them, making the class `partial` — there is no shared `Log` class. The method name is the event name, so name it after the outcome: `LogJoinRefusedGameFull`, not `LogJoin`.

- **Getting a logger.** Endpoint handlers take `ILogger<T>` as their **last** parameter. The endpoint classes are `static` and cannot be a type argument, so `T` is the entity the file's routes serve — `ILogger<Game>` in `GameEndpoints`, `ILogger<AppUser>` in `AuthEndpoints`. A static helper or the hub's static `Connect`/`Disconnect` takes a plain `ILogger` from its caller; a class with a constructor injects `ILogger<ItsOwnType>`.
- **Levels.** `Information` for outcomes, refusals the client caused included (a full game, a seat count too low). `Warning` for anything security-relevant or that should not happen: a non-member reaching a game, a failed password, throttling, a live session whose game row is gone. `Debug` for idempotent no-ops (a repeated `Idempotency-Key`, joining a game you already belong to). `Error` is for exceptions, which the framework already covers.
- **Properties, not prose.** Everything variable is a named placeholder — `{GameId}`, `{UserId}` — so it can be filtered on in the Aspire dashboard. Keep the names consistent across files.
- **Log after the commit, never inside a retry.** The rule the metrics follow applies here too: a line inside a CAS loop or an execution-strategy lambda must come after the step that can retry, or one outcome logs once per attempt.

**What never goes into a log:** an email, a user name, an IP address, a password, a cookie, or an invite code — a logged code can be redeemed by anyone who reads the logs. Ids are fine. For Identity failures, log the `IdentityError.Code`, never its `Description`, which can echo the input back.

**Tests.** A log line is not normally asserted on. The exception is a branch whose log is its only observable difference — the join refusals, a hub connection turned away. There, pass a `FakeLogger<T>` (`Microsoft.Extensions.Diagnostics.Testing`) and assert `LatestRecord.Id.Name` equals the method name. Everywhere else, pass `NullLogger<T>.Instance`.

In Development, `appsettings.Development.json` lowers the `Ahlcg` and `Tablier` categories to `Debug`; production keeps `Information`.

## Configuration

`appsettings.json` / `appsettings.Development.json`, overridden by environment variables. Aspire supplies the `ahlcg` connection string and the OTLP endpoint at run time.
