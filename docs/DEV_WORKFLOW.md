# Developer Workflow

This guide describes how to work productively in the Ahlcg monorepo: day‑to‑day commands, how the Git hooks behave, what CI runs, and practical debugging tips. Where helpful, evidence is included as short file references and snippets from this repository.

Contents
- Quick start
- Work locally (all-in-one vs. per-app)
- Common commands (backend and frontend)
- Git hooks (what runs automatically)
- CI behavior (what runs on PR/merge)
- Debugging tips and common pitfalls
- Linting, formatting, and type checks
- Testing and coverage
- Troubleshooting

---

## Quick start

Option A — All-in-one dev (recommended; orchestrated by .NET Aspire):
```
cd backend/Ahlcg.AppHost
dotnet restore
dotnet run
```
What this does:
- Starts PostgreSQL (with PgAdmin)
- Applies EF Core migrations via the Migrator
- Boots the API service with health checks
- Runs the Angular dev server (npm start)

Evidence:
- backend/Ahlcg.AppHost/AppHost.cs (AddPostgres, AddDatabase, AddProject for migrator and API, AddViteApp to run frontend start script)
- frontend/package.json — "start": "ng serve"

Option B — Run each app separately (requires your own DB when not using AppHost):
- Frontend:
  ```
  cd frontend
  npm ci
  npm start
  ```
- Backend API:
  ```
  cd backend/Ahlcg.ApiService
  dotnet restore
  dotnet run
  ```

---

## Work locally

### Frontend (Angular)
- Start dev server:
  ```
  npm start
  ```
- Build production bundle:
  ```
  npm run build
  ```
- Run tests (watch/headed locally):
  ```
  npm run test
  ```
- Run tests (CI/headless locally):
  ```
  npm run test:ci
  ```

Evidence:
- frontend/package.json
  - scripts: "start", "build", "test", "test:ci", "lint:*", "format"

### Backend (ASP.NET Core)
- Build and test:
  ```
  cd backend
  dotnet restore
  dotnet build
  dotnet test
  ```
- Run API only:
  ```
  cd backend/Ahlcg.ApiService
  dotnet run
  ```

Evidence:
- .github/workflows/backend.yml runs `dotnet restore`, `dotnet build`, `dotnet test` in CI

---

## Common commands

### Frontend quality checks
- Type checks:
  ```
  npm run lint:tsc:all
  ```
- ESLint:
  ```
  npm run lint
  ```
- Stylelint:
  ```
  npm run lint:style
  ```
- Spelling:
  ```
  npm run lint:spelling
  ```
- Prettier (check):
  ```
  npm run lint:format
  ```
- Prettier (write):
  ```
  npm run format
  ```
- All linters:
  ```
  npm run lint:all
  ```

Evidence:
- frontend/package.json (lint scripts and `ci:all` which runs lint + tests in CI)

### Storybook and visual review
- Run Storybook locally:
  ```
  npm run storybook
  ```
- Build Storybook static site:
  ```
  npm run build-storybook
  ```

Evidence:
- frontend/.storybook/main.ts
- .github/workflows/chromatic.yml builds Storybook and runs Chromatic

---

## Git hooks (Husky)

The repo uses Husky scripts under `frontend/.husky/`.

- Pre-commit:
  - If there are staged changes under `frontend/src`, runs `npx lint-staged` to format/lint staged files.
  - Evidence (abridged):
    ```
    frontend/.husky/pre-commit
    if git diff --cached --quiet -- frontend/src; then
      echo "No changes in frontend folder. Skipping frontend-specific tasks."
    else
      cd frontend
      npx lint-staged
    fi
    ```

- Pre-push:
  - Detects diff vs upstream ref.
  - If `frontend` changed, runs `npm run ci:all` in `frontend`.
  - If `backend` changed, runs `dotnet build` and `dotnet test` in `backend`.
  - Evidence (abridged):
    ```
    frontend/.husky/pre-push
    if git diff --name-only --quiet $ref HEAD -- frontend/src; then
      echo "No changes in frontend folder. Skipping frontend-specific tasks."
    else
      cd frontend
      npm run ci:all
    fi

    if git diff --name-only --quiet $ref HEAD -- backend/; then
      echo "No changes in backend folder. Skipping backend-specific tasks."
    else
      cd backend
      dotnet build
      dotnet test
    fi
    ```


## CI behavior (GitHub Actions)

Entry pipeline: `.github/workflows/ci.yml`
- Uses a path filter to decide whether to run backend and/or frontend workflows.
- Always concludes with a Coveralls “parallel-finished” step to aggregate coverage across jobs.

Evidence (abridged):
```
.github/workflows/ci.yml
filters:
  backend:
    - 'backend/**'
    - '.github/workflows/backend.yml'
  frontend:
    - 'frontend/src/**'
    - 'frontend/*.json'
    - '.github/workflows/frontend.yml'
```

