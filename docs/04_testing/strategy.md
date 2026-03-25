# Testing Strategy

## Purpose
Describes the overall testing approach, coverage goals, and how testing is integrated into CI/CD.

## When to Load
Read this to understand testing philosophy and how to choose which tests to write.

## Related Files
- [Frontend Testing](./frontend.md) — Karma + Jasmine setup
- [Backend Testing](./backend.md) — xUnit + Moq setup
- [Build & Release](../05_operations/build_and_release.md) — CI integrations
- [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) — Testing patterns

---

## Testing Pyramid

```
        ╱╲
       ╱  ╲  E2E Tests (Browser)
      ╱────╲ ~5–10% of tests
     ╱      ╲
    ╱────────╲
   ╱          ╲ Component/Integration Tests
  ╱────────────╲ ~30–40% of tests
 ╱              ╲
╱──────────────────╲
                    ╲ Unit Tests
                     ╱ ~50–60% of tests
                    ╱
           Base: Fast, many
           Top: Slow, few
```

**Ahlcg's Current Approach:**
- ✅ Unit tests: Domain model, services
- ✅ Component tests: UI components, state management (Jasmine, xUnit)
- 🔄 Integration tests: (Minimal currently)
- ❌ E2E tests: Browser automation (not yet implemented)

---

## Test Scope

### Unit Tests
- **Coverage:** Single method or small function
- **Duration:** < 100ms each
- **Environment:** In-memory, no external dependencies
- **Mocking:** Heavy (mock services, database, etc.)
- **Examples:**
  - Domain model validation (investigator health calculation)
  - Service business logic (filtering emails)
  - Component input/output (button emits events)

### Integration Tests
- **Coverage:** Multiple components or layers together
- **Duration:** 100ms–1s each
- **Environment:** Test database, real services
- **Mocking:** Minimal
- **Examples:**
  - API endpoint (/auth/login) with real database
  - Store updates triggering re-renders
  - HTTP service communicating with mock backend

### E2E Tests (Future)
- **Coverage:** Complete user flows (browser end-to-end)
- **Duration:** 1s–10s each
- **Environment:** Deployed app, real browser
- **Mocking:** None (real API calls)
- **Examples:**
  - User login → deck building → starting game
  - Multiplayer game with two browsers

---

## Code Coverage

**Goals:**
- Overall: >= 70% line coverage
- Critical paths (auth, core logic): >= 90%
- UI components: >= 50% (view testing is expensive)

**Measurement:**
- Backend: `dotnet test --collect:"XPlat Code Coverage"`
- Frontend: `npm run test:ci`
- Aggregation: Coveralls + SonarCloud
- CI reports: Automatic on PR/merge

**Coverage Reporting:**
```bash
# Backend
dotnet test --collect:"XPlat Code Coverage"
# Reports in backend/coveragereport/

# Frontend
npm run test:ci
# Reports in frontend/coverage/
```

---

## Test Naming

**Pattern:** `{ClassName}_{Scenario}_{Expected}`

**Examples:**

```csharp
// Backend
AuthEndpointsTests.cs
  > LoginAnonymously_NotLoggedIn_CreatesAnonymousAccount
  > LoginAnonymously_AlreadyLoggedIn_ReturnsBadRequest
  > LinkCredentials_NewEmail_UpgradesAccount
  > LinkCredentials_ExistingEmail_MergesAccounts

InvestigatorTests.cs
  > TakeDamage_ReducesHealth
  > TakeDamage_SetsDefeatedWhenZero

// Frontend
InvestigatorCard.spec.ts
  > should display investigator name
  > should emit investigatorSelected when clicked
  > should show low health indicator when health < 3

GameStateStore.spec.ts
  > should apply patches correctly
  > should validate state after update
  > should fail validation for invalid state
```

---

## Test Structure (AAA Pattern)

All tests follow Arrange-Act-Assert:

```csharp
// xUnit (Backend)
[Fact]
public async Task LoginAnonymously_CreatesAccount() {
  // Arrange
  var userManager = GetMockUserManager();
  var signInManager = GetMockSignInManager();
  
  // Act
  var result = await LoginAnonymously(userManager, signInManager);
  
  // Assert
  Assert.NotNull(result);
  Assert.True(result.IsAnonymous);
}

// Jasmine (Frontend)
it('should create account and sign in', () => {
  // Arrange
  const service = TestBed.inject(AuthService);
  spyOn(service, 'login').and.returnValue(of({ id: '123', isAnonymous: true }));
  
  // Act
  component.loginAnonymously();
  
  // Assert
  expect(service.login).toHaveBeenCalled();
  expect(component.user()).toBeTruthy();
});
```

---

## Running Tests Locally

### Frontend

```bash
cd frontend

# All tests (headless, watch mode)
npm test

# CI mode (no watch, headless Chrome)
npm run test:ci

# Coverage report
npm run test:ci
# View at frontend/coverage/ahlcg/index.html
```

### Backend

```bash
cd backend

# All tests
dotnet test

# Specific test
dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"

# With coverage
dotnet test /p:CollectCoverage=true
# View at backend/coveragereport/index.html
```

