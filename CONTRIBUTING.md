## Project Overview

A full‑stack monorepo for a living card game UI and engine:
- Backend: ASP.NET Core Minimal APIs with Identity (cookie auth), SignalR, and EF Core (PostgreSQL), orchestrated for local dev via .NET Aspire.
- Frontend: Angular 20 SPA with strict TypeScript, Transloco i18n, Storybook, and Chromatic. Client state uses `@ngrx/signals`, validated with `arktype`, and applies RFC6902 patches with smooth GSAP Flip animations.

## Documentation 

- Start here: [docs/00_index/README.md](docs/00_index/README.md)
  - Glossary: [docs/00_index/glossary.md](docs/00_index/glossary.md)
  - System Map: [docs/00_index/system_map.md](docs/00_index/system_map.md)
  - Product Overview: [docs/01_product/overview.md](docs/01_product/overview.md)
  - Auth Flow: [docs/01_product/flows/authentication.md](docs/01_product/flows/authentication.md)
  - Architecture Overview: [docs/02_architecture/overview.md](docs/02_architecture/overview.md)
  - Frontend Architecture: [docs/02_architecture/frontend.md](docs/02_architecture/frontend.md)
  - Backend Architecture: [docs/02_architecture/backend.md](docs/02_architecture/backend.md)
  - Implementation (frontend): [docs/03_implementation/frontend/ui_patterns.md](docs/03_implementation/frontend/ui_patterns.md)
  - Implementation (backend): [docs/03_implementation/backend/services.md](docs/03_implementation/backend/services.md)
  - Testing: [docs/04_testing/strategy.md](docs/04_testing/strategy.md)
  - Operations: [docs/05_operations/build_and_release.md](docs/05_operations/build_and_release.md)
  - Reference: [docs/99_reference/api.md](docs/99_reference/api.md)
