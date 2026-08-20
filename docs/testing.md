# Testing

## Test tiers

**Rule 1 (placement).** A test belongs at the lowest tier that possesses the capability the assertion needs. Tiers are ordered by capability, not by scope or by what drives them.

**Rule 2 (non-duplication).** A tier asserts only what its added capability makes newly observable. If an assertion would pass unchanged one tier down, it belongs one tier down — without this, tiers silently converge and a slow suite re-asserts business logic at browser-startup cost.

| Tier | Adds | Runner | Owns |
| --- | --- | --- | --- |
| **F0** Frontend unit | — (pure TS + Angular DI) | vitest / happy-dom | logic, signals, store reducers, validation, pipes |
| **F1** Component | **geometry, focus, native element semantics** | Storybook `play` + Chromium | anything depending on layout |
| **F2** Frontend integration | **routing + app bootstrap + real network stack** | Playwright + `ng serve` | cross-route wiring, interceptors, providers |
| **F3** Visual | **pixels** | Chromatic | appearance only |
| **B0** Backend unit | — | xUnit + Moq | handler branching |
| **B1** Backend integration | **HTTP pipeline + real Postgres** | `AppFixture` | routing, middleware, DB constraints |
| **E** End-to-end | **the browser↔API contract** | Aspire + Playwright | that the two halves agree |

### What happy-dom cannot observe

Rule 1 only works if you know what capability each tier actually adds. happy-dom implements the DOM API surface without a real layout engine or a real display: events dispatch and the tree mutates correctly, but anything that depends on actual rendering reads back as zero or as a no-op. A geometry assertion written against it does not fail — it **passes vacuously**, which is worse than having no test at all, because it looks like coverage.

Promote a test out of F0 once the assertion needs:

- **Real layout geometry.** `getBoundingClientRect()` returns all-zero in happy-dom. GSAP's `Flip.getState`/`Flip.from` (`frontend/src/app/pages/game-view/store/game-state.store.ts:115` and `:118`) and `@panzoom/panzoom` (`frontend/src/app/pages/game-view/play-area/play-area.component.ts:38`, which also reads `parent.offsetWidth`/`offsetHeight` at `:47`-`:48`) both depend on it.
- **Real focus and `:focus-visible`.** `frontend/src/app/ui/directives/focus-trap.directive.ts:11-12` (`input.focus(); input.select();`) needs a real focus target, not happy-dom's approximation. Contrast this with `frontend/src/app/core/list-navigation.ts`: it moves an "active index" through `linkedSignal`/`computed` state and never calls `focus()`, so it correctly stays at F0 — tracking an index is logic, not DOM.
- **Native `<dialog>` semantics.** `showModal()`, `.close()`, and the `.open` property (`frontend/src/app/core/dialog/dialog.component.ts:97`, `:119`, and `:105`/`:125`) are native browser behaviour happy-dom does not implement faithfully.
- **Real pointer or drag sequences.** E.g. the wheel-driven zoom in `play-area.component.ts:50` (`addEventListener('wheel', this.zoomArea.zoomWithWheel)`).

Not everything that touches an event needs this. happy-dom dispatches `KeyboardEvent`s correctly, and both `list-navigation.ts` and `isTextEntryElement` (`frontend/src/app/core/input-manager.service.ts:74`) only branch on event properties — no layout, no native focus — so they stay at F0.

### Naming: what is real, not what drives it