---

## CI Integration

### GitHub Actions Workflow

1. **Frontend Tests** (`.github/workflows/frontend.yml`)
   ```
   npm ci --force
   npm run ci:all  (lint + test)
   ```

2. **Backend Tests** (`.github/workflows/backend.yml`)
   ```
   dotnet restore
   dotnet build
   dotnet test --collect:"XPlat Code Coverage"
   ```

3. **Coverage Aggregation** (`.github/workflows/ci.yml`)
   ```
   Frontend coverage → Coveralls
   Backend coverage → Coveralls
   Parallel-finished job → Merge reports
   ```

4. **SonarCloud Analysis**
   ```
   SonarQube Scan (frontend + backend)
   Quality gates (bugs, vulnerabilities, coverage)
   ```

5. **Visual Regression** (`.github/workflows/chromatic.yml`)
   ```
   Build Storybook
   Run Chromatic with TurboSnap
   ```

---

## Testing Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Async code in tests | Use `async/await` or `.fakeAsync()` (Angular) |
| Real HTTP calls | Mock HttpTestingController (Angular) or HttpClientMock (C#) |
| Database state | Use test transactions with rollback; or in-memory DB |
| Timing issues | Use `done()` callback or promises; avoid sleep() |
| Flaky tests | Retry failed tests; investigate timing/randomness |
| Large test suites | Parallelize (multiple workers); separate fast/slow tests |
| Missing mocks | Use `jest.mock()` or `Moq.Of()` to mock  defaults |

---

## Test Data Management

### Fixtures

Reusable test data:

```csharp
// Backend
public class TestDataBuilder {
  public static Investigator BuildInvestigator(string id = "inv-1") => new() {
    Id = id,
    Name = "Roland Banks",
    Health = 8,
    MaxHealth = 8,
    // ...
  };
}

// Frontend
const mockInvestigator: Investigator = {
  id: 'inv-1',
  name: 'Roland Banks',
  health: 8,
  maxHealth: 8,
  // ...
};
```

### Factories

Generate test data:

```csharp
public class InvestigatorFactory {
  public static Investigator CreateWithHealth(int health) => new() {
    Id = Guid.NewGuid().ToString(),
    Health = health,
    MaxHealth = 8,
  };
}

// Usage
var lowHealth = InvestigatorFactory.CreateWithHealth(2);
var healthy = InvestigatorFactory.CreateWithHealth(8);
```

---

## Assertions

### xUnit (Backend)

```csharp
Assert.NotNull(value);
Assert.True(condition);
Assert.Equal(expected, actual);
Assert.ThrowsAsync<InvalidOperationException>(() => method());
Assert.InRange(value, min, max);
Assert.Collection(items, item => Assert.Equal("x", item.Name));
```

### Jasmine (Frontend)

```typescript
expect(value).toBeTruthy();
expect(value).toEqual(expected);
expect(() => fn()).toThrowError('message');
expect(spy).toHaveBeenCalledWith(arg);
expect(spy).toHaveBeenCalledTimes(2);
```

---

## Debugging Tests

### Browser Console (Karma)

1. Open `localhost:9876` during test run
2. Click "Debug"
3. Browser DevTools opens
4. Set breakpoints, step through code

### VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### xUnit Logging

```csharp
[Fact]
public void MyTest(ITestOutputHelper output) {
  output.WriteLine("Debug message");
  
  try {
    // test code
  }
  catch (Exception ex) {
    output.WriteLine($"Error: {ex}");
    throw;
  }
}
```

---

## Best Practices

✅ **DO:**
- Test behavior, not implementation
- Use descriptive test names
- Keep tests focused (one assertion per test or closely related)
- Mock external dependencies
- Test edge cases (null, empty, boundaries)
- Clean up after tests (tear down fixtures)

❌ **DON'T:**
- Test framework code (Angular, EF Core)
- Write integration tests as unit tests
- Use real HTTP calls or databases
- Have interdependent tests (test order matters)
- Copy-paste test code; refactor duplicates into helpers
- Test private methods (test public interface instead)

---

## Test-Driven Development (TDD)

Optional workflow:

1. **Red:** Write failing test for desired behavior
2. **Green:** Write minimal code to pass test
3. **Refactor:** Improve code while keeping tests green

**Example:**

```csharp
// Step 1: Red - Write test
[Fact]
public void Investigator_TraumaCannotExceedMax() {
  var inv = new Investigator { MaxHealth = 8 };
  inv.TakeTrauma(10);  // Should not exceed 8
  Assert.Equal(8, inv.PhysicalTrauma);  // FAILS
}

// Step 2: Green - Minimal implementation
public void TakeTrauma(int amount) {
  PhysicalTrauma = Math.Min(PhysicalTrauma + amount, MaxHealth);
}

// Step 3: Refactor - Better naming, validation
public void TakePhysicalTrauma(int amount) {
  if (amount < 0) throw new ArgumentException(nameof(amount));
  PhysicalTrauma = Math.Min(MaxHealth, PhysicalTrauma + amount);
}
```
