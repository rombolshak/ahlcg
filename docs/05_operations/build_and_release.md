# Build and Release

## Purpose
Explains how to build backend and frontend locally, run tests with coverage, and understand CI/CD workflows.

## When to Load
Read this when building the project, running tests, understanding CI failures, or preparing a release.

## Related Files
- [Development Workflow](./dev_workflow.md) — Quick start and commands
- [Backend Services](../03_implementation/backend/services.md) — Backend structure
- [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) — Frontend structure
- [Testing Strategy](../04_testing/strategy.md) — Testing overview

---

## Prerequisites

- **Backend**: .NET SDK 10.x
- **Frontend**: Node.js 20+ with npm
- **Local Dev**: PostgreSQL (via Docker) or .NET Aspire AppHost

Verify installation:

```bash
dotnet --version
node --version
npm --version
```

---

## Building Locally

### Backend Only

**Single-Command Dev (ASP.NET + PostgreSQL + Migrator):**

```bash
cd backend/Ahlcg.AppHost
dotnet restore
dotnet run
```

Launches Aspire orchestration:
- PostgreSQL on `localhost:5432`
- API on `https://localhost:5001`
- Swagger UI on `https://localhost:5001/scalar/v1`

**API Standalone:**

```bash
cd backend/Ahlcg.ApiService
dotnet restore
dotnet build
dotnet run
```

Requires PostgreSQL running elsewhere; relies on `appsettings.Development.json` for connection string.

### Frontend Only

**Build:**

```bash
cd frontend
npm ci  # Clean install from package-lock.json
npm run build
```

Output: `frontend/dist/ahlcg/`

**Dev Server:**

```bash
cd frontend
npm start
```

Runs on `http://localhost:4200` with hot reload.

### Complete Local Setup

**Option A: Aspire (Recommended)**

```bash
cd backend/Ahlcg.AppHost
dotnet restore
dotnet run
```

