# Frontend Testing

## Purpose

Explains how to write and run tests for Angular components, services, and the state store.

## When to Load

Read this when writing unit tests for frontend code or debugging test failures.

## Related Files

- [Testing Strategy](./strategy.md) — Overall testing approach
- [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) — Component patterns
- [Frontend State Management](../03_implementation/frontend/state_management.md) — Store testing
- [Build & Release](../05_operations/build_and_release.md) — CI test setup

---

## Test Setup

**Frameworks:**

- Test Runner/Bundler: Vitest (via `@angular/build:unit-test` builder)
- Environment: happy-dom (DOM emulation in Node.js — no real browser by default)
- Coverage Provider: `@vitest/coverage-v8`
- Globals: `vitest/globals` (no per-file imports of `describe`/`it`/`vi` needed)

**Configuration Files:**

- `angular.json` (test target) — `@angular/build:unit-test` builder options (`coverage`, `tsConfig`, `setupFiles`)
- `tsconfig.spec.json` — TypeScript config for tests (`"types": ["vitest/globals"]`)
- `src/test-setup.ts` — global setup file (registered via `setupFiles`); provides the `localStorage` polyfill required by happy-dom
- `vitest.config.ts` _(optional)_ — custom Vitest config, linked via `runnerConfig` in `angular.json` (not currently used)

---

## Running Tests

### Development (Watch Mode)

```bash
cd frontend
npm run test
```

Runs in Node.js with happy-dom. Watch mode is enabled by default in an interactive terminal; tests re-run on file changes.

### CI (One Run, No Watch)

```bash
npm run test:ci
```

Single run, no watch, exits with code 0/1. Coverage is enabled in `angular.json` (`coverage: true`).

### Specific Test

```bash
npx ng test --no-watch --include='**/game-state.store.spec.ts'
```

### With Coverage

Already enabled in `angular.json` (`coverage: true`). Reports in `frontend/coverage/ahlcg/`.

---

## Writing a Component Test

Template:

```typescript
// src/app/pages/game-view/panels/investigator-card.component.spec.ts
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InvestigatorCard } from "./investigator-card.component";

describe("InvestigatorCard", () => {
  let component: InvestigatorCard;
  let fixture: ComponentFixture<InvestigatorCard>;

  beforeEach(async () => {
    // Compile component in test module
    await TestBed.configureTestingModule({
      imports: [InvestigatorCard],
      // Add providers if needed
    }).compileComponents();

    // Create component instance
    fixture = TestBed.createComponent(InvestigatorCard);
    component = fixture.componentInstance;

    // Initial change detection (calls ngOnInit)
    fixture.detectChanges();
  });

  it("should display investigator name", () => {
    // Arrange
    component.investigator = {
      id: "inv-1",
      name: "Roland Banks",
      health: 8,
    };

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.textContent).toContain("Roland Banks");
  });

  it("should emit investigatorSelected when button clicked", () => {
    // Arrange
    component.investigator = { id: "inv-1", name: "Roland" };
    vi.spyOn(component.selected, "emit");
    fixture.detectChanges();

    // Act
    const button = fixture.nativeElement.querySelector("button");
    button.click();

    // Assert
    expect(component.selected.emit).toHaveBeenCalledWith("inv-1");
  });
});
```

**Key Points:**

- Use `async` in `beforeEach` for async setup
- Call `fixture.detectChanges()` after setting inputs
- Access DOM via `fixture.nativeElement` or `fixture.debugElement`
- Spy on @Output() events with `vi.spyOn()` (Vitest). The Jasmine `spyOn()` global is no longer available.

---

## Testing Services

```typescript
// src/app/shared/services/api.service.spec.ts
import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ApiService } from "./api.service";

describe("ApiService", () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensure no outstanding HTTP requests
    httpMock.verify();
  });

  it("should fetch game state", () => {
    // Arrange
    const mockState = { id: "g-1", investigators: [] };

    // Act
    service.getGameState("g-1").subscribe((state) => {
      // Assert
      expect(state).toEqual(mockState);
    });

    // Verify request was made and respond
    const req = httpMock.expectOne("/api/games/g-1");
    expect(req.request.method).toBe("GET");
    req.flush(mockState);
  });

  it("should handle HTTP errors", () => {
    service.getGameState("bad-id").subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpMock.expectOne("/api/games/bad-id");
    req.flush("Not found", { status: 404, statusText: "Not Found" });
  });
});
```

**HttpTestingController:**

