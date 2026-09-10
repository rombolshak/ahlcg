# Development Workflow

## Shell

Development happens on **Windows**. Both PowerShell 5 (`powershell`) and PowerShell 7 (`pwsh`) are installed, and PowerShell is the shell to write scripts and one-off commands in.

Agents get a Git Bash tool as well, which means `sed`, `awk`, and heredocs technically run — reach for them anyway and you get quoting that behaves differently from every other command in this repo, paths that are `/d/sources/...` in one place and `D:\sources\...` in the next, and scripts nobody can re-run from a normal terminal. So:

- **Editing a file:** use the `Write`/`Edit` tools. Not `sed -i`, not a heredoc redirect.
- **Scripting anything:** PowerShell, in preference to Python, Node, or a shell script. `Get-Content`, `Set-Content`, `Select-String`, `ForEach-Object` cover what `cat`/`grep`/`awk` were reached for.
- **Multi-line strings:** a PowerShell here-string (`@"…"@`) or a file written with `Write`. Bash heredocs are not portable to the shell a human here actually uses.
- **Long text into a CLI:** always a temp file plus `--body-file`, never inline. This is why `/groom`, `/decompose`, `/redecompose`, and `/ship` all say so — backticks, quotes, and newlines do not survive argument quoting on Windows.

## Prerequisites

.NET SDK 10.x, Node.js with npm, and a container runtime — Docker or Podman (Aspire starts Postgres in a container). The container runtime is needed for `dotnet test` too, not just for running the app: the backend integration tests start the real AppHost. The end-to-end suite (`cd e2e`) needs it for the same reason, plus Node for the `webfrontend` resource it leaves running. See [testing.md](testing.md).

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
| Component tests (real Chromium) | `npm run test:component` |
| Everything CI runs | `npm run ci:all` (= `lint:all` + `test:ci`) — CI also runs `test:component` as a separate step; `ci:all` deliberately excludes it (see [testing.md](testing.md)) |
| All linters | `npm run lint:all` |
| Type check only | `npm run lint:tsc:all` (app + spec tsconfigs) |
| ESLint (+ dependency cycles) / Stylelint / cspell | `npm run lint` / `lint:style` / `lint:spelling` |
| Import cycles only | `npm run lint:deps` |
| Format check / fix | `npm run lint:format` / `npm run format` |
| Storybook | `npm run storybook` / `npm run build-storybook` |
| Transloco key management | `npm run loco-join` / `npm run loco-split` |

`npm run lint` chains `lint:deps`, which cruises `src/` with dependency-cruiser (`.dependency-cruiser.mjs`) for
module- and folder-level import cycles. Its rules are `severity: "warn"`, so it prints violations and still exits
0 — the folder cycles it reports are pre-existing damage that #541 removes. A **new** cycle is still a warning,
not a failure, until #541's closing issue flips both rules to `error`.

### Backend (`cd backend`)

| Goal | Command |
| --- | --- |
| Build | `dotnet build` |
| Test | `dotnet test` |
| Single test class | `dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"` |
| Coverage | `dotnet-coverage collect --settings coverage.runsettings --output coverage.cobertura.xml --output-format cobertura -- dotnet test` (needs `dotnet tool install -g dotnet-coverage`) |
| Add migration (from `Ahlcg.ApiService`) | `dotnet ef migrations add {Name}` |

`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` is set on every project — a warning fails the build.

### End-to-end (`cd e2e`)

| Goal | Command |
| --- | --- |
| Install browser (first run) | `npx playwright install chromium` |
| Run the suite | `npm test` |
| Headed, for debugging | `npm run test:headed` |
| Playwright UI mode | `npm run test:ui` |
| Against an AppHost you started | `$env:E2E_BASE_URL = 'http://localhost:PORT'` first, then any of the above |
| Type check | `npm run lint:tsc` |

