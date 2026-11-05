# Architecture

## What exists

| Area | Status |
| --- | --- |
| Auth (anonymous login, sign-in and anonymous upgrade, logout, session info) | Implemented, backend + frontend |
| Game view UI (board, investigator panel, cards, animations) | Implemented, driven by a local fixture, and not routed: `/game/:id` renders the fixture game view below |
| Game state stores with RFC6902 patching and arktype validation | Shared server-envelope session store for the routed fixture; separate local store for the unrouted Arkham board |
| Fixture game view (`/game/:id`: shared counter, own secret, other members by name, journal) | Implemented, renders the server's fixture view. Scaffolding until the Arkham board takes server state (#151) |
| Game records: create, list recent and completed, fetch the latest (`/games`) | Implemented, backend + frontend. The main menu creates and continues games; Case files lists them. Nothing sets a game completed yet |
| Persistence and step loop of game *state* within a game | Implemented, backend only, against the fixture rules module: history begins on game creation, `GetState` and `Execute` on the hub, a `StateChanged` delta per committed game version and engine-only envelope revision. Internal history supports snapshot-plus-patch reconstruction of physical versions and append-only exact restoration with checkpoint and restored-version metadata; compact checkpoint/undo metadata is maintained incrementally and rebuilt from live-history SQL. Restoration is not exposed through the engine, hub or UI. No Arkham rules; the only frontend consumer is the fixture game view, which also calls `Execute` |
| SignalR | Server hub with in-memory game sessions, one group per game and one per member, versioned presence/invite data inside the session envelope, and the step loop above; the client pulls complete member-private envelopes on connect, reconnect, gaps and generation resets, validates them, and emits ordered state events |
| Deployment | **Does not exist**. Aspire is local-dev orchestration only |

`GameViewComponent.ngOnInit` calls `this.gameState.setState(testGameState)` — the board is populated from `@domain/testing/test-game-state`. Patches are replayed locally by `DebugTimelineService`, not received from a server. No route reaches it today.

## Components

```
frontend/  Angular 22 SPA          →  /api/*  →  backend/Ahlcg.ApiService  →  PostgreSQL
                                        (dev proxy)        (Minimal API + Identity + SignalR)
```

Local orchestration (`backend/Ahlcg.AppHost`, .NET Aspire), in dependency order:

1. `postgresdb` (Postgres container) with PgAdmin, exposing database `ahlcg`
2. `cache` (Valkey container) — the reconstructible session-envelope cache
3. `migrator` — applies EF migrations, then exits (`WaitForCompletion`)
4. `apiservice` — the API, health-checked on `/health`
5. `webfrontend` — the Angular dev server, started via `AddViteApp(..., "start")`

Aspire injects `services__apiservice__http__0` into the frontend process. `frontend/proxy.conf.js` reads that variable as the proxy target and rewrites `/api/*` → `*` on the API, including the SignalR hub. Running `npm start` without Aspire leaves the target undefined, so API calls fail. The routed fixture game requires the server; only the unrouted Arkham board uses a local fixture.

## API instance boundary

Only one API instance is supported. `GameSessions` keeps connection presence and invite codes in process, invite-code uniqueness uses a local lock, and SignalR has no backplane. `GameMutationRegistry` provides a process-local per-game mutation gate; envelope cache writes compare synchronization identity and revision. Neither supplies cross-instance coordination.

Before adding another API replica, address these areas together:

- **Game mutation coordination:** replace the local gate with coordination shared by every writer, covering hub commands, membership endpoints, session changes, and cache reconstruction. Preserve the database head check and prevent obsolete cache generations from publishing updates.
- **Presence and invite codes:** share connection ownership and first/last-connection accounting across instances, reap connections after instance failure, and make invite-code assignment, lookup, rotation, and uniqueness work across replicas.
- **SignalR delivery:** configure a backplane or managed SignalR service and the required connection affinity. Broadcasts and member removal must reach connections owned by other instances.
- **Envelope publication:** preserve atomic cache updates and per-game revision ordering across writers. A database commit followed by a cache or delivery failure needs recovery without executing the game command again; a backplane alone does not provide that guarantee.
- **Membership revocation:** coordinate current-membership authorization, group removal, proposal invalidation, and invite-code rotation across instances. A connection admitted by another instance must not retain access after removal.
- **Cookie authentication:** configure shared Data Protection keys and a consistent application identity so each instance can read the existing authentication cookies.
- **Verification:** run tests with at least two API instances for competing commands and votes, cross-instance delivery and removal, multiple tabs, instance failure, cache loss, and reconnect synchronization.

The existing [backend session and failure-boundary documentation](backend/backend.md) describes the current implementation. This list records prerequisites for lifting the single-instance restriction; it does not claim replica support.

## Stack

| Frontend | | Backend | |
| --- | --- | --- | --- |
| Angular | 22.2.x (zoneless, standalone) | .NET | 10.0 |
| State | `@ngrx/signals` | Web | ASP.NET Core Minimal APIs |
| Validation | arktype | Auth | ASP.NET Identity, cookie sessions |
| Patching | `rfc6902` + `immer` | ORM | EF Core 10.0 + Npgsql |
| Animation | GSAP (+ Flip plugin) | Real-time | SignalR (`AspNetCore.SignalR.OpenTelemetry`) |
| Styling | Tailwind CSS 4 + daisyUI 5 | Docs | OpenAPI + Scalar (dev only) |
| i18n | Transloco | Telemetry | OpenTelemetry via `Ahlcg.ServiceDefaults` |
| Tests | Vitest + happy-dom | Tests | xUnit + Moq + coverlet; Aspire.Hosting.Testing (integration) |
| Components | Storybook 10 + Chromatic | Orchestration | .NET Aspire (dev only) |
| Errors | Bugsnag | | |

Other notable frontend deps: `@panzoom/panzoom` (board pan/zoom), `vanilla-jsoneditor` (debug panel), `deep-object-diff` (settings), `@toolwind/anchors` (CSS anchor positioning).

## Data flow: signing in

1. `MainMenuComponent` reads `AuthService.currentUser` (a `BehaviorSubject` seeded by a `GET /api/auth/info` on construction).
2. `401` is mapped to `undefined` — that is the "logged out" signal, not an error.
3. Menu items switch on `currentUser() !== undefined`.

`authInterceptor` catches a `401` from any call except `GET /api/auth/info`, opens the sign-in prompt through `DialogService`, and **replays the original request** once the user is authenticated. An `HttpContextToken` marks the replay so a second `401` fails instead of looping. A dialog dismissed without signing in rethrows the original error. Resources keyed on the current user, such as Case files, skip requests while signed out.

There is no auth guard and no token handling: the session is the `AspNetCore.Identity.Application` cookie, sent automatically.

## Data flow: game state

See [state-store.md](frontend/state-store.md). The routed fixture page uses `withGameSession` for confirmed server envelopes, engine metadata and optimistic game actions. The separate Arkham board uses `GameStateStore`: `setState` installs its local fixture without runtime validation; `updateState(Operation[])` applies patches, validates the result, and animates it with GSAP Flip.
