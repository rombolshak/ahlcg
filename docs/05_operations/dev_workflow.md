# Development Workflow

## Purpose
Quick reference for day-to-day development: starting services, running commands, using Git hooks, understanding CI behavior.

## When to Load
Read this when setting up your local environment, running tests, pushing code, or debugging build failures.

## Related Files
- [Build and Release](./build_and_release.md) — Detailed build/CI setup
- [Architecture Overview](../02_architecture/overview.md) — System components
- [Backend Services](../03_implementation/backend/services.md) — Backend code structure

---

## Quick Start

### Option A: All-in-One (Recommended)

```bash
cd backend/Ahlcg.AppHost
dotnet restore
dotnet run
```

**What starts:**
- PostgreSQL (with PgAdmin on http://localhost:15432)
- Database migrations (via Migrator project)
- Backend API (https://localhost:5001)
- Frontend dev server (http://localhost:4200)

Opens .NET Aspire Dashboard on http://localhost:18888 with links to all services.

### Option B: Services Separately

```bash
# Terminal 1: Frontend
cd frontend
npm ci
npm start
# → http://localhost:4200

# Terminal 2: Backend
cd backend/Ahlcg.ApiService
dotnet restore
dotnet run
# → https://localhost:5001
# → Swagger: https://localhost:5001/scalar/v1
```

Requires PostgreSQL running elsewhere (or use Docker).

---

## Common Commands

### Frontend

| Goal | Command |
|------|---------|
| Start dev server | `cd frontend && npm start` |
| Build for production | `npm run build` |
| Run tests (watch) | `npm run test` |
| Run tests (once) | `npm run test:ci` |
| Run all linters | `npm run lint:all` |
| Type check | `npm run lint:tsc:all` |
| ESLint | `npm run lint` |
| Stylelint | `npm run lint:style` |
| Spelling | `npm run lint:spelling` |
| Format (check) | `npm run lint:format` |
| Format (fix) | `npm run format` |
| Storybook | `npm run storybook` |
| Build Storybook | `npm run build-storybook` |
| All tests + lint (CI) | `npm run ci:all` |

### Backend

| Goal | Command |
|------|---------|
| Build | `cd backend && dotnet build` |
| Run all tests | `dotnet test` |
| Build and run API | `cd backend/Ahlcg.ApiService && dotnet run` |
| Run single test | `dotnet test --filter "TestName"` |
| Generate coverage | `dotnet test /p:CollectCoverage=true` |
| Add EF migration | `dotnet ef migrations add MigrationName` |
| Update database | `dotnet ef database update` |

---

## Git Hooks (Husky)

Located in `frontend/.husky/` (Node-based hooks).

### Pre-Commit

Automatically runs for frontend changes:

```bash
# Staged files in frontend/src are linted and formatted
npm run lint  # Validates syntax
npm run format  # Fixes formatting
```

**NEVER skip hooks**

### Pre-Push

Validates changes before allowing push:

**Frontend changes → Runs:**
```bash
cd frontend
npm run ci:all  # lint + test:ci
```

**Backend changes → Runs:**
```bash
cd backend
dotnet build
dotnet test
```

If tests or lint fail, push is blocked until fixed.

---

## CI Behavior (GitHub Actions)

### Entry Point: Path Filter

Workflow: `.github/workflows/ci.yml`

Runs on push/PR to `main`. Uses path detection:

- **backend=true** ← Any change to `backend/**` or `.github/workflows/backend.yml`
- **frontend=true** ← Any change to `frontend/src/**`, `frontend/*.json`, or `.github/workflows/frontend.yml`

Only changed parts are built and tested (faster feedback).

### Backend Workflow

Workflow: `.github/workflows/backend.yml`

**Runs if backend changed:**

1. Setup .NET 10
2. `dotnet restore`
3. `dotnet build`
4. `dotnet test` with coverage collection
5. Generate coverage reports (HTML, Cobertura, SonarQube)
6. SonarCloud analysis (requires `SONAR_TOKEN`)
7. Coveralls upload

**Artifacts:**
- Coverage reports at `backend/coveragereport/`
- Test failures visible in PR

### Frontend Workflow

Workflow: `.github/workflows/frontend.yml`

**Runs if frontend changed:**

1. Setup Node (latest)
2. `npm ci --force` (note: workaround for Tailwind 4 resolution)
3. `npm run ci:all` (lint + test:ci)
4. SonarCloud analysis
5. Coveralls upload

**Artifacts:**
- Coverage reports at `frontend/coverage/ahlcg/`
- Lint failures visible in PR

### Chromatic Workflow

Workflow: `.github/workflows/chromatic.yml`

**Runs on frontend asset/Storybook changes:**

1. Build Storybook
2. Upload to Chromatic for visual regression
3. Mark as failed if visual regressions detected

Requires `CHROMATIC_PROJECT_TOKEN` secret.

---

## Debugging Tips

### Frontend

**Check console for errors:**
- Open DevTools (F12)
- Switch to Console tab
- Look for initialization errors, network issues, validation failures

**Domain validation issues (arktype):**
- If state receiver fails validation, errors log as `ArkErrors` in console
- Check against `gameState` schema in `game-state.store.ts`

**Animation issues:**
- Temporarily remove GSAP Flip animation in store's `updateState` to see pure state transitions
- Useful for debugging visual glitches during state changes

**Storybook isolation:**
- Use `npm run storybook` to view and debug components in isolation
- Helps verify component behavior without full app state

### Backend

**Developer exception page:**
- Set `ASPNETCORE_ENVIRONMENT=Development`
- Errors show detailed stack traces
- Evidence: `Program.cs` enables exception page + OpenAPI in Development

**OpenAPI/Swagger:**
- Endpoint: `https://localhost:5001/scalar/v1` (Scalar UI)
- Lists all endpoints with try-it functionality
- Test endpoints directly

**Health checks:**
- Endpoint: `https://localhost:5001/health`
- Returns status of all services (DB, etc.)
- Useful for verifying startup completed

**Database issues:**
- Verify PostgreSQL running: `psql -U postgres -h localhost`
- Check migration status: View Migrator logs in Aspire Dashboard
- Reset DB: Delete migrations folder, create fresh migration

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| "Cannot connect to Postgres" | Use Aspire AppHost (includes Postgres); or add to Docker; or install locally |
| Dev server port conflict | Run on different port: `npm start -- --port 4300` |
| Husky hook blocks push | Fix lint/test issues locally; run `npm run ci:all` or `dotnet test` |
| API returns 401 unauthorized | Ensure cookie-based auth configured; check `/auth` endpoints first |
| Storybook not building | Run `npm run build-storybook` locally; check for import errors |
| Compiler warnings | Treat as errors in backend; fix all warnings before commit |
| SignalR not connecting | Hub is at `/game`; client integration not complete; check `GameHub.cs` |

---

## Type Checking & Linting

### Frontend

**TypeScript type check:**

```bash
npm run lint:tsc:all
```

Validates all `.ts` files without build.

**All quality gates:**

```bash
npm run lint:all
```

Runs: type checks + ESLint + Stylelint + spelling + formatting.

**On pre-commit:**
- Automatically run via Husky
- Staged files auto-formatted

### Backend

**Compiler warnings:**
- .csproj files set `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`
- All warnings must be fixed
- Build fails if warnings remain

---

## Testing Workflow

### Before Committing

```bash
# Frontend
cd frontend
npm run ci:all  # Lint + tests

# Backend
cd backend
dotnet build
dotnet test
```

Or rely on Husky hooks (runs automatically on pre-push).

### Fix Coverage Gaps

```bash
# Frontend
npm run test:ci
open frontend/coverage/ahlcg/index.html

# Backend
dotnet test /p:CollectCoverage=true
# Check backend/coveragereport/ for detailed report
```

### Debugging Flaky Tests

- Check test logs for timing issues
- Use `fakeAsync/tick` or `async/await` properly
- Mock time-dependent code (dates, timers)
- Run tests multiple times to verify consistency

---

## Continuous Integration Secrets

Required for CI workflows (configure in GitHub repo settings):

| Secret | Used By | Purpose |
|--------|---------|---------|
| `SONAR_TOKEN` | backend.yml, frontend.yml | SonarCloud authentication |
| `CHROMATIC_PROJECT_TOKEN` | chromatic.yml | Chromatic visual regression |

Contact repo maintainers to add/rotate secrets.

---

## Best Practices

✅ **DO:**
- Run `npm run ci:all` locally before pushing (matches CI)
- Start with Aspire for full-stack dev
- Use Husky to catch issues early (pre-commit/pre-push)
- Check coverage reports to find untested code
- Read CI workflow files (`.github/workflows/`) to understand exact behavior

❌ **DON'T:**
- Skip running pre-push validations 
- Commit TypeScript warnings (will fail in CI)
- Ignore Husky setup (install with `npm install` in frontend)
- Run `npm install` instead of `npm ci` (breaks reproducibility)
- Push without running tests locally (wastes CI time)
