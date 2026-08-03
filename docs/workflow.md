# Development Workflow

## Prerequisites

.NET SDK 10.x, Node.js with npm, and Docker (Aspire starts Postgres in a container).

## Running

**Everything (recommended)** — Postgres + PgAdmin + migrator + API + frontend dev server:

```bash
cd backend/Ahlcg.AppHost
dotnet run
```

The Aspire dashboard opens on `https://localhost:17157` (or `http://localhost:15066`, per `Properties/launchSettings.json`). Container and service ports — including PgAdmin and Postgres — are assigned dynamically; take them from the dashboard, not from a doc.

**Frontend alone:**

```bash
cd frontend
npm ci
npm start        # http://localhost:4200
```

`proxy.conf.js` targets `process.env.services__apiservice__http__0`, which only Aspire sets. Outside Aspire, `/api/*` has no target: the game view still works (it renders a local fixture) but auth requests fail and the main menu shows the logged-out state. This is expected, not a bug to fix.

**API alone** (needs a Postgres reachable via the `ahlcg` connection string):

```bash
cd backend/Ahlcg.ApiService
dotnet run       # http://localhost:5521, https://localhost:7460
```

Scalar API explorer: `/scalar/v1`. OpenAPI: `/openapi/v1.json`.

## Commands

### Frontend (`cd frontend`)

| Goal | Command |
| --- | --- |
| Dev server | `npm start` |
| Production build → `dist/ahlcg/` | `npm run build` |
| Tests (single run — there is no watch script) | `npm test` / `npm run test:ci` |
| Everything CI runs | `npm run ci:all` (= `lint:all` + `test:ci`) |
| All linters | `npm run lint:all` |
| Type check only | `npm run lint:tsc:all` (app + spec tsconfigs) |
| ESLint / Stylelint / cspell | `npm run lint` / `lint:style` / `lint:spelling` |
| Format check / fix | `npm run lint:format` / `npm run format` |
| Storybook | `npm run storybook` / `npm run build-storybook` |
| Transloco key management | `npm run loco-join` / `npm run loco-split` |

### Backend (`cd backend`)

| Goal | Command |
| --- | --- |
| Build | `dotnet build` |
| Test | `dotnet test` |
| Single test class | `dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"` |
| Coverage | `dotnet test --collect:"XPlat Code Coverage"` |
| Add migration (from `Ahlcg.ApiService`) | `dotnet ef migrations add {Name}` |

`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` is set on every project — a warning fails the build.

## Git hooks

Husky, installed from `frontend/package.json` (`"prepare": "husky"`); hook scripts live in `frontend/.husky/`.

**pre-commit** — if anything under `frontend/src` is staged, runs `npx lint-staged` in `frontend/`. Per `.lintstagedrc.json`, staged files get:

| Glob | Tool |
| --- | --- |
| `**/*.{js,ts,html,json}` | `eslint` |
| `**/*.{css,scss}` | `stylelint` |
| `**/*.{js,ts,css,scss,sh,html,md,json,yaml,yml}` | `prettier --write` |
| `*` | `cspell` |
| `**/*.ts` | `tsc-files --noEmit` |

**pre-push** — diffs the branch against its remote ref (falling back to `origin/main`) and runs `npm run ci:all` if `frontend/src` changed, `dotnet build && dotnet test` if `backend/` changed.

Do not bypass hooks with `--no-verify`. (`npm run shove` exists and does exactly that; it is a personal escape hatch, not a workflow.)

Commit messages follow `area: what changed` (`ux: keyboard input manager`, `tests: migrate to vitest`). Nothing enforces this: `@commitlint/config-conventional` is configured in `frontend/package.json`, but `frontend/.husky/` contains only `pre-commit` and `pre-push` — there is no `commit-msg` hook, so commitlint never runs.

## CI

`.github/workflows/ci.yml` runs on push and PR to `main`. `dorny/paths-filter` decides what runs:

- **backend** ← `backend/**`, `.github/workflows/backend.yml`
- **frontend** ← `frontend/src/**`, `frontend/*.json`, `.github/workflows/frontend.yml`

It calls the reusable `backend.yml` / `frontend.yml`, then a `coveralls` job posts `parallel-finished` with `carryforward: frontend,backend`.

**backend.yml** — .NET 10, installs `dotnet-reportgenerator-globaltool` and `dotnet-sonarscanner`, wraps restore/build/test in a Sonar session (`rombolshak_ahlcg_backend`), collects XPlat coverage, generates `coveragereport/` (HTML + Cobertura + SonarQube, excluding generated code and migrations), uploads `Cobertura.xml` to Coveralls.

**frontend.yml** — Node latest with npm cache, `npm ci --force` (a workaround for Tailwind 4 resolution), `npm run ci:all`, Coveralls, then a SonarQube scan using `frontend/sonar-project.properties` (project key `rombolshak_ahlcg`).

**chromatic.yml** — on pushes touching `frontend/src/**` or `frontend/public/assets/fonts/**`, skipped for dependabot branches. Builds Storybook and uploads to Chromatic.

Required secrets: `SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`. Coveralls and Sonar steps are skipped for `dependabot[bot]`.

## Debugging

- **Frontend state** — press backquote in the game view for the debug panel (JSON editor over the live store). `F9` applies the next recorded patch, `F8` restores the original state. Keys are mapped in `InputManagerService`.
- **Validation failures** — arktype rejections are logged with a `path`/`problem` before throwing; the path points at the offending field in `GameState`.
- **Animation glitches** — comment out the `Flip.from` call in `updateState` to see the raw state transition.
- **Backend** — the developer exception page, OpenAPI, and Scalar are Development-only. Migration output appears as the `migrator` resource's logs in the Aspire dashboard.