- `expectOne(url)` — Assert request was made with this URL
- `expectNone(url)` — Assert no request to this URL
- `verify()` — Ensure all requests were handled
- `flush(data)` — Respond with data
- `error(error)` — Respond with error

---

## Testing the Store

```typescript
// src/app/pages/game-view/store/game-state.store.spec.ts
import { TestBed } from "@angular/core/testing";
import { GameStateStore, initialState } from "./game-state.store";

describe("GameStateStore", () => {
  let store: InstanceType<typeof GameStateStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStateStore],
    });

    store = TestBed.inject(GameStateStore);
  });

  it("should set state", () => {
    // Arrange
    const newState = { ...initialState, id: "new-id" };

    // Act
    store.setState(newState);

    // Assert
    expect(store.id()).toBe("new-id");
  });

  it("should update state with patches", () => {
    // Arrange
    store.setState(initialState);
    const patches = [
      { op: "replace", path: "/investigators/0/health", value: 5 },
    ];

    // Act
    store.updateState(patches);

    // Assert
    expect(store.investigators()[0].health).toBe(5);
  });

  it("should compute investigator count", () => {
    // Arrange
    store.setState(initialState);

    // Act & Assert
    expect(store.investigatorCount()).toBe(initialState.investigators.length);
  });

  it("should reject invalid state", () => {
    // Arrange
    const invalidState = { ...initialState, investigators: [] };
    const patches = [{ op: "replace", path: "", value: invalidState }];

    // Act & Assert
    expect(() => store.updateState(patches)).toThrow(
      "At least one investigator required",
    );
  });
});
```

**Signal Testing:**

- Signals are functions: `signal()` returns the value
- Call () to read: `store.id()` returns current value
- Computed signals work the same way: `store.investigatorCount()`
- No RxJS subscriptions needed for testing

---

## Testing with Pipes

```typescript
it("should locale in translate pipe", async () => {
  TestBed.configureTestingModule({
    imports: [TranslocoModule],
  });

  fixture = TestBed.createComponent(GameViewComponent);
  const element = fixture.debugElement.query(By.css("h1"));

  // Wait for async translation
  fixture.detectChanges();
  await fixture.whenStable();
  expect(element.nativeElement.textContent).toContain("Game Title");
});
```

---

## Debugging Tests

### Vitest UI / Inspect

```bash
npx ng test --ui      # Interactive Vitest UI (browser-based dashboard)
npx ng test --inspect # Node Inspector; breakpoints via chrome://inspect
```

### Console Output

```typescript
it("should log debug info", () => {
  console.log("Value:", store.id());
  // Output appears in terminal
});
```

### Disable Specific Tests

```typescript
// Skip this test
it.skip('should do something', () => { ... });

// Run only this test
it.only('should do something else', () => { ... });
```

---

## Common Patterns

### Testing Forms

```typescript
it("should validate email", () => {
  const control = component.form.get("email");
  control?.setValue("invalid");
  expect(control?.hasError("email")).toBeTruthy();

  control?.setValue("valid@example.com");
  expect(control?.valid).toBeTruthy();
});
```

### Testing Event Listeners

```typescript
it("should respond to click", () => {
  vi.spyOn(component, "handleClick");
  const button = fixture.debugElement.query(By.css("button"));

  button.nativeElement.click();

  expect(component.handleClick).toHaveBeenCalled();
});
```

### Testing ng-if/ng-for

```typescript
it("should render list of investigators", () => {
  component.investigators = [
    { id: "1", name: "Roland" },
    { id: "2", name: "Daisy" },
  ];
  fixture.detectChanges();

  const items = fixture.debugElement.queryAll(By.css("li"));
  expect(items.length).toBe(2);
});
```

---

## Coverage Goals

- Overall: >= 70%
- Components: >= 50% (view testing is expensive)
- Services: >= 80% (easier to test)
- Pipes/Directives: >= 90%

View coverage report:

```bash
npm run test:ci
open frontend/coverage/ahlcg/index.html
```

Drill into files to see uncovered lines.

---

## Troubleshooting

| Issue                         | Solution                                                              |
| ----------------------------- | --------------------------------------------------------------------- |
| Test hangs                    | Check for unresolved promises; prefer `async/await` over `done()`     |
| "Cannot find name 'vi'"       | Ensure `tsconfig.spec.json` has `"types": ["vitest/globals"]`         |
| `localStorage` is undefined   | happy-dom lacks it; provided via `src/test-setup.ts` (see setupFiles) |
| `ECONNREFUSED` to /assets/... | No web server in happy-dom; serve assets via an HTTP interceptor      |
| Spy not working               | Use `vi.spyOn(object, 'method')` not `vi.spyOn(Class, 'method')`      |
| DOM changes not visible       | Call `fixture.detectChanges()` after changes                          |
| Async test timeout            | Increase timeout: `it('...', () => { ... }, 10000)` (no `done` arg)   |
| Component not rendering       | Check template syntax, imports in TestBed                             |

