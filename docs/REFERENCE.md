# Reference Map

Quick reference of important files and directories in the Ahlcg monorepo. Paths are relative to the repository root.

## Backend (.NET)

- Solution and workspace
  - backend/Ahlcg.sln — Visual Studio solution aggregating all backend projects
  - backend/.aspire/settings.json — Points to the AppHost project for Aspire

- AppHost (local orchestration with .NET Aspire)
  - backend/Ahlcg.AppHost/AppHost.cs — Orchestrates Postgres (+PgAdmin), Migrator, API, and Frontend dev server
  - backend/Ahlcg.AppHost/Ahlcg.AppHost.csproj — AppHost SDK, target framework, references

- API Service (ASP.NET Core Minimal APIs + Identity + SignalR)
  - backend/Ahlcg.ApiService/Program.cs — Service configuration, endpoint mapping, OpenAPI (dev), SignalR hub
  - backend/Ahlcg.ApiService/AuthEndpoints.cs — Auth route group: /auth/info, /auth/loginAnonymously, /auth/linkCredentials, /auth/logout
  - backend/Ahlcg.ApiService/GameHub.cs — Authorized SignalR hub at /game (Ping demo)
  - backend/Ahlcg.ApiService/ApplicationDbContext.cs — EF Core DbContext (IdentityDbContext<AppUser>)
  - backend/Ahlcg.ApiService/appsettings.json — Base app settings
  - backend/Ahlcg.ApiService/appsettings.Development.json — Dev-specific settings
  - backend/Ahlcg.ApiService/Migrations/* — EF Core migrations (Identity schema + IsAnonymous column)
  - backend/Ahlcg.ApiService/Ahlcg.ApiService.csproj — Dependencies (Identity, EF Core Npgsql, OpenAPI, Scalar, SignalR OTel)

- Service Defaults (shared observability, health, resilience)
  - backend/Ahlcg.ServiceDefaults/Extensions.cs — OpenTelemetry setup (logs, metrics, traces), health checks (/health, /alive), service discovery & resilience
  - backend/Ahlcg.ServiceDefaults/Ahlcg.ServiceDefaults.csproj — Shared project (framework reference + OTel, resilience packages)

- Migrator (applies EF Core migrations at startup)
  - backend/Ahlcg.Migrator/Program.cs — Hosted service wiring
  - backend/Ahlcg.Migrator/Worker.cs — Runs `Database.MigrateAsync()` then stops application
  - backend/Ahlcg.Migrator/Ahlcg.Migrator.csproj — EF Npgsql Aspire package reference

- Backend unit tests
  - backend/unit-tests/Ahlcg.ApiService.Tests/Ahlcg.ApiService.Tests.csproj — xUnit, Moq, test SDK
  - backend/unit-tests/Ahlcg.ApiService.Tests/AuthEndpointsTests.cs — Tests covering auth flow (anonymous login, linking, logout, info)

## Frontend (Angular)

- Project configuration and scripts
  - frontend/package.json — Scripts (start/build/test/lint/storybook), Angular + tooling dependencies
  - frontend/angular.json — Angular builders for build/serve/test/storybook
  - frontend/eslint.config.js — Flat ESLint config (Angular, TS, Tailwind rules, JSON, Jasmine)
  - frontend/karma.conf.cjs — Karma runner (Jasmine, Chrome/Headless, coverage reporters)
  - frontend/tsconfig.json — Base TS config (strict, paths, module resolution)
  - frontend/tsconfig.app.json — App build tsconfig
  - frontend/tsconfig.spec.json — Test tsconfig
  - frontend/transloco.config.ts — Global Transloco config (translations path and languages)

- App entry and providers
  - frontend/src/app/app.config.ts — Angular providers: HttpClient, Router, Transloco, Bugsnag init, zoneless CD
  - frontend/src/app/app.routes.ts — Routes: '' (MainMenu), 'game/:id' (GameView)

- Pages and core UI flows
  - frontend/src/app/pages/main-menu/* — Main menu components
  - frontend/src/app/pages/game-view/game-view.component.ts — Game view container; initializes store with `testGameState`
  - frontend/src/app/pages/game-view/store/game-state.store.ts — @ngrx/signals store; state validation, RFC6902 patch application, GSAP Flip animations
  - frontend/src/app/pages/game-view/** — Panels, components, services, settings for game view

- Domain model and validation
  - frontend/src/app/shared/domain/game-state.ts — arktype schema, cross-entity validation helpers
  - frontend/src/app/shared/domain/** — Entities, IDs, constants, tests, and helpers

- Storybook and visual regression
  - frontend/.storybook/main.ts — Storybook configuration (Angular)
  - frontend/.storybook/preview.ts — Global decorators/providers for stories
  - frontend/storybook-static/ — Built Storybook output (generated)
  - frontend/coverage/ — Karma/coverage outputs (generated)

- Husky (client-side hooks)
  - frontend/.husky/pre-commit — Runs lint-staged when frontend/src changes are staged
  - frontend/.husky/pre-push — Runs frontend ci:all and backend build/test conditionally by path diffs

- Misc
  - frontend/public/ — Static assets (images, i18n, fonts)
  - frontend/scripts/ — Utility scripts (e.g., i18n helpers)
  - frontend/.vscode, .idea, .angular — Editor/Angular CLI artifacts (local/dev)

## CI/CD and Quality

- GitHub Actions (entry, split workflows, visual regression)
  - .github/workflows/ci.yml — Path-filtered orchestrator; runs backend and/or frontend workflows and final Coveralls aggregation
  - .github/workflows/backend.yml — .NET 10: restore/build/test with coverage; reportgenerator; SonarCloud; Coveralls
  - .github/workflows/frontend.yml — Node setup; npm ci; lint+test; SonarQube Scan; Coveralls
  - .github/workflows/chromatic.yml — Build Storybook and run Chromatic (visual regression)
  - .github/dependabot.yml — Dependency update automation (npm in /frontend)

## Observability, Health, and API Docs

- Observability (OpenTelemetry)
  - backend/Ahlcg.ServiceDefaults/Extensions.cs — Logging, metrics, tracing; SignalR instrumentation; optional OTLP exporter via `OTEL_EXPORTER_OTLP_ENDPOINT`

- Health checks (dev mapping)
  - backend/Ahlcg.ServiceDefaults/Extensions.cs — `/health`, `/alive` mapped only in Development by `MapDefaultEndpoints()`

- OpenAPI and Scalar UI (dev only)
  - backend/Ahlcg.ApiService/Program.cs — `app.MapOpenApi(); app.MapScalarApiReference();` inside `if (app.Environment.IsDevelopment())`

## Security and Secrets

- Identity cookies configuration
  - backend/Ahlcg.ApiService/Program.cs — `AddIdentityApiEndpoints<AppUser>()` and cookie options (90-day sliding expiration)

- AppHost user secrets (local dev)
  - backend/Ahlcg.AppHost/Ahlcg.AppHost.csproj — `<UserSecretsId>...</UserSecretsId>`

- Bugsnag (frontend; keys currently hardcoded)
  - frontend/src/app/app.config.ts — `Bugsnag.start({ apiKey: '...' })`, `BugsnagPerformance.start({ apiKey: '...' })`

## Coverage and Reports (Generated)

- Backend coverage (CI aggregate)
  - backend/coveragereport/ — HTML, Cobertura.xml, SonarQube.xml (generated by reportgenerator)

- Frontend coverage
  - frontend/coverage/ahlcg/ — lcov and HTML coverage (generated by Karma)

## Quick Paths by Concern

- API entry and endpoints: backend/Ahlcg.ApiService/Program.cs
- Auth flow (anonymous login, linking, logout): backend/Ahlcg.ApiService/AuthEndpoints.cs
- Real-time hub (SignalR): backend/Ahlcg.ApiService/GameHub.cs
- EF Core DbContext and migrations: backend/Ahlcg.ApiService/ApplicationDbContext.cs, backend/Ahlcg.ApiService/Migrations/*
- Local orchestration (DB, migrator, API, SPA): backend/Ahlcg.AppHost/AppHost.cs
- Observability/health defaults: backend/Ahlcg.ServiceDefaults/Extensions.cs
- Frontend state management and patches: frontend/src/app/pages/game-view/store/game-state.store.ts
- Frontend domain validation: frontend/src/app/shared/domain/game-state.ts
- Frontend routes and providers: frontend/src/app/app.routes.ts, frontend/src/app/app.config.ts
- CI entry and split workflows: .github/workflows/ci.yml, backend.yml, frontend.yml
- Visual regression: .github/workflows/chromatic.yml, frontend/.storybook/*