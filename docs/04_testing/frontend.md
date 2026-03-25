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
- Test Runner: Karma
- Framework: Jasmine
- Headless Browser: Chrome (ChromeHeadless for CI)
- Coverage Reporter: istanbul/nyc

**Configuration Files:**
- `karma.conf.cjs` — Karma runner config
- `angular.json` (test section) — Angular test builder
- `tsconfig.spec.json` — TypeScript config for tests

---

## Running Tests

### Development (Headed, Watch Mode)

```bash
cd frontend
npm run test
```

Browser opens at `localhost:9876`. Tests re-run on file changes. Breakpoints work in DevTools.

### CI (Headless, One Run)

```bash
npm run test:ci
```

Runs in headless Chrome, no watch, exits with code 0/1.

### Specific Test

```bash
npm test -- --include='**/game-state.store.spec.ts'
```

### With Coverage

Already enabled in `angular.json` (`codeCoverage: true`). Reports in `frontend/coverage/ahlcg/`.

---

## Writing a Component Test

Template:

```typescript
// src/app/pages/game-view/panels/investigator-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvestigatorCard } from './investigator-card.component';

describe('InvestigatorCard', () => {
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
  
  it('should display investigator name', () => {
    // Arrange
    component.investigator = {
      id: 'inv-1',
      name: 'Roland Banks',
      health: 8,
    };
    
    // Act
    fixture.detectChanges();
    
    // Assert
    expect(fixture.nativeElement.textContent).toContain('Roland Banks');
  });
  
  it('should emit investigatorSelected when button clicked', () => {
    // Arrange
    component.investigator = { id: 'inv-1', name: 'Roland' };
    spyOn(component.selected, 'emit');
    fixture.detectChanges();
    
    // Act
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    
    // Assert
    expect(component.selected.emit).toHaveBeenCalledWith('inv-1');
  });
});
```

**Key Points:**
- Use `async` in `beforeEach` for async setup
- Call `fixture.detectChanges()` after setting inputs
- Access DOM via `fixture.nativeElement` or `fixture.debugElement`
- Spy on @Output() events with `spyOn()`

---

## Testing Services

```typescript
// src/app/shared/services/api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
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
  
  it('should fetch game state', () => {
    // Arrange
    const mockState = { id: 'g-1', investigators: [] };
    
    // Act
    service.getGameState('g-1').subscribe(state => {
      // Assert
      expect(state).toEqual(mockState);
    });
    
    // Verify request was made and respond
    const req = httpMock.expectOne('/api/games/g-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockState);
  });
  
  it('should handle HTTP errors', () => {
    service.getGameState('bad-id').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });
    
    const req = httpMock.expectOne('/api/games/bad-id');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
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
import { TestBed } from '@angular/core/testing';
import { GameStateStore, initialState } from './game-state.store';

describe('GameStateStore', () => {
  let store: InstanceType<typeof GameStateStore>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStateStore],
    });
    
    store = TestBed.inject(GameStateStore);
  });
  
  it('should set state', () => {
    // Arrange
    const newState = { ...initialState, id: 'new-id' };
    
    // Act
    store.setState(newState);
    
    // Assert
    expect(store.id()).toBe('new-id');
  });
  
  it('should update state with patches', () => {
    // Arrange
    store.setState(initialState);
    const patches = [
      { op: 'replace', path: '/investigators/0/health', value: 5 },
    ];
    
    // Act
    store.updateState(patches);
    
    // Assert
    expect(store.investigators()[0].health).toBe(5);
  });
  
  it('should compute investigator count', () => {
    // Arrange
    store.setState(initialState);
    
    // Act & Assert
    expect(store.investigatorCount()).toBe(initialState.investigators.length);
  });
  
  it('should reject invalid state', () => {
    // Arrange
    const invalidState = { ...initialState, investigators: [] };
    const patches = [{ op: 'replace', path: '', value: invalidState }];
    
    // Act & Assert
    expect(() => store.updateState(patches))
      .toThrow('At least one investigator required');
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
it('should locale in translate pipe', async () => {
  TestBed.configureTestingModule({
    imports: [TranslocoModule],
  });
  
  fixture = TestBed.createComponent(GameViewComponent);
  const element = fixture.debugElement.query(By.css('h1'));
  
  // Wait for async translation
  fixture.detectChanges();
  await fixture.whenStable();
  expect(element.nativeElement.textContent).toContain('Game Title');
});
```

---


## Debugging Tests

### Browser DevTools (Headed Mode)

1. Run `npm run test`
2. Open `localhost:9876`
3. Click "Debug"
4. F12 opens DevTools
5. Set breakpoints in Sources tab

### Console Output

```typescript
it('should log debug info', () => {
  console.log('Value:', store.id());
  // Output appears in terminal
});
```

### Disable Specific Tests

```typescript
// Skip this test
xit('should do something', () => { ... });

// Run only this test
fit('should do something else', () => { ... });
```

---

## Common Patterns

### Testing Forms

```typescript
it('should validate email', () => {
  const control = component.form.get('email');
  control?.setValue('invalid');
  expect(control?.hasError('email')).toBeTruthy();
  
  control?.setValue('valid@example.com');
  expect(control?.valid).toBeTruthy();
});
```

### Testing Event Listeners

```typescript
it('should respond to click', () => {
  spyOn(component, 'handleClick');
  const button = fixture.debugElement.query(By.css('button'));
  
  button.nativeElement.click();
  
  expect(component.handleClick).toHaveBeenCalled();
});
```

### Testing ng-if/ng-for

```typescript
it('should render list of investigators', () => {
  component.investigators = [
    { id: '1', name: 'Roland' },
    { id: '2', name: 'Daisy' },
  ];
  fixture.detectChanges();
  
  const items = fixture.debugElement.queryAll(By.css('li'));
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

| Issue | Solution |
|-------|----------|
| Test hangs | Check for unresolved promises; use `done()` callback |
| "Cannot find module" | Check import paths; ensure file exists |
| Spy not working | Use `spyOn(object, 'method')` not `spyOn(Class, 'method')` |
| DOM changes not visible | Call `fixture.detectChanges()` after changes |
| Async test timeout | Increase timeout: `it('...', (done) => { ... }, 10000)` |
| Component not rendering | Check template syntax, imports in TestBed |

---

## Best Practices

- Keep tests focused: one concept per test
- Use descriptive names: "should display error when email invalid"
- Mock external services (HTTP, SignalR)
- Test behavior, not implementation
- Clean up timers/subscriptions in afterEach
- Use beforeEach to reduce duplication
- Test edge cases (empty arrays, null values, errors)