A tier is named for the capability that is genuinely present in it, not for the tool driving it. Playwright against a mocked server is still the frontend integration tier, not end-to-end — what makes a test E is a real API answering the request, not the presence of a real browser. The [Backend](#backend) section below draws the same line: a handler called directly with mocked `UserManager`/`SignInManager` is the unit tier however real its eventual Postgres call would be, and only real HTTP against a real database — `Ahlcg.ApiService.IntegrationTests` — counts as integration.

**Coverage accounting:** F0/B0/B1 own line coverage — the existing lcov → Coveralls/Sonar path. F1/F2/E own capability coverage as a checklist instead: do **not** measure line coverage on them, because running the app in a real browser lights up code incidentally (imports, template bindings, lifecycle hooks) without asserting anything about it, which makes genuinely untested logic look covered.

## Frontend

Vitest through the `@angular/build:unit-test` builder, running in **happy-dom** — no browser, no web server.

Configuration:

- `angular.json` → `test` target: `coverage: true`, `tsConfig: tsconfig.spec.json`, `setupFiles: ["src/test-setup.ts"]`. Build options (assets, styles) are inherited from the build target.
- `tsconfig.spec.json` sets `"types": ["vitest/globals"]`, so `describe`/`it`/`expect`/`vi` need no imports.
- `src/test-setup.ts` polyfills `localStorage` (happy-dom has none). Add any other missing global here, not per-spec.

Commands:

```bash
npm test        # === test:ci; single run, NOT watch mode
npm run test:ci # ng test --no-watch --no-progress
npx ng test --include='**/game-state.store.spec.ts'   # single spec
npx ng test --ui        # Vitest UI
npx ng test --inspect   # node inspector
```

Coverage lands in `frontend/coverage/ahlcg/` (lcov + HTML) and is consumed by Sonar (`sonar.javascript.lcov.reportPaths`). `*.spec.ts` and `*.stories.ts` are excluded from coverage.

### Component tests (F1)

Storybook stories run as tests in a real headless Chromium, via the `storybook` project in `frontend/vitest.config.ts` (`@storybook/addon-vitest` + `@vitest/browser-playwright`). Every story executes: ones with a `play` function assert against it, the rest run as smoke renders. Unlike happy-dom, geometry (`getBoundingClientRect`), focus, and native element semantics are real here instead of vacuously zero.

```bash
npm run test:component   # playwright install chromium && vitest --project=storybook --run
```

The first run downloads two Chromium builds (the full Chrome for Testing plus the headless shell) — a few hundred MB compressed, roughly 700 MB on disk; later runs no-op that check in well under a second. To debug: drop `--run` for watch mode, `--project=storybook` selects just this tier out of `vitest.config.ts`, and flipping `headless: false` in `vitest.config.ts` opens the browser so you can watch a `play` function run.

**Why it is not in `ci:all`:** `ci:all` is also what the husky pre-push hook runs (see [workflow.md](workflow.md)). Folding a browser suite into it would make every push depend on a locally installed Chromium binary and fail hard for anyone without one. `test:component` runs as its own CI step instead, and pre-push runtime is unchanged.

No coverage is collected for this tier — see the coverage-accounting rule above.

### Writing component specs

The pattern used throughout the codebase (`numeric-text.component.spec.ts` is representative):

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
    imports: [NumericTextComponent],
  }).compileComponents();

  fixture = TestBed.createComponent(NumericTextComponent);
  component = fixture.componentInstance;
  fixture.componentRef.setInput('value', 0);
  fixture.detectChanges();
});
```

Rules that follow from the codebase's own conventions:

- **Set inputs with `fixture.componentRef.setInput(name, value)`.** Signal inputs are read-only on the instance; direct assignment does not compile.
- **Always provide `provideZonelessChangeDetection()`.** The app is zoneless; without it change detection behaves differently than production.
- Use `TestBed.tick()` to flush effects and pending change detection.
- **`output()` is not an Observable.** `OutputEmitterRef` cannot go through `firstValueFrom`. Await an emission by wrapping the callback:
  ```typescript
  const emitted = new Promise<void>(resolve => {
    component.animationCompleted.subscribe(() => { resolve(); });
  });
  ```
- **No `done()` callbacks** — Vitest does not support them. Use `async`/`await`.
- HTTP: use `provideHttpClientTesting()` + `HttpTestingController`. `HttpClientTestingModule` is deprecated and unused here.
- Card-rendering specs need `provideHttpClient(withInterceptors([serveCardAssets]))`. `@testing/serve-card-assets` serves the card description JSONs from an in-memory map; without it `CardInfoService` issues real `fetch` calls and happy-dom fails with `ECONNREFUSED`. Add new card JSONs to that map when a spec needs them.
- Translations: `getTranslocoModule()` from `@testing/transloco.testing`.

Test names read as sentences: `it('should fire event after animation')`.

### Frontend gotchas

| Symptom | Cause |
| --- | --- |
| `ECONNREFUSED` to `/assets/...` | happy-dom has no web server; mock the request (see `serveCardAssets`) |
| `localStorage is undefined` | `setupFiles` not applied, or a new global is needed in `test-setup.ts` |
| "Unsafe call of an error typed value" on `vi` | Add an explicit `import { vi } from 'vitest';` to that spec |
| Input assignment does not compile | Use `componentRef.setInput` |
| Emission never resolves | `output()` is not an Observable |

ESLint runs `strictTypeChecked` on specs too, and `eslint-plugin-jasmine` is still configured for `src/**/*.spec.ts` — its `no-expect-in-setup-teardown` rule warns; the Jasmine matcher rules are inert since the Vitest migration. `@types/jasmine` and the plugin remain in `package.json` as leftovers.

## Backend

xUnit + Moq, in `backend/unit-tests/Ahlcg.ApiService.Tests/`. Coverage via `dotnet-coverage`, aggregated by `reportgenerator`.

**Coverage must be collected with `dotnet-coverage`, not coverlet.** The integration tests drive the API in a process DCP spawns; coverlet (`--collect:"XPlat Code Coverage"`) only instruments the test host, so it scored `Ahlcg.ApiService` at ~1.65% and showed `Program.cs` and every `Map*` method as untested. `dotnet-coverage` instruments the whole process tree. Scope and two silent-failure traps are documented in `backend/coverage.runsettings`.

```bash
cd backend
dotnet test
dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"
dotnet-coverage collect --settings coverage.runsettings --output coverage.cobertura.xml --output-format cobertura -- dotnet test
```

Test names follow `{Method}_{Scenario}_{Expected}`:

```
LoginAnonymously_NotLoggedIn_CreatesAnonymousAccount
LoginAnonymously_LoggedIn_ReturnsBadRequest
LoginAnonymously_FailedToCreateUser_ReturnsBadRequest
```

At this tier, endpoints are tested by **calling the static handler directly** with mocked `UserManager` / `SignInManager` and a hand-built `ClaimsPrincipal` — no `WebApplicationFactory`, no Postgres. That also means the whole request pipeline (routing, auth middleware, model binding, endpoint filters) is skipped here; anything that depends on it belongs in the integration tier below. Assert on the typed result and verify the manager interactions:

```csharp
var result = await AuthEndpoints.LoginAnonymously(NotAuthenticatedPrincipal, userManager.Object, signInManager.Object);

