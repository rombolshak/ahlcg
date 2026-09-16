# Ahlcg Documentation

Reference docs for agents working in this repository. Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc.

## Read this first

The backend implements **authentication and game records** — creating a game, listing the ones you are a member of, and fetching the most recent — nothing more. The frontend calls those from the main menu and the Case files screen; the game view itself renders from a **hardcoded fixture** (`@domain/testing/test-game-state`), not from the server. There is no API for game *state*, no SignalR client, and no deployment pipeline. Do not write code that assumes any of them exist.

## Which file do I need?

| Task | Read |
| --- | --- |
| Any code change, any language | [comments.md](comments.md) — when a comment is warranted, which is rarely |
| Any frontend code change | [frontend-conventions.md](frontend-conventions.md) — mandatory, then the relevant file below |
| Understand how the pieces connect | [architecture.md](architecture.md) |
| Add/modify a component, service, route, translation, style | [frontend.md](frontend.md) |
| Touch the game state store, patches, or animations | [state-store.md](state-store.md) |
| Add/modify a backend endpoint, entity, or migration | [backend.md](backend.md) |
| Call an endpoint | `/openapi/v1.json` (or `/scalar/v1`) — then [api.md](api.md) for the SignalR hub and what the spec omits |
| Write or debug a test, or decide which tier a new test belongs in | [testing.md](testing.md) |
| Run things, ports, CI, git hooks | [workflow.md](workflow.md) |
| Build a feature with Claude Code (issues, commands, plan gate) | [ai-workflow.md](ai-workflow.md) |
| Auth model, cookies, secrets, production hardening | [security.md](security.md) |
| Unfamiliar card-game term | [glossary.md](glossary.md) |

## Conventions in these docs

- Paths are repo-relative (`frontend/src/app/...`) or use the TypeScript aliases the code uses (`@domain/...`).
- Code samples appear only where the shape is project-specific and non-obvious. Everything else points at the real file — read it instead of trusting a paraphrase.
- Sections describing unimplemented features are omitted, not marked "planned".
- **An endpoint is documented in the OpenAPI spec, never in markdown.** Request and response shapes, status codes and per-route semantics belong in `.WithDescription()` / `.Produces()` on the endpoint itself, so they ship with `/openapi/v1.json` and cannot drift from the code. [api.md](api.md) carries only what the spec structurally cannot: routes deliberately left out, the SignalR hub, and the non-Development endpoints.