Boots the full AppHost (including `webfrontend`) itself — nothing needs to be running first, unless `E2E_BASE_URL` says otherwise. See [testing.md](testing.md#end-to-end).

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

**pre-push** — diffs the branch against its remote ref (falling back to `origin/main`) and runs `npm run ci:all` if `frontend/src` changed, `dotnet build && dotnet test` if `backend/` changed. Runtime is unchanged by the component tier: `test:component` runs only in CI, not here, so pre-push never requires a locally installed Chromium binary (see [testing.md](testing.md)).

Do not bypass hooks with `--no-verify`. (`npm run shove` exists and does exactly that; it is a personal escape hatch, not a workflow.)

**Large changesets can blow the Windows command-line length limit.** `lint-staged` passes every staged path to each tool as arguments, so a commit touching enough files produces a command line longer than Windows accepts and the hook fails before any linting happens. The failure is about argument length, not code quality — it says nothing about whether the change is good.

The fix is to **split the commit into several smaller ones**, staged by area, until each is under the limit. It is not `--no-verify`: that skips the checks the size problem prevented from running, which is the opposite of what the situation calls for.

Commit messages follow `area: what changed` (`ux: keyboard input manager`, `tests: migrate to vitest`). Nothing enforces this: `@commitlint/config-conventional` is configured in `frontend/package.json`, but `frontend/.husky/` contains only `pre-commit` and `pre-push` — there is no `commit-msg` hook, so commitlint never runs.

## CI

`.github/workflows/ci.yml` runs on push and PR to `main`. `dorny/paths-filter` decides what runs:

- **backend** ← `backend/**`, `.github/workflows/backend.yml`
- **frontend** ← `frontend/src/**`, `frontend/*.json`, `.github/workflows/frontend.yml`
- **e2e** ← `backend/**`, `frontend/**`, `e2e/**`, `.github/workflows/e2e.yml`

It calls the reusable `backend.yml` / `frontend.yml` / `e2e.yml`, then a `coveralls` job posts `parallel-finished` with `carryforward: frontend,backend` — `e2e` does not report coverage, so it is not in that list.

**backend.yml** — .NET 10, installs `dotnet-reportgenerator-globaltool`, `dotnet-coverage`, `dotnet-sonarscanner`, and the Aspire CLI (then `aspire certs trust`, so the integration tests can serve HTTPS), wraps restore/build/test in a Sonar session (`rombolshak_ahlcg_backend`), collects coverage across the whole process tree with `dotnet-coverage`, generates `coveragereport/` (HTML + Cobertura + SonarQube, excluding generated code and migrations), uploads `Cobertura.xml` to Coveralls.

**frontend.yml** — Node latest with npm cache, `npm ci --force` (a workaround for Tailwind 4 resolution), `npm run ci:all`, then Playwright's system dependencies (`npx playwright install-deps chromium`) and `npm run test:component` (the F1 tier; `test:component` downloads the browser itself), Coveralls, then a SonarQube scan using `frontend/sonar-project.properties` (project key `rombolshak_ahlcg`).

**e2e.yml** — .NET 10 and Node, installs the Aspire CLI and runs `aspire certs trust` (same reason as `backend.yml`: `apiservice` binds its `https` launch profile even though the suite itself talks HTTP), `npm ci` and `npx playwright install chromium` in `e2e/`, then `npm test`. No Coveralls step and no Sonar step — this tier does not collect coverage (see [testing.md](testing.md)). Uploads the Playwright HTML report as an artifact on failure.

**chromatic.yml** — on pushes touching `frontend/src/**` or `frontend/public/assets/fonts/**`, skipped for dependabot branches. Builds Storybook and uploads to Chromatic.

Required secrets: `SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`. Coveralls and Sonar steps are skipped for `dependabot[bot]`.

## Debugging

- **Frontend state** — press backquote in the game view for the debug panel (JSON editor over the live store). `F9` applies the next recorded patch, `F8` restores the original state. Keys are mapped in `InputManagerService`.
- **Validation failures** — arktype rejections are logged with a `path`/`problem` before throwing; the path points at the offending field in `GameState`.
- **Animation glitches** — comment out the `Flip.from` call in `updateState` to see the raw state transition.
- **Backend** — the developer exception page, OpenAPI, and Scalar are Development-only. Migration output appears as the `migrator` resource's logs in the Aspire dashboard.