Backend CI: `.github/workflows/backend.yml`
- Sets up .NET 10
- Restores, builds, tests with coverage
- Generates a coverage report (Cobertura, HTML, SonarQube formats)
- SonarCloud analysis and Coveralls upload

Frontend CI: `.github/workflows/frontend.yml`
- Sets up Node (latest)
- `npm ci --force` (note: workaround for Tailwind v4 with certain Angular builder versions)
- `npm run ci:all` (lint + tests)
- SonarCloud analysis and Coveralls upload

Chromatic: `.github/workflows/chromatic.yml`
- Builds Storybook and runs Chromatic visual regression with TurboSnap (requires `CHROMATIC_PROJECT_TOKEN` secret)

---

## Debugging tips

### Backend
- Developer exception page and OpenAPI/Scalar UI are enabled in Development:
  - Set `ASPNETCORE_ENVIRONMENT=Development`
  - Endpoints:
    - OpenAPI JSON + Scalar UI (dev)
    - Health checks: `/health` and `/alive` (dev)
  - Evidence:
    - backend/Ahlcg.ApiService/Program.cs — `app.MapOpenApi(); app.MapScalarApiReference(); app.UseDeveloperExceptionPage();`
    - backend/Ahlcg.ServiceDefaults/Extensions.cs — maps `/health` and `/alive` in Development

### Frontend
- Domain validation errors (arktype) are thrown if `GameStateStore` receives invalid patches or state. Check console output for `ArkErrors`.
  - Evidence:
    - frontend/src/app/pages/game-view/store/game-state.store.ts — `validateState` uses `gameState` schema
- Use Storybook to reproduce and visually debug components in isolation.
- If animations cause layout confusion during state updates, temporarily disable GSAP Flip animation in `updateState` to inspect state transitions.

---

## Common pitfalls

- Running the API without a Postgres connection when not using AppHost
  - Prefer `backend/Ahlcg.AppHost` during development.
- Cross-origin SPA/API in production without CORS and cookie policy configuration
  - The repo doesn’t currently set CORS or cookie SameSite/Secure explicitly. Plan this before deployment.
- Chromatic/Storybook requires the `CHROMATIC_PROJECT_TOKEN` in CI secrets.

---

## Linting, formatting, and type checks

Frontend:
- All checks:
  ```
  npm run lint:all
  ```
- Individually:
  ```
  npm run lint:tsc:all
  npm run lint
  npm run lint:style
  npm run lint:spelling
  npm run lint:format
  npm run format
  ```

Backend:
- Compiler warnings are treated as errors in the .csproj files. Keep code warning-free to avoid build failures.
  - Evidence:
    - backend/Ahlcg.ApiService/Ahlcg.ApiService.csproj — `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`
    - backend/Ahlcg.AppHost/Ahlcg.AppHost.csproj — same

---

## Testing and coverage

Backend:
```
cd backend
dotnet test
```
- In CI, coverage is produced and aggregated via reportgenerator and uploaded to Coveralls and SonarCloud.

Frontend:
```
cd frontend
npm run test      # local headed
npm run test:ci   # CI/headless
```
- Coverage reports are generated in `frontend/coverage/ahlcg` (lcov and HTML).

---

## Troubleshooting

- Angular dev server port conflicts:
  - Use a different port: `npm start -- --port 4300`
- Tailwind v4 resolution quirks in CI:
  - CI runs `npm ci --force` as a workaround (see `.github/workflows/frontend.yml` comment).
- Health endpoints/Swagger not accessible:
  - Confirm `ASPNETCORE_ENVIRONMENT=Development` when running locally.
- Husky hooks blocking pushes:
  - Fix lint/test issues.
- SignalR hub is present but client is not yet wired:
  - The API exposes `/game` hub with an authorized `Ping()`; front-end SignalR client integration is not implemented yet.

---

## Useful references (evidence)

- Orchestration: `backend/Ahlcg.AppHost/AppHost.cs`
- API entrypoint: `backend/Ahlcg.ApiService/Program.cs`
- Auth endpoints: `backend/Ahlcg.ApiService/AuthEndpoints.cs`
- SignalR hub: `backend/Ahlcg.ApiService/GameHub.cs`
- EF migrations: `backend/Ahlcg.ApiService/Migrations/*` and `backend/Ahlcg.Migrator/*`
- Frontend scripts and configuration: `frontend/package.json`, `frontend/angular.json`
- Lint configuration: `frontend/eslint.config.js`
- Test runner: `frontend/karma.conf.cjs`
- CI workflows: `.github/workflows/ci.yml`, `backend.yml`, `frontend.yml`, `chromatic.yml`