Opens `.NET Aspire Dashboard` (http://localhost:18888) with links to all services.

**Option B: Manual**

Run services independently:

```bash
# Terminal 1: PostgreSQL
docker run --rm --name pg -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:16

# Terminal 2: Backend
cd backend/Ahlcg.ApiService
dotnet restore
dotnet run

# Terminal 3: Frontend
cd frontend
npm start
```

Then open `http://localhost:4200` and navigate to SignalR game hub at `/game`.

---

## Testing Locally

### Backend Tests

**All Tests:**

```bash
cd backend
dotnet test
```

**With Coverage:**

```bash
cd backend
dotnet test /p:CollectCoverage=true /p:CoverageFormat=cobertura
```

Coverage report: Check console output for path to `coverage.cobertura.xml`. View HTML report in test output folder.

**Specific Test:**

```bash
dotnet test --filter "AuthEndpointsTests.LoginAnonymously_NotLoggedIn"
```

Coverage goals: 70% overall, 90% for auth/validation, 80% for services.

See [Backend Testing](../04_testing/backend.md) for detailed patterns.

### Frontend Tests

**Unit Tests:**

```bash
cd frontend
npm run test  # Watch mode
npm run test:ci  # Single run (CI mode)
```

**Coverage:**

```bash
npm run test:ci  # Outputs to frontend/coverage/ahlcg/
open frontend/coverage/ahlcg/index.html
```

Coverage goals: 70% overall, 50% UI components, 80% services.

**Lint & Format:**

```bash
npm run lint  # ESLint
npm run format  # Prettier (if configured)
```

See [Frontend Testing](../04_testing/frontend.md) for detailed patterns.

---

## CI/CD Workflows

### Entry Point: Path-Filtered CI

**File:** `.github/workflows/ci.yml`

Triggers on pushes and PRs to `main`. Uses `dorny/paths-filter` to determine which jobs to run:

- **backend=true** ← Changes to `backend/**` or backend workflow file
- **frontend=true** ← Changes to `frontend/src/**` or frontend config files

Delegates to reusable workflows; aggregates coverage to Coveralls at the end.

### Backend Workflow

**File:** `.github/workflows/backend.yml`

**Steps:**
1. Checkout code
2. Setup .NET 10
3. Install tools: `dotnet-reportgenerator-globaltool`, `dotnet-sonarscanner`
4. Sonar begin (SonarCloud analysis)
5. `dotnet restore`
6. `dotnet build`
7. `dotnet test` with XPlat code coverage collection
8. Generate coverage reports: HTML, Cobertura, SonarQube
9. Sonar end (requires `SONAR_TOKEN`)
10. Upload to Coveralls (flagged as "backend")

**Outputs:**
- Coverage reports generated at `backend/coveragereport/`
- Test results uploaded to Coveralls and SonarCloud

**Secrets Required:**
- `SONAR_TOKEN` — SonarCloud authentication

### Frontend Workflow

**File:** `.github/workflows/frontend.yml`

**Steps:**
1. Checkout code
2. Setup Node (latest LTS) with npm caching
3. `npm ci` (clean install, respecting package-lock.json)
4. `npm run ci:all` (runs lint + test:ci)
5. Upload to Coveralls (flagged as "frontend")
6. SonarQube scan (requires `SONAR_TOKEN`)

**Outputs:**
- Coverage reports at `frontend/coverage/ahlcg/`
- Test results uploaded to Coveralls and SonarCloud

**Secrets Required:**
- `SONAR_TOKEN` — SonarCloud authentication

### Chromatic Visual Regression

**File:** `.github/workflows/chromatic.yml`

Triggers on frontend asset or Storybook changes (excludes Dependabot branches).

**Steps:**
1. Checkout code
2. Setup Node with npm caching
3. `npm ci`
4. `npm run build-storybook`
5. Upload to Chromatic for visual regression testing (TurboSnap enabled for fast runs)

**Secrets Required:**
- `CHROMATIC_PROJECT_TOKEN` — Chromatic authentication

---

## Coverage & Quality Gates

### Code Coverage

**Backend:**
- Collected via Coverlet + XPlat format
- Aggregated by reportgenerator into HTML, Cobertura, SonarQube formats
- Report location (CI): `backend/coveragereport/`
- Target: 70% overall; 90% for auth endpoints

**Frontend:**
- Collected via Karma + Jasmine
- Outputs to `frontend/coverage/ahlcg/`
- Includes lcov and HTML reports
- Target: 70% overall; 50% for UI, 80% for services

### Coveralls Integration

Both backend and frontend upload coverage (via parallel jobs):

```bash
# In CI workflows
coveralls --format=cobertura --flag-name=<backend|frontend>
```

Final "parallel-finished" step merges results for consolidated coverage dashboard.

### SonarCloud Integration

**Backend:**
- Project key: `rombolshak_ahlcg_backend`
- Organization: `rombolshak`
- Scans: All C# code
- Quality gate: Defined in SonarCloud console

**Frontend:**
- Project key: `rombolshak_ahlcg_frontend` (inferred)
- Organization: `rombolshak`
- Scans: All TypeScript code
- Quality gate: Defined in SonarCloud console

---

## Build Artifacts

### Backend

- **DLL/EXE**: Generated in `backend/Ahlcg.ApiService/bin/Release/`
- **Coverage Reports**: `backend/coveragereport/` (HTML, Cobertura.xml, SonarQube.xml)
- **Test Results**: Trx and coverage files in test project output paths

Publish as self-contained or containerized (Docker support TBD).

### Frontend

- **Build Output**: `frontend/dist/ahlcg/` (static Angular app)
- **Coverage Reports**: `frontend/coverage/ahlcg/` (lcov, HTML)
- **Storybook**: `frontend/storybook-static/` (static site)

Deploy with:
```bash
npm run build
# Copy frontend/dist/ahlcg/* to CDN or web server
```

---

## Releases (Current Status)

**Current:** No production release pipeline defined.

- No Docker images or containerization
- No deploy workflows or environment configs
- Aspire AppHost oriented for local development
- Manual deployment not yet documented

**Interim Guidance:**

1. **Backend**: Publish via `dotnet publish` to self-contained app or Docker container
   - Set connection string via environment variable or config
   - Ensure OpenTelemetry exporter configured
   - Verify all dependencies (PostgreSQL, etc.) available

2. **Frontend**: Build static app and host behind CDN/web server
   ```bash
   npm run build
   # Configure web server to serve frontend/dist/ahlcg/
   ```

3. **Database**: Run EF Core migrations on target database
   ```bash
   cd backend/Ahlcg.Migrator
   dotnet run
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "dotnet command not found" | Install .NET SDK 10.x; verify `dotnet --version` |
| "npm ERR! code ERESOLVE" | Run `npm ci --force` (Tailwind 4 resolution) |
| PostgreSQL connection fails | Verify PostgreSQL running on localhost:5432; check appsettings connection string |
| Tests timeout | Check for CPU overload; increase timeout with `--logger "console;verbosity=detailed"` |
| Coverage not generated | Verify coverage tool installed; check test output path in workflow |
| Chromatic build fails | Run `npm run build-storybook` locally to verify; check token secret |

---

## Best Practices

✅ **DO:**
- Run `npm ci` (not `npm install`) in CI for reproducible installs
- Collect coverage in CI; generate HTML reports for debugging
- Use Aspire AppHost for local full-stack dev
- Set `collectCoverage` in test configs for accurate metrics
- Keep CI fast: use path filters, parallel jobs, caching

❌ **DON'T:**
- Manually publish builds (use CI/CD)
- Ignore coverage reports (they reveal test gaps)
- Run `npm install` in CI (use `npm ci`)
- Commit `node_modules` or `bin/obj` folders
- Skip Chromatic checks (visual regressions are bugs)
