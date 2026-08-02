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

Endpoints are tested by **calling the static handler directly** with mocked `UserManager` / `SignInManager` and a hand-built `ClaimsPrincipal` — no `WebApplicationFactory`, no test database. Assert on the typed result and verify the manager interactions:

```csharp
var result = await AuthEndpoints.LoginAnonymously(NotAuthenticatedPrincipal, userManager.Object, signInManager.Object);

Assert.IsType<Ok>(result.Result);
userManager.Verify(m => m.CreateAsync(It.Is<AppUser>(p => p.IsAnonymous == true)));
```

This is why handlers return `Results<...>` rather than `IResult` — keep new handlers testable the same way. Shared mock factories (`GetMockUserManager`, `GetMockSignInManager`) and principals live at the bottom of `AuthEndpointsTests.cs`.

## What is not tested

No integration tests, no end-to-end tests, no test database. Visual regression is covered by Chromatic over Storybook stories, not by specs.
