# Ahlcg Documentation

Reference docs for agents working in this repository. Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc.

## Read this first

Read [architecture.md — What exists](architecture.md#what-exists) for the current capability status. It distinguishes the routed, server-driven fixture game from the unrouted Arkham board and is the single status reference for project entry points.

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
| Build a feature with Codex or Claude Code (issues, skills/commands, plan gate) | [ai-workflow.md](practice/ai-workflow.md) |
| Auth model, cookies, secrets, production hardening | [security.md](backend/security.md) |
| Unfamiliar card-game term | [glossary.md](glossary.md) |

## Conventions in these docs

- Paths are repo-relative (`frontend/src/app/...`) or use the TypeScript aliases the code uses (`@domain/...`).
- Code samples appear only where the shape is project-specific and non-obvious. Everything else points at the real file — read it instead of trusting a paraphrase.
- Sections describing unimplemented features are omitted, not marked "planned".
- **An endpoint is documented in the OpenAPI spec, never in markdown.** Request and response shapes, status codes and per-route semantics belong in `.WithDescription()` / `.Produces()` on the endpoint itself, so they ship with `/openapi/v1.json` and cannot drift from the code. [api.md](backend/api.md) carries only what the spec structurally cannot: routes deliberately left out, the SignalR hub, and the non-Development endpoints.
