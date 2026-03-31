# Backend Testing

## Purpose
Explains how to write and run xUnit tests for backend services and endpoints.

## When to Load
Read this when writing unit tests for C# code or debugging test failures.

## Related Files
- [Testing Strategy](./strategy.md) — Overall testing approach
- [Backend Services](../03_implementation/backend/services.md) — Service code  to test
- [Domain Model](../03_implementation/backend/domain_model.md) — Domain validation logic
- [Build & Release](../05_operations/build_and_release.md) — CI test setup

---

## Test Setup

**Frameworks:**
- Test Framework: xUnit
- Mocking: Moq
- Assertion: xUnit built-in + FluentAssertions (optional)
- Coverage: Coverlet + reportgenerator

**Project Location:**
- `backend/unit-tests/Ahlcg.ApiService.Tests/`

**Configuration Files:**
- `.csproj` — Declares xUnit, Moq, Coverlet dependencies
- `Ahlcg.ApiService.Tests.csproj`

---

## Running Tests

### All Tests

```bash
cd backend
dotnet test
```

Runs all tests in solution, outputs summary.

### Specific Test Class

```bash
dotnet test --filter "FullyQualifiedName~AuthEndpointsTests"
```

### Specific Test Method

```bash
dotnet test --filter "FullyQualifiedName~AuthEndpointsTests.LoginAnonymously_NotLoggedIn_CreatesAnonymousAccount"
```

### With Coverage

```bash
dotnet test /p:CollectCoverage=true /p:CoverageFormat=cobertura
```

Generates `coverage.cobertura.xml` in test output folder.

### View Coverage Report

```bash
# After CI run, reports are in backend/coveragereport/
open backend/coveragereport/index.htm
```

---

## Writing a Unit Test

Example location: `backend/unit-tests/Ahlcg.ApiService.Tests/AuthEndpointsTests.cs`

**Key Points:**
- Use `[Fact]` for parameterless tests, `[Theory]` for parameterized
- Mock dependencies with `Moq`
- Setup return values with `.Setup(...).Returns(...)`
- Assert with xUnit assertions (`Assert.NotNull`, `Assert.True`, etc.)

---

## Testing Services

**In-Memory Database:**
- Useful for quick testing
- No persistence between tests
- Doesn't test EF Core behavior deeply
- Use DbContext options:
  ```csharp
  var options = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseInMemoryDatabase("unique-name")
    .Options;
  ```

---

## Testing Domain Logic

**Theory with Data:**
- `[Theory]` + `[InlineData(...)]` = parameterized test
- Test multiple inputs with one test method
- Cleaner than writing same test N times

---

## Testing Async Code

**Async Best Practices:**
- Make test method `async Task`
- `await` all async calls
- Don't block with `.Result` (can deadlock)

---

## Common Moq Patterns

### Setup Return Value

```csharp
mock.Setup(x => x.GetUserAsync(It.IsAny<string>()))
  .ReturnsAsync(new AppUser { Id = "1" });
```

### Verify Method was Called

```csharp
mock.Setup(x => x.DeleteAsync(It.IsAny<AppUser>()))
  .Returns(Task.CompletedTask);

// ... test code ...

mock.Verify(x => x.DeleteAsync(It.IsAny<AppUser>()), Times.Once);
```

### Setup Exception

```csharp
mock.Setup(x => x.GetUserAsync(It.IsAny<string>()))
  .ThrowsAsync(new InvalidOperationException("Not found"));
```

### Argument Matching

```csharp
// Exact match
mock.Setup(x => x.CreateAsync(user)).Returns(...);

// Any argument
mock.Setup(x => x.CreateAsync(It.IsAny<AppUser>())).Returns(...);

// Conditional match
mock.Setup(x => x.CreateAsync(It.Is<AppUser>(u => u.Id == "1")))
  .Returns(...);
```

---

## Testing Exceptions

```csharp
[Fact]
public void InvalidPassword_Throws() {
  var user = new AppUser();
  
  var ex = Assert.Throws<InvalidOperationException>(
    () => user.CheckPassword("wrong")
  );
  
  Assert.Contains("Password mismatch", ex.Message);
}

// Async version
[Fact]
public async Task InvalidPassword_Throws_Async() {
  var ex = await Assert.ThrowsAsync<InvalidOperationException>(
    async () => await _service.AuthenticateAsync("wrong-pwd")
  );
  
  Assert.Contains("Password mismatch", ex.Message);
}
```

---

## Debugging Tests

### Run Single Test with Debugger

```bash
# In VS Code with C# extension
# Click "Debug" link above test method

# Or via command line (requires setup)
dotnet test --filter "TestName"
```

### Console Output

```csharp
[Fact]
public void MyTest(ITestOutputHelper output) {
  output.WriteLine("Debug message: {0}", value);
  // Output appears in test results
}
```

### Visual Studio Test Explorer

- Run tests in VS
- Set breakpoints
- Debug session activates

---

## Isolation & Cleanup

### Dispose Pattern

```csharp
public class AuthEndpointsTests : IDisposable {
  private readonly ApplicationDbContext _db;
  
  public AuthEndpointsTests() {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase("test")
      .Options;
    _db = new ApplicationDbContext(options);
  }
  
  public void Dispose() {
    _db?.Dispose();
  }
  
  [Fact]
  public void Test1() { }
  
  [Fact]
  public void Test2() { }
  // Both test2/test2 share same _db, but Dispose called after all tests
}
```

### Fixture Class (Shared Setup)

```csharp
public class DatabaseFixture : IDisposable {
  public ApplicationDbContext DbContext { get; }
  
  public DatabaseFixture() {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase("shared")
      .Options;
    DbContext = new ApplicationDbContext(options);
    Seed();
  }
  
  private void Seed() {
    // Add standard test data
    DbContext.Scenarios.Add(new Scenario { Id = "s-1", Name = "Test" });
    DbContext.SaveChanges();
  }
  
  public void Dispose() => DbContext?.Dispose();
}

// Use in test class
public class GameServiceTests : IClassFixture<DatabaseFixture> {
  private readonly DatabaseFixture _fixture;
  private readonly GameService _service;
  
  public GameServiceTests(DatabaseFixture fixture) {
    _fixture = fixture;
    _service = new GameService(fixture.DbContext, new Mock<ILogger>().Object);
  }
}
```

---

## Coverage Goals

- Overall: >= 70%
- Critical paths (auth, validation): >= 90%
- Services: >= 80%

View coverage:

```bash
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover
# Reports in test output folder
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Object not initialized" | Ensure mocks are setup before use; check constructor |
| Test times out | Async code deadlocking; remove `.Result`, use `await` |
| "Sequence contains no elements" | LINQ query returning empty; add null checks |
| Mock not being called | Verify setup matches actual call (e.g., argument types) |
| Flaky tests | Check for timing issues, randomness, state leakage |

---

## Best Practices

✅ **DO:**
- Test one thing per test
- Use `[Theory]` for parameterized tests
- Mock external dependencies
- Test domain invariants (validation)
- Clean up (IDisposable, Dispose pattern)
- Use in-memory DB for fast unit tests

❌ **DON'T:**
- Test framework code (EF Core internals)
- Write integration tests as unit tests
- Have tests depend on each other
- Use `.Result` on Tasks (blocking, can deadlock)
- Ignore async code; always use `await`
- Test private methods (test public interface)
