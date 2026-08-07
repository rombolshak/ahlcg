# Testing

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
- Card-rendering specs need `provideHttpClient(withInterceptors([serveCardAssets]))`. `@domain/test/serve-card-assets` serves the card description JSONs from an in-memory map; without it `CardInfoService` issues real `fetch` calls and happy-dom fails with `ECONNREFUSED`. Add new card JSONs to that map when a spec needs them.
- Translations: `getTranslocoModule()` from `@domain/test/transloco.testing`.

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

xUnit + Moq, in `backend/unit-tests/Ahlcg.ApiService.Tests/`. Coverage via coverlet (`XPlat Code Coverage`), aggregated by `reportgenerator`.

```bash
cd backend
dotnet test
dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"
dotnet test --collect:"XPlat Code Coverage"
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

No end-to-end tests against the frontend. Visual regression is covered by Chromatic over Storybook stories, not by specs.