Assert.IsType<Ok>(result.Result);
userManager.Verify(m => m.CreateAsync(It.Is<AppUser>(p => p.IsAnonymous == true)));
```

This is why handlers return `Results<...>` rather than `IResult` — keep new handlers testable the same way. Shared mock factories (`GetMockUserManager`, `GetMockSignInManager`) and principals live at the bottom of `AuthEndpointsTests.cs`. `GameEndpointsTests` follows the same shape but backs `ApplicationDbContext` with EF's InMemory provider (a fresh database per test) instead of mocking it directly, since the handler under test uses it for real reads/writes.

### Integration tests

`backend/integration-tests/Ahlcg.ApiService.IntegrationTests` exists because EF's InMemory provider does not enforce unique indexes, so it cannot prove the `POST /games` idempotency behaviour (same key + same user → one row; same key + different users → two rows). Everything InMemory *can't* cover goes here instead, driven over real HTTP against the real app and real Postgres — not by calling handlers with mocks.

A collection fixture (`AppFixture`, shared across the test class via `[Collection]`/`ICollectionFixture`) starts the app once:

- `DistributedApplicationTestingBuilder.CreateAsync<Projects.Ahlcg_AppHost>()`, with the `webfrontend`/`webfrontend-installer` resources (no Node in CI) and `pgadmin` (dev convenience only) removed from `builder.Resources` before building. `postgresdb`, `migrator`, and `apiservice` stay — running the real migrator is what proves the migration applies.
- `app.StartAsync()`, then `app.ResourceNotifications.WaitForResourceHealthyAsync("apiservice")`.
- Tests get a fresh `HttpClient` per call (`AppFixture.CreateClient()`) with its own `CookieContainer`, and a fresh `ApplicationDbContext` (`AppFixture.CreateDbContext()`) for direct-DB assertions (e.g. counting rows for an idempotency key).

**Why HTTPS, not HTTP:** `ConfigureApplicationCookie` sets `SecurePolicy = Always`, and .NET's `CookieContainer` will not send a `Secure` cookie over plain `http://` (no localhost exception, unlike browsers). So the fixture talks to the `https` endpoint — which requires `AddProject<Ahlcg_ApiService>("apiservice", launchProfileName: "https")` in `AppHost.cs`, since the default `http` launch profile has no HTTPS endpoint at all. Certificate trust is handled by disabling validation on the test client (`ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator`) rather than trusting the dev cert, since CI never does the latter.

Requires a container runtime — Docker or Podman both work, since Aspire drives whichever DCP finds (a real Postgres container is started for each test run). Runs via the same `dotnet test` as the unit tests; GitHub's `ubuntu-latest` runners provide Docker, so CI needs no extra setup, but this tier is slower than the InMemory-backed unit tests.

## What is not tested

No end-to-end tests against the frontend. Storybook stories do double duty: the same story files are the component tier's (F1) specs and Chromatic's visual-regression fixtures — F1 owns behaviour, Chromatic owns pixels.
