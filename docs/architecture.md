# Architecture

## What exists

| Area | Status |
| --- | --- |
| Auth (anonymous login, sign-in, credential linking, logout, session info) | Implemented, backend + frontend |
| Game view UI (board, investigator panel, cards, animations) | Implemented, driven by a local fixture |
| Game state store with RFC6902 patching and arktype validation | Implemented, frontend only |
| Game creation (`POST /games`) and persistence of the game record | Implemented, backend only — no frontend client calls it |
| Game API / persistence of game *state* within a game | **Does not exist** |
| SignalR | Server hub with a single `Ping()`; **no client** (`@microsoft/signalr` is not a dependency) |
| Deployment | **Does not exist**. Aspire is local-dev orchestration only |

`GameViewComponent.ngOnInit` calls `this.gameState.setState(testGameState)` — the board is populated from `@domain/test/test-game-state`. Patches are replayed locally by `DebugTimelineService`, not received from a server.

## Components

```
frontend/  Angular 21 SPA          →  /api/*  →  backend/Ahlcg.ApiService  →  PostgreSQL
                                        (dev proxy)        (Minimal API + Identity + SignalR)
```

Local orchestration (`backend/Ahlcg.AppHost`, .NET Aspire), in dependency order:

1. `postgresdb` (Postgres container) with PgAdmin, exposing database `ahlcg`
2. `migrator` — applies EF migrations, then exits (`WaitForCompletion`)
3. `apiservice` — the API, health-checked on `/health`
4. `webfrontend` — the Angular dev server, started via `AddViteApp(..., "start")`

Aspire injects `services__apiservice__http__0` into the frontend process. `frontend/proxy.conf.js` reads that variable as the proxy target and rewrites `/api/*` → `*` on the API. **This is the only wiring between frontend and backend.** Running `npm start` without Aspire leaves the target undefined, so `/api` calls fail — the game view still works (fixture-driven), auth does not.

## Stack

| Frontend | | Backend | |
| --- | --- | --- | --- |
| Angular | 21.2 (zoneless, standalone) | .NET | 10.0 |
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

Anything else that needs an account does not check first. `authInterceptor` catches a `401` from any call except `GET /api/auth/info`, opens the sign-in prompt through `DialogService`, and **replays the original request** once the user is authenticated, so the caller resumes where it left off. An `HttpContextToken` marks the replay so a second `401` fails instead of looping. A dialog dismissed without signing in rethrows the original error.

There is no auth guard and no token handling: the session is the `AspNetCore.Identity.Application` cookie, sent automatically.

## Data flow: game state

See [state-store.md](state-store.md). Summary: `setState` installs a whole `GameState`; `updateState(Operation[])` applies RFC6902 patches through immer, re-validates the result with arktype, and wraps the change in a GSAP Flip transition.
