# Backend

.NET 10 solution in `backend/`. All projects set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` — warnings break the build.

[comments.md](../practice/comments.md) applies here as it does to the frontend: a comment is an exception, and XML-doc is for non-obvious public contracts only.

**Method names start with a verb** — `GetMemberState`, `GetMemberGroupName`, `FindNextMembershipChange`, not `CurrentKey`, `MemberGroup`, `NextMembershipChange`. A noun reads as a property and hides that work is done. `[LoggerMessage]` methods are `Log…`, and predicates are `Is…`/`Has…`/`Holds…`.

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
| `integration-tests/Ahlcg.ApiService.IntegrationTests` | xUnit + Aspire.Hosting.Testing, drives the real API over real HTTP against real Postgres, and exercises code that needs real Postgres but has no route yet (`GameHistory<TState>`) — see [testing.md](../practice/testing.md) |

## Startup

`Ahlcg.ApiService/Program.cs` composes; the registrations and route mapping are in `Tablier/TablierExtensions.cs`. Both are short — read them rather than any summary. What is worth knowing before you do:

- The connection string name is `ahlcg`, supplied by Aspire.
- OpenAPI, Scalar, and the developer exception page are **Development-only**. A missing endpoint in a deployed environment is usually this, not a bug.
- `Ahlcg.AppHost` registers `apiservice` with `launchProfileName: "https"` so it exposes the HTTPS endpoint in addition to the default `http` one. This exists for the integration tests: the auth cookie is `Secure`, and .NET's `CookieContainer` will not send a `Secure` cookie over plain HTTP. See [testing.md](../practice/testing.md).

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

**Idempotent creation.** `POST /games` requires a client-supplied `Idempotency-Key`. Repeating a key for the same owner returns the game created the first time — enforced by a database unique index rather than a check-then-insert, which would race. The engine saves optimistically, and on `DbUpdateException` re-reads by owner and key, rethrowing if nothing is found, since that means the failure was something else. It initializes history from the persisted configuration, preserving the original configuration and beginning on a replay.

## Game history

`GameHistory<TState>` stores a game as results, never as events to replay: an RFC 6902 patch per step, plus snapshots. Loading never runs rules, so a rules change cannot alter a past game. `Tablier.Data` knows neither `TState` nor the patch library; the store serialises the state itself.

- **The store issues versions.** `Begin`, `Append`, `Rewind`, `LoadCurrent` and `LoadAt` return a `StoredState<TState>`. The caller hands the current one back as `previous` for `Append`, or its version as `expectedVersion` for `Rewind`, and never computes the next version. A stale write is refused.
- **The schema version travels in the state** (`TState : ISchemaVersioned`), and is copied to a column on each snapshot so stale snapshots can be found by query. The store deserializes JSON directly into `TState`; there is no upcasting or state-schema migration support ([#641](https://github.com/rombolshak/ahlcg/issues/641)). A schema change must account for existing stored JSON rather than assuming it will be converted.
- **History writes are append-only.** `Begin` writes version zero. `Append` and `Rewind` add the next step. Cleanup owns history-row deletion.
- **Rewind restores an earlier live result at a new version.** `Rewind` requires the expected head and a positive, earlier target on the active history at or above the current barrier. It restores the exact saved state, including randomness and journal, and copies the target's actor, action, checkpoint tags and barrier flags. `GameStep.RestoredVersion` keeps the original source version even when the target is itself a rewind. The new row represents the target and replaces the active interval `[targetVersion, newVersion)`. A copied barrier gets a new snapshot and becomes the current barrier. A copied baseline allows cleanup to prune its old source row under the existing retention rules.
- **Initialization returns the persisted beginning.** `Begin` creates version zero once, or returns its stored state when the head is still zero, ignoring a different initial state supplied by a retry. Concurrent initializations reread the winner. Once the head has advanced, `Begin` throws `GameHistoryConflictException`. The engine's creation path handles that conflict so a repeated idempotency key still returns the original game without writing history.
- **Steps carry multiple checkpoint tags.** `StepResult.Checkpoints` is stored as `GameStep.Checkpoints`, a PostgreSQL `text[]`. Normal appends throw `InvalidOperationException` for the reserved `undo` tag. Any checkpoint tag, baseline or irreversible step writes a snapshot.
- **Historical reads reconstruct stored results.** In one repeatable-read transaction, `LoadAt` checks the latest irreversible or baseline barrier and finds the nearest snapshot at or before the requested version. An eligible exact snapshot needs no matching step row. Otherwise, every subsequent step through the requested version must exist and its patch is applied in version order. `LoadAt` returns a non-null state. Negative versions and versions beyond the stored head throw `ArgumentOutOfRangeException`. Uninitialized history, barrier crossings, missing required snapshots, patch-chain gaps and invalid stored state or patches throw `InvalidOperationException`.
- **Live metadata follows the active history.** `backend/Tablier/Engine/History/Live/LiveHistory.cs` reads the current barrier, nearest snapshot version and bounded step metadata through two parameterized SELECTs in one Npgsql batch under the caller's repeatable-read transaction. The metadata query returns rows only when the bounds are valid. The metadata range begins at the earlier of the barrier and snapshot, preserving live predecessors before the snapshot and physical replay coverage below the barrier when needed. A C# walk over typed `LiveStep` rows follows `(RestoredVersion ?? Version) - 1` and is shared by rewind eligibility checks, summaries and actor queries. `GetHistorySummary` returns the latest live version for each checkpoint tag except reserved `undo`, and the last player action with its original source version. `LastAction` is optional. `GetActorsForRange` returns distinct actor IDs from active rows in `(lowerExclusiveVersion, upperInclusiveVersion]`, using each row's current version. Both require an eligible snapshot, continuous physical coverage to the requested version and a live chain reaching the current barrier. Live step rows supply metadata, and snapshot eligibility and physical version coverage establish restore eligibility. Invalid versions or range bounds throw descriptive `ArgumentOutOfRangeException`. Missing initialized history, required snapshots, physical or live gaps and barrier crossings throw `InvalidOperationException`. An eligible version-zero snapshot with no step row yields an empty summary. A valid actorless or equal-bound range yields an empty set.
- **Summaries support pure transitions and target derivation.** `HistorySummary.ApplyStep` and `ApplyRewind` return new summaries. `GetTargets` filters checkpoint targets to earlier positive versions at or above the barrier and derives reserved `undo` from the last action's original source minus one. Targets come from the reachable live history.
- **Retention limits are queries; deletion is maintenance.** The read barrier applies whether or not unreachable rows still exist. The store does not know what a scenario is.
- **`GameHistoryCleanupService` reclaims the unreachable rows off the step loop**, every `Tablier:GameHistoryCleanup:Interval`. It deletes every step and snapshot below the latest baseline, and every snapshot between the latest baseline and the latest irreversible step except the newest. It runs as one set-based statement, so a concurrent `Append` sits above every bound that statement read. A transaction-scoped advisory lock lets one replica run at a time; the others skip.
- **Cleanup retains physical replay paths and live metadata.** A rewind can skip rows in the live chain while still needing their patches for physical reconstruction. Cleanup keeps steps at or above the latest baseline, including those skipped rows and the metadata needed by the surviving live chain.
- **Nullable results represent expected outcomes.** `Append` returns `null` only for a stale previous version or a concurrent write collision. Callers can reload and retry. Missing required initialized history throws `InvalidOperationException`. `LoadCurrent` returns `null` only when history is uninitialized. Orphaned steps, patch-chain gaps and invalid stored state or patches throw. `Begin` for an unknown game violates the foreign key and throws. The store logs its initialization decisions, write conflicts and historical read refusals.
- **Rewind conflicts require a reload.** A stale expected head or concurrent write collision throws `GameHistoryRewindConflictException`. Invalid head or target arguments throw `ArgumentOutOfRangeException`. Missing history, an unreachable target or incomplete physical or live history throws `InvalidOperationException`.
- **History preserves caller tracking.** Each write runs inside an execution strategy and detaches only the new `GameStep` and `GameSnapshot` entries it staged after `SaveChanges`, including a refused insert. Other tracked entities remain attached and participate in that save. Reads and rewinds use the caller's transaction when present, otherwise they open their own repeatable-read transaction. A rewind commits only a transaction it opened.
- **Callers use `IGameHistory<TState>` through `MeteredGameHistory`.** The decorator delegates directly to the keyed `"store"` `GameHistory`, which reads and writes PostgreSQL.

## Rules modules

A rules module implements the three `Tablier.Contract` interfaces and is pure: no logging, DI or I/O. `Ahlcg.Rules.Fixture` is the only one so far.

`IGameStateProcessor<TState>` is consumed as a pure transition interface. `Execute`, `Advance`, `AddMember` and `RemoveMember` must return a new state without mutating the input: the engine retains the previous state to compute view patches and executes offered actions speculatively. Given identical state, member and action, a transition must return the same result. `GetMembers` and `GetMembersActions` must be observational only.

An empty set of offered actions across **all** members means “call `Advance` again” to the current engine. Automatic transitions must eventually offer a player action; there is no terminal-state signal or iteration bound. A terminal state with no actions would keep advancing. These are engine requirements, not guarantees enforced by the interface.

**Randomness lives in the state.** The engine supplies one seed, to `InitializeGame`; the module turns it into a `GameRandom`, keeps it in its state, and every draw stores the advanced generator back. Never use `System.Random`, `Guid`, the clock, or any other entropy. Because the generator is state, a whole campaign draws from one sequence, historical reads restore the saved generator, and precomputing every offered action is safe since each starts from the same generator.

## The step loop

`GameEngine<TConfiguration, TState, TView>` is the one place that knows the rules' types. Hub and endpoints depend on the non-generic `IGameEngine`, so they stay non-generic and their tests mock it; `AddGameEngine<,,>()` in `Program.cs` picks the types.

`IGameEngine`, `IGameHistory<TState>` and `IGameHistoryCleanup` and their implementations are internal to `Tablier`. The public `TablierExtensions` composition entry points, `GameRules<,,>` and `Tablier.Contract` rules interfaces support cross-assembly composition. `Tablier.csproj` grants the test assemblies and Moq's dynamic proxy assembly access through `InternalsVisibleTo`.

- **The engine is scoped and shares the caller's `DbContext`.** History preserves caller tracking so a membership row and its history step can be saved in the same transaction.
- **The engine owns creation and joining.** `Create` validates configuration, persists the game and creator membership, and initializes history. `Join` rechecks the live invite and capacity inside a serializable transaction and commits a new membership with its irreversible `AddMember` step. A failed commit detaches the attempted membership and game so a retry reloads admission data. Invite-code updates and state broadcasts follow commit. Endpoint handlers authenticate the caller and map engine outcomes to HTTP DTOs, with authorization and rate limiting on the routes.
- **The engine requires initialized history.** `SyncMembers`, `GetMemberState` and `Execute` throw `InvalidOperationException` when it is missing. `GetMemberState` returns `null` for a member absent from the state. `Execute` returns `null` for an action not offered or after exhausting optimistic retries. Cleanup returns `null` when another worker holds its advisory lock.
- **Nothing precomputed is stored.** The rules are deterministic because randomness is in the state, so re-running `Execute` gives exactly the state whose patch was offered. Patches are never produced by the rules: the engine diffs the member's view before against after.
- **Engine operations share a private per-game gate.** Creation history initialization, joining, reconciliation, member-state reads and execution hold the gate through publication and automatic steps. It coordinates engine scopes within one process for the configured rules types. Store version checks still refuse stale writes. Sessions and gates are local to the API process, within the [single-replica ceiling](#signalr).
- **Removal and member-state reads reconcile membership.** `SyncMembers` diffs the `GameMembers` rows against `GetMembers(state)` and commits one `AddMember` or `RemoveMember` step per difference, then advances non-player steps after each membership step. Removal and `GetState` call it. When membership already matches, it returns without advancing.
- **Events go to per-member groups, never `Clients.User`**, which would cross games. A member no longer in the state receives nothing, and neither does one who is new in it: the step that adds them would send a patch built from an empty view, so their first view comes from `GetState`.
- **A step is committed before it is sent.** A version gap causes clients to reload state, but does not resume automatic transitions. A crash or failed broadcast after a player commit can leave a state with no player actions; loading it with unchanged membership does not recover the automatic loop ([#751](https://github.com/rombolshak/ahlcg/issues/751)).

**Failure boundaries.** Publication and automatic advancement run after commit. A failed broadcast can report failure after a successful mutation and interrupt automatic advancement. Creation saves the game and creator membership before initializing history, so an initialization failure can leave those rows persisted. Repeating the idempotency key retries initialization with the original configuration.

**Revocation is not atomic.** `RemoveMember` deletes membership before awaiting reconciliation, removing connections from groups and rotating the invite code. A reconciliation exception skips the latter cleanup; a retry sees the missing membership and returns early. `Execute` checks actions offered in stored state, not current membership rows, so stale state and an admitted connection can retain access until reconciliation succeeds. Connection admission checks alone do not close this gap ([#750](https://github.com/rombolshak/ahlcg/issues/750)).

## Persistence and migrations

EF Core 10 with Npgsql, code-first. Migrations live in `Tablier.Data/Migrations/`; add one with `dotnet ef migrations add {Name} --project Tablier.Data --startup-project Ahlcg.ApiService` from `backend/`. Naming follows `{Entity}_{Change}`.

**Never hand-edit the model snapshot or a designer file.** They are the record of what EF believes the model is, and editing them makes the next migration wrong. Never hand-edit generated *schema* operations either — if one is wrong, fix the model and regenerate.

A generated migration takes exactly one kind of hand-added line: a **data** operation, `migrationBuilder.Sql(...)`, backfilling rows the schema change needs in order to be correct. A migration that adds an access-granting table has to seed it, or it ships rows nobody can reach. Backfills belong in the migration and not in `Ahlcg.Migrator`, which runs migrations and does not author them, and where they would not be atomic with the schema they repair.

A column with a `HasDefaultValue` is backfilled by the generated `AddColumn` and needs no SQL — but give the CLR property the same initializer, because the InMemory provider ignores store defaults and the unit tests would otherwise read a zero.

Migrations are applied by `Ahlcg.Migrator`, not by the API. It runs them inside `Database.CreateExecutionStrategy()` so transient Postgres failures retry, emits an OTel activity, and stops the host; Aspire's `WaitForCompletion(migrator)` gates the API on that exit.

## SignalR

`GameHub` is mapped at `/game` and authenticated by the same session cookie as the endpoints. The wire contract — the `gameId` query parameter, the membership gate, the message names — is in [api.md](api.md#signalr-game); what follows is why the server is shaped this way.

**A caller the hub turns away is asked to leave rather than cut off.** Keep membership refusals on the `Exit` path; [the hub contract](api.md#signalr-game) explains the handshake and reconnect rationale.

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

The step loop has a second meter, `TablierMetrics.MeterName`, recorded only by decorators — `MeteredGameEngine`, `MeteredGameHistory` and one per rules interface, all on the `MeteredDecorator` base — so the engine and the store carry no metric calls. Each seam is one duration histogram tagged by `method` and `outcome`; a histogram exports its count, so call rates come from it rather than from separate counters. The instruments sit in a singleton because the decorators are scoped.

Game sessions carry their own meter, `GameSessions.MeterName`, registered in `AddTablier()` rather than in `Ahlcg.ServiceDefaults` — service defaults are shared with `Ahlcg.Migrator`, which has no sessions to measure. `AddOpenTelemetry()` is idempotent, so calling it again after `AddServiceDefaults()` appends rather than replaces. Two things about those instruments are worth knowing before changing them:

- **The active-session count is an `ObservableGauge`, not an `UpDownCounter`.** The registry can simply be asked how many it holds, so a callback cannot drift; a counter needs a matching decrement at every exit path and is permanently wrong the first time one is missed.
- **The per-session histograms are recorded after the CAS succeeds, never inside the retry loop.** A contended swap retries, and a `Record()` inside the loop is counted once per attempt. They also record the session's *peak* member count, not its final one — the final one is always zero, that being why the session ended.
- Standard resilience handler for outbound `HttpClient`s, plus service discovery.
- `MapDefaultEndpoints()` maps `/health` (all checks) and `/alive` (checks tagged `live`) **only in Development** — it returns early otherwise, by design.

The frontend owns user-facing wording and localization. Use HTTP statuses and stable machine-readable reason codes in backend error responses.

Errors use `AddProblemDetails()`, with one exception: `AuthEndpoints` returns `BadRequest<IdentityResult>` rather than ProblemDetails on validation failures.

## Logging

**Every decision the server makes must get a log line.** A branch that refuses, a branch that changes state, and a branch that answers "nothing to do" must each say *which* branch it was. This matters most where responses are deliberately vague, such as join refusals or wrong-password and lockout responses. This is the required standard, not complete current coverage: some unauthorized branches still return without an application log. New code that adds a branch without a log line is incomplete. Existing gaps are tracked in [#757](https://github.com/rombolshak/ahlcg/issues/757).

What is already logged, so do not log it again: unhandled exceptions (the exception handler logs them at `Error`), exceptions out of the hub's `OnConnectedAsync`/`OnDisconnectedAsync`, EF commands, and every request and hub invocation as a trace span.

**How.** Use source-generated `[LoggerMessage]` methods, never `logger.LogInformation(...)`. Declare them `private static partial` at the bottom of the class whose code calls them, making the class `partial` — there is no shared `Log` class. The method name is the event name, so name it after the outcome: `LogJoinRefusedGameFull`, not `LogJoin`.

- **Getting a logger.** Endpoint handlers take `ILogger<T>` as their **last** parameter. The endpoint classes are `static` and cannot be a type argument, so `T` is the entity the file's routes serve — `ILogger<Game>` in `GameEndpoints`, `ILogger<AppUser>` in `AuthEndpoints`. A static helper or the hub's static `Connect`/`Disconnect` takes a plain `ILogger` from its caller; a class with a constructor injects `ILogger<ItsOwnType>`.
- **Levels.** `Information` for outcomes, refusals the client caused included (a full game, a seat count too low). `Warning` for anything security-relevant or that should not happen: a non-member reaching a game, a failed password, throttling, a live session whose game row is gone. `Debug` for idempotent no-ops (a repeated `Idempotency-Key`, joining a game you already belong to). `Error` is for exceptions, which the framework already covers.
- **Properties, not prose.** Everything variable is a named placeholder — `{GameId}`, `{UserId}` — so it can be filtered on in the Aspire dashboard. Keep the names consistent across files.
- **Log after the commit.** By default, keep outcome logs outside CAS loops and execution-strategy lambdas so one outcome does not log once per attempt. Join outcome logs run after the execution strategy returns. `GameHistory<TState>.TryAppend` and `ReadHistoryAt` keep decision logs beside their branches inside the execution strategy. Append success and snapshot logs follow a successful `TrySave`. These history logs can repeat on an execution-strategy retry.

**What never goes into a log:** an email, a user name, an IP address, a password, a cookie, or an invite code — a logged code can be redeemed by anyone who reads the logs. Ids are fine. For Identity failures, log the `IdentityError.Code`, never its `Description`, which can echo the input back.

**Tests.** A log line is not normally asserted on. The exception is a branch whose log is its only observable difference — the join refusals, a hub connection turned away. There, pass a `FakeLogger<T>` (`Microsoft.Extensions.Diagnostics.Testing`) and assert `LatestRecord.Id.Name` equals the method name. Everywhere else, pass `NullLogger<T>.Instance`.

In Development, `appsettings.Development.json` lowers the `Ahlcg` and `Tablier` categories to `Debug`; production keeps `Information`.

## Configuration

`appsettings.json` / `appsettings.Development.json`, overridden by environment variables. Aspire supplies the `ahlcg` and `cache` connection strings and the OTLP endpoint at run time.