---

## Best Practices

- Keep tests focused: one concept per test
- Use descriptive names: "should display error when email invalid"
- Mock external services (HTTP, SignalR)
- Test behavior, not implementation
- Clean up timers/subscriptions in afterEach
- Use beforeEach to reduce duplication
- Test edge cases (empty arrays, null values, errors)

---

## Migration Notes (Karma → Vitest)

The project was migrated from Karma + Jasmine to Vitest + happy-dom (July 2026). See the [official migration guide](https://angular.dev/guide/testing/migrating-to-vitest). Key artifacts and decisions:

- **Builder:** `@angular/build:unit-test` in `angular.json` (replaced `@angular/build:karma`). Build options (`assets`, `styles`, `scripts`) were removed from the `test` target and are inherited from the `::development` build target.
- **Coverage option:** Use `coverage: true` in `angular.json` (NOT `codeCoverage: true`, which the old Karma builder used). Requires `@vitest/coverage-v8`.
- **Test globals:** `tsconfig.spec.json` sets `"types": ["vitest/globals"]` so `describe`/`it`/`expect`/`vi` are available without per-file imports.
- **`src/test-setup.ts`:** Global setup file registered via `setupFiles` in `angular.json`. Provides a `localStorage` polyfill because happy-dom does not ship one.
- **`src/app/shared/domain/test/serve-card-assets.ts`:** Functional HTTP interceptor that serves card-description JSONs (imported from `public/assets/cards/`) for component specs that render cards. Without it, `CardInfoService` triggers real `fetch()` calls → `ECONNREFUSED` noise/failures. Wire it in specs that use `provideHttpClient()` with card components: `provideHttpClient(withInterceptors([serveCardAssets]))`.
- **Jasmine → Vitest API:** `spyOn` → `vi.spyOn`; `jasmine.createSpy` → `vi.fn`; `jasmine.any` → `expect.any`; `fit`/`xit` → `it.only`/`it.skip`; `.toBeTrue()` → `.toBe(true)`. The `refactor-jasmine-vitest` schematic (`ng g @schematics/angular:refactor-jasmine-vitest`) automates most of this but does NOT install deps, edit `angular.json`, or handle complex spy/nested scenarios.

### Agent Insights

Lessons learned the hard way during the migration — keep these in mind when writing or fixing tests:

- **happy-dom ≠ real browser.** Anything that in Karma was served by its built-in web server (asset HTTP, `fetch`) must now be mocked. Prefer the `serve-card-assets.ts` interceptor pattern for card JSON; use `provideHttpClientTesting()` + `HttpTestingController` for service-level HTTP tests.
- **`localStorage` is not automatic.** Any spec touching `SettingsService` (or other storage-using code) depends on the `src/test-setup.ts` polyfill. If a new global API is needed (e.g. `matchMedia`, `IntersectionObserver`), add it there rather than per-spec.
- **No `done()` callbacks.** Vitest does not support Jasmine's `done(done => {...})` style. Convert to `async/await`. The schematic marks such tests as `async` but does not insert `await` — eslint `require-await` will then flag them; resolve by awaiting a promise or removing `async`.
- **`output()` is not an Observable.** Angular's `OutputEmitterRef` from `output()` cannot be passed to `firstValueFrom`/`subscribe`-as-Observable. Await emissions via a manual `new Promise(resolve => component.foo.subscribe(() => resolve()))`.
- **`vi` global + type-checked lint.** `eslint.config.js` runs `tsConfigs.strictTypeChecked` on `**/*.ts` including specs. `vi` resolves via `vitest/globals` types, but if a spec gets "Unsafe call of an error typed value" errors, add an explicit `import { vi } from 'vitest';` to that file.
- **Pre-commit hook runs eslint+prettier+cspell+tsc on staged files** (`.lintstagedrc.json`). The schematic's output may violate `@typescript-eslint/require-await`, `no-empty-function`, or `no-confusing-void-expression` — review its diffs before committing.
- **`jasmine` eslint plugin is still configured** for `src/**/*.spec.ts` (`eslint.config.js`). Its `no-expect-in-setup-teardown` rule emits warnings; the `jasmine.*` matcher rules are inert post-migration but harmless.
