# Ahlcg

Fan-made, rules-compliant digital implementation of Arkham Horror: The Card Game. Monorepo:

- **`frontend/`** — Angular 22 SPA. Zoneless, signal-based, `@ngrx/signals` store, arktype validation, RFC6902 patching, GSAP Flip animations, Tailwind 4 + daisyUI, Transloco i18n, Storybook + Chromatic.
- **`backend/`** — .NET 10. ASP.NET Core Minimal APIs with Identity (cookie sessions), EF Core + PostgreSQL, SignalR, OpenTelemetry, orchestrated for local development by .NET Aspire.

## Where the project actually stands

The backend implements **authentication and game records only** — creating a game, listing the ones you are a member of, and fetching the most recent. The frontend calls those three from the main menu; the game view is the active work and renders from a **hardcoded fixture** (`@testing/test-game-state`). There is no API for game *state*, no SignalR client, and no deployment pipeline. Do not write code that assumes otherwise.

## Documentation

Start at **[docs/README.md](docs/README.md)**, which routes to the right file for a given task.

Before changing frontend code, read [docs/frontend-conventions.md](docs/frontend-conventions.md) — the codebase uses `input()`/`output()`, `@if`/`@for`, `inject()`, the `ah` selector prefix, and `OnPush` everywhere, with no exceptions.
