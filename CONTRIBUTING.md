## Project Overview

A full‑stack monorepo for a living card game UI and engine:
- Backend: ASP.NET Core Minimal APIs with Identity (cookie auth), SignalR, and EF Core (PostgreSQL), orchestrated for local dev via .NET Aspire.
- Frontend: Angular 20 SPA with strict TypeScript, Transloco i18n, Storybook, and Chromatic. Client state uses `@ngrx/signals`, validated with `arktype`, and applies RFC6902 patches with smooth GSAP Flip animations.

## Documentation 

- Start here: [docs/index.md](docs/index.md)
  - Overview: [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
  - Setup & Run: [docs/SETUP_AND_RUN.md](docs/SETUP_AND_RUN.md)
  - Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
  - Tech Stack: [docs/TECH_STACK.md](docs/TECH_STACK.md)
  - Build & Release: [docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md)
  - Dev Workflow: [docs/DEV_WORKFLOW.md](docs/DEV_WORKFLOW.md)
  - Security & Secrets: [docs/SECURITY_AND_SECRETS.md](docs/SECURITY_AND_SECRETS.md)
  - Testing: [docs/TESTING.md](docs/TESTING.md)
  - FAQ / Open Questions: [docs/FAQ_AND_OPEN_QUESTIONS.md](docs/FAQ_AND_OPEN_QUESTIONS.md)
