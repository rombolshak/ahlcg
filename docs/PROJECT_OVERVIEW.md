# Ahlcg — Project Overview

INFERENCE: Ahlcg is a full‑stack application centered on representing and interacting with a living card game state (e.g., investigators, acts, agendas, enemies, locations). It comprises an Angular SPA frontend and an ASP.NET Core backend that provides authentication and a real‑time SignalR hub, with PostgreSQL for persistence and a .NET Aspire AppHost orchestrating local development. Certainty: medium.

Evidence:
- Backend Minimal API + Identity + EF Core + SignalR:
  - backend/Ahlcg.ApiService/Program.cs (service setup, auth, SignalR, OpenAPI dev mapping)
  - backend/Ahlcg.ApiService/AuthEndpoints.cs (route group + auth flow)
  - backend/Ahlcg.ApiService/GameHub.cs (authorized SignalR hub)
  - backend/Ahlcg.ApiService/ApplicationDbContext.cs (IdentityDbContext<AppUser>)
  - backend/Ahlcg.ApiService/Migrations/* (Identity schema + IsAnonymous column)
- Frontend Angular SPA with typed domain model and store:
  - frontend/src/app/shared/domain/game-state.ts (domain model + validators)
  - frontend/src/app/pages/game-view/store/game-state.store.ts (signals store, patching, validation)
  - frontend/src/app/app.config.ts (providers, Transloco, Bugsnag init)
- Orchestration for local dev:
  - backend/Ahlcg.AppHost/AppHost.cs (Aspire: Postgres, Migrator, API, Angular dev server)

## High-level Architecture

```
+-------------------------------+          +----------------------+
|  Angular Frontend (SPA)       |  HTTP    |  ASP.NET Core API    |
|  - Routing, UI, i18n          +--------->+  - Minimal APIs      |
|  - GameStateStore (signals)   |          |  - Identity + EF     |
|  - Storybook/Chromatic        |  WebSock |  - SignalR Hub (/game)
+---------------+---------------+<-------->+----------------------+
                |                                 |
                |                                 v
                |                        +------------------+
                |                        | PostgreSQL (EF)  |
                |                        | Identity schema   |
                v                        +------------------+
+-------------------------------+
| .NET Aspire AppHost           |
| - Orchestrates Postgres,      |
|   Migrator, API, Frontend     |
| - Health checks and startup   |
+-------------------------------+
```

Mapping to code and locations:
- Frontend SPA: Angular 20 (TypeScript)
  - Main app: frontend/
  - Routes and pages: frontend/src/app/pages/**
  - Game domain model and validators: frontend/src/app/shared/domain/**
  - State store: frontend/src/app/pages/game-view/store/game-state.store.ts
  - Evidence: frontend/package.json (Angular deps), tsconfig.json (strict settings)
- Backend API: ASP.NET Core Minimal APIs + Identity + EF Core
  - Service: backend/Ahlcg.ApiService
  - Entrypoint and endpoint mapping: Program.cs
  - Auth endpoints and `AppUser`: AuthEndpoints.cs
  - SignalR hub: GameHub.cs
  - DbContext and migrations: ApplicationDbContext.cs, Migrations/*
- Migrator (EF migrations runner):
  - backend/Ahlcg.Migrator (BackgroundService applies EF migrations on start)
- AppHost (local dev orchestration):
  - backend/Ahlcg.AppHost/AppHost.cs (adds Postgres, Migrator, API, and runs frontend dev server via npm start)

Additional notes and evidence:
- OpenAPI (dev only) documented and served using Scalar UI
  - backend/Ahlcg.ApiService/Program.cs (app.MapOpenApi(), app.MapScalarApiReference())
- Health checks (dev only): /health and /alive
  - backend/Ahlcg.ServiceDefaults/Extensions.cs (MapHealthChecks, OTel setup)
- CI/CD (GitHub Actions):
  - .github/workflows/ci.yml (path-filtered)
  - .github/workflows/backend.yml and frontend.yml (build/test/coverage)
  - .github/workflows/chromatic.yml (storybook + Chromatic)

## Primary services and locations (path → purpose)

- backend/Ahlcg.ApiService → ASP.NET Core Minimal API service (auth endpoints, /game SignalR hub)
- backend/Ahlcg.Migrator → Background worker to apply EF migrations at startup
- backend/Ahlcg.AppHost → .NET Aspire app host (orchestrates Postgres, Migrator, API, and frontend dev server)
- backend/Ahlcg.ServiceDefaults → Shared OTel, health checks, resilience and discovery utilities
- frontend/ → Angular SPA (routes, components, strict TS config, signals store, Transloco)
- .github/workflows/* → CI (split frontend/backend), Chromatic, coverage and SonarCloud integration

## Key start/run commands

- All-in-one local dev via Aspire (recommended):
  1) cd backend/Ahlcg.AppHost
  2) dotnet restore
  3) dotnet run
  This brings up Postgres (+PgAdmin), runs migrations, starts API and the frontend (npm start).

- Frontend only:
  1) cd frontend
  2) npm ci
  3) npm start

- Backend only (if Postgres already running and configured):
  1) cd backend/Ahlcg.ApiService
  2) dotnet restore
  3) dotnet run

Evidence:
- backend/Ahlcg.AppHost/AppHost.cs (AddPostgres + AddDatabase + AddProject + AddViteApp("...","../../frontend","start"))
- frontend/package.json ("start": "ng serve")

## Top 5 risks or unknowns

1) Production deployment strategy is undefined (Aspire is oriented to local dev).
   - Impact: Without Dockerfiles/IaC or hosting config, production rollout cannot proceed.
   - Evidence: No deployment manifests; only AppHost orchestration.

2) CORS and cookie auth for SPA+API are not configured.
   - Impact: Cross-origin login may fail or be insecure without proper CORS and cookie SameSite/Secure settings.
   - Evidence: backend/Ahlcg.ApiService/Program.cs lacks AddCors/UseCors and cookie policy configuration for cross-origin.

3) Bugsnag API keys are hardcoded in the frontend.
   - Impact: Keys are public; environment separation and key rotation are required.
   - Evidence: frontend/src/app/app.config.ts (Bugsnag.start with apiKey literal).

4) Domain API surface and real-time contract are incomplete.
   - Impact: Frontend currently uses test data; back-end has no domain endpoints beyond auth; SignalR hub is a stub (Ping).
   - Evidence: frontend/src/app/pages/game-view/game-view.component.ts (testGameState); backend/Ahlcg.ApiService/GameHub.cs (Ping only).

5) AppHost uses AddViteApp to run Angular CLI dev server (ng serve).
   - Impact: Semantic mismatch could cause confusion or integration quirks; confirm support or switch to a generic npm app host helper.
   - Evidence: backend/Ahlcg.AppHost/AppHost.cs (AddViteApp(..., "start")); frontend/package.json ("start": "ng serve").

For open questions and decisions, see: docs/FAQ_AND_OPEN_QUESTIONS.md

## Related documentation

- docs/TECH_STACK.md — Detailed languages, frameworks, runtimes, and CI tooling.
- docs/SETUP_AND_RUN.md — Step-by-step local development setup and commands.
- docs/ARCHITECTURE.md — Components, data flow, endpoints, and patterns.
- docs/BUILD_AND_RELEASE.md — CI, build, coverage, and proposed release steps.
- docs/DEV_WORKFLOW.md — Commands, hooks, and debugging tips.
- docs/SECURITY_AND_SECRETS.md — Auth, secrets, observability, and security notes.
- docs/TESTING.md — Unit/visual test layout and how to run them.