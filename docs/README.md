# Ahlcg Documentation

Reference docs for agents working in this repository. Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc.

## Read this first

The backend implements **authentication and game creation** (`POST /games`) — nothing more. The frontend game view renders from a **hardcoded fixture** (`@domain/testing/test-game-state`), not from the server, and nothing in the frontend calls the games API. There is no API for game *state*, no SignalR client, and no deployment pipeline. Do not write code that assumes any of them exist.

## Which file do I need?

| Task | Read |
| --- | --- |
| Any frontend code change | [frontend-conventions.md](frontend-conventions.md) — mandatory, then the relevant file below |
| Understand how the pieces connect | [architecture.md](architecture.md) |
| Add/modify a component, service, route, translation, style | [frontend.md](frontend.md) |
| Touch the game state store, patches, or animations | [state-store.md](state-store.md) |
| Add/modify a backend endpoint, entity, or migration | [backend.md](backend.md) |
| Call an endpoint or the SignalR hub | [api.md](api.md) |
| Write or debug a test, or decide which tier a new test belongs in | [testing.md](testing.md) |
| Run things, ports, CI, git hooks | [workflow.md](workflow.md) |
| Build a feature with Claude Code (issues, commands, plan gate) | [ai-workflow.md](ai-workflow.md) |
| Auth model, cookies, secrets, production hardening | [security.md](security.md) |
| Unfamiliar card-game term | [glossary.md](glossary.md) |

## Conventions in these docs

- Paths are repo-relative (`frontend/src/app/...`) or use the TypeScript aliases the code uses (`@domain/...`).
- Code samples appear only where the shape is project-specific and non-obvious. Everything else points at the real file — read it instead of trusting a paraphrase.
- Sections describing unimplemented features are omitted, not marked "planned".
