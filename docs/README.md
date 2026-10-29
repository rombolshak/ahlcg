# Ahlcg Documentation

Reference docs for agents working in this repository. Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc.

## Read this first

The backend implements **authentication and game records** — creating a game, listing the ones you are a member of, and fetching the most recent — nothing more. The frontend calls those from the main menu and the Case files screen; `/game/:id` renders a **fixture game view** from the server's state, while the Arkham board still renders a **hardcoded fixture** (`@domain/testing/test-game-state`) and is unrouted. The SignalR client carries game state opaquely: it pulls it with `GetState` on connect and reconnect and emits version-ordered `StateChanged` events, and the fixture game view's store interprets them. Creating a game begins its history, and the hub's `GetState` and `Execute` serve and advance it (see [api.md](backend/api.md#signalr-game)), and the fixture game view calls `Execute` when a player chooses an action. There is no deployment pipeline. Do not write code that assumes the Arkham board consumes game state, or that a deployment exists.

## Which file do I need?

| Task | Read |
| --- | --- |
| Any code change, any language | [comments.md](practice/comments.md) — when a comment is warranted, which is rarely |
| Add a file or folder, any language | [code-layout.md](practice/code-layout.md) — at most six entries per folder |
| Any frontend code change | [frontend-conventions.md](frontend/frontend-conventions.md) — mandatory, then the relevant file below |
| Understand how the pieces connect | [architecture.md](architecture.md) |
| Add/modify a component, service, route, translation, style | [frontend.md](frontend/frontend.md) |
| Write or change any string a user reads | [voice-and-tone.md](practice/copy/voice-and-tone.md) — then run `/wording`; copy is not written in passing |
| Translate the UI into another language | [translating.md](practice/copy/translating.md) — the brief for a human translator; agents write English only |
| Touch the game state store, patches, or animations | [state-store.md](frontend/state-store.md) |
| Add/modify a backend endpoint, entity, or migration; log anything on the backend | [backend.md](backend/backend.md) — [Logging](backend/backend.md#logging) for the latter |
| Call an endpoint | `/openapi/v1.json` (or `/scalar/v1`) — then [api.md](backend/api.md) for the SignalR hub and what the spec omits |
| Write or debug a test, or decide which tier a new test belongs in | [testing.md](practice/testing.md) |
| Run things, ports, CI, git hooks | [workflow.md](practice/workflow.md) |
| Build a feature with Claude Code (issues, commands, plan gate) | [ai-workflow.md](practice/ai-workflow.md) |
| Auth model, cookies, secrets, production hardening | [security.md](backend/security.md) |
| Unfamiliar card-game term | [glossary.md](glossary.md) |

## Conventions in these docs

- Paths are repo-relative (`frontend/src/app/...`) or use the TypeScript aliases the code uses (`@domain/...`).
- Code samples appear only where the shape is project-specific and non-obvious. Everything else points at the real file — read it instead of trusting a paraphrase.
- Sections describing unimplemented features are omitted, not marked "planned".
- **An endpoint is documented in the OpenAPI spec, never in markdown.** Request and response shapes, status codes and per-route semantics belong in `.WithDescription()` / `.Produces()` on the endpoint itself, so they ship with `/openapi/v1.json` and cannot drift from the code. [api.md](backend/api.md) carries only what the spec structurally cannot: routes deliberately left out, the SignalR hub, and the non-Development endpoints.
