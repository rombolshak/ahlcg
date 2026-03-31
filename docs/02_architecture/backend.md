# Backend Architecture

## Purpose
Describes the backend's service structure, API organization, database design, and communication patterns.

## When to Load
Read this to understand how the backend is organized and how it handles requests.

## Related Files
- [Backend Services](../03_implementation/backend/services.md) — Service layer patterns and implementations
- [Domain Model](../03_implementation/backend/domain_model.md) — Core domain entities
- [Persistence Layer](../03_implementation/backend/persistence.md) — EF Core and migrations
- [Architecture Overview](./overview.md) — How backend connects to frontend
- [API Reference](../99_reference/api.md) — Complete endpoint documentation
- [Backend Testing](../04_testing/backend.md) — How to test backend code

---

## Backend Stack

| Aspect | Technology | Version |
|--------|-----------|---------|
| Runtime | .NET | 10.0 |
| Web Framework | ASP.NET Core | 10.0 |
| API Style | Minimal APIs | Built-in |
| Authentication | ASP.NET Identity | 10.0 |
| ORM | Entity Framework Core | 9.0 |
| Database Driver | Npgsql | Latest |
| Real-time | SignalR | Built-in |
| Observability | OpenTelemetry | Latest |
| Testing |xUnit + Moq | Latest |
| API Docs | OpenAPI + Scalar | Latest |

---

## Project Structure

```
backend/
├── Ahlcg.sln                          # Solution file
├── .aspire/
│   └── settings.json                  # Aspire AppHost reference
│
├── Ahlcg.ApiService/                  # Main API
│   ├── Program.cs                     # Service configuration, endpoint mapping
│   ├── AuthEndpoints.cs               # /auth route group (login, logout, etc)
│   ├── GameHub.cs                     # SignalR /game hub
│   ├── ApplicationDbContext.cs        # EF Core DbContext
│   │
│   ├── Migrations/                    # EF Core migrations (auto-generated)
│   │   ├── 20251114145044_Initial.cs
│   │   ├── 20251114153547_User_AddIsAnonymous.cs
│   │   └── ApplicationDbContextModelSnapshot.cs
│   │
│   ├── Properties/
│   │   └── launchSettings.json        # Dev launch config
│   │
│   ├── appsettings.json               # Base config
│   ├── appsettings.Development.json   # Dev-specific config
│   ├── Ahlcg.ApiService.csproj        # Project file (dependencies)
│   │
│   └── backend.ApiService.http        # HTTP request file (for testing)
│
├── Ahlcg.AppHost/                     # .NET Aspire orchestrator (local dev)
│   ├── AppHost.cs                     # Configures Postgres, Migrator, API, Frontend
│   ├── appsettings.json
│   ├── Properties/
│   │   └── launchSettings.json
│   └── Ahlcg.AppHost.csproj
│
├── Ahlcg.Migrator/                    # Runs EF migrations at startup
│   ├── Program.cs                     # Hosted service wiring
│   ├── Worker.cs                      # Migration runner
│   └── Ahlcg.Migrator.csproj
│
├── Ahlcg.ServiceDefaults/             # Shared defaults (Observability, Health)
│   ├── Extensions.cs                  # OpenTelemetry, Health checks, Resilience
│   └── Ahlcg.ServiceDefaults.csproj
│
└── unit-tests/
    └── Ahlcg.ApiService.Tests/
        ├── AuthEndpointsTests.cs      # Tests for auth flow
        ├── Ahlcg.ApiService.Tests.csproj
        └── *.spec.cs
```

---

## Service Startup & Configuration

**Program.cs** orchestrates all service registration and middleware.

---

## API Organization

### Route Groups
Endpoints are organized by feature (route group):

| Route Group | Purpose | File |
|------------|---------|------|
| `/auth` | User authentication, account management | `AuthEndpoints.cs` |
| `/game` | SignalR hub for real-time updates | `GameHub.cs` |

Each route group is:
- Defined in separate file (e.g., `AuthEndpoints.cs`)
- Registered in `Program.cs` via `app.MapGroup("path").Map*()`
- Can reuse shared services (auth, logging, etc)

See [API Reference](../99_reference/api.md) for detailed endpoint specs.

---

## Authentication & Identity

### Model
```csharp
public class AppUser : IdentityUser {
  public bool IsAnonymous { get; set; }
}
```

**Properties:**
- `Id` — Unique user identifier (GUID)
- `Email` — User email (null for anonymous)
- `UserName` — Username (null for anonymous)
- `PasswordHash` — Hashed password (null for anonymous)
- `IsAnonymous` — Flag to identify temporary accounts

### Flow
1. Anonymous login creates user with `IsAnonymous = true`
2. Optional upgrade sets email + password hash, `IsAnonymous = false`
3. Login validates credentials, issues session cookie
4. Logout deletes anon accounts, keeps permanent ones

See [Authentication Flow](../01_product/flows/authentication.md) for product perspective.

---

## Database & Persistence

### Entity Framework Core + PostgreSQL

- **DbContext:** `ApplicationDbContext(IdentityDbContext<AppUser>)`
- **Migrations:** EF-generated migration files in `Migrations/` folder
- **Pattern:** Code-first (define C# classes, migrations generate SQL)

### Current Schema
- `AspNetUsers` — User accounts (from Identity)
  - `IsAnonymous` column (custom addition)
- `AspNetUserClaims`, `AspNetUserLogins`, `AspNetUserTokens` — Identity support tables

### Migration Workflow
1. Model changes → Update C# classes
2. Run `dotnet ef migrations add {Name}` → Creates migration file
3. Migrations automatically applied at startup by Migrator service
4. See [Persistence Layer](../03_implementation/backend/persistence.md) for details

---

## Real-Time Communication: SignalR

### Hub: `/game`
Located in `GameHub.cs`.

**Current State:** Single `Ping()` method (demo).

---

## Observability

### OpenTelemetry Setup
Configured in `Ahlcg.ServiceDefaults/Extensions.cs`.

**Data Collection:**
- **Logs:** Requests, errors, business events
- **Metrics:** Request count, latency, error rates, memory use, GC
- **Traces:** Request flow through system (distributed tracing)

**Export:** Via OTLP (OpenTelemetry Protocol) to external system when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

### Health Checks
Configured in `Ahlcg.ServiceDefaults/Extensions.cs`:

- `/health` — Readiness probe (are we ready to handle requests?)
- `/alive` — Liveness probe (is the process still running?)

Dev-only (not exposed in production by default).

### Error Handling
- **ProblemDetails:** RFC 7807 standard format for error responses
- **Developer Exception Page:** Dev-only detailed error info
- **Structured Logging:** Error context included in trace logs

---

## Input Validation

ASP.NET Core's built-in validation.

**Validation Attributes:** `[Required]`, `[EmailAddress]`, `[MinLength]`, etc.
**Custom Validators:** Implement `IValidator<T>` for complex logic.

---

## Database Structure & Relationships

See Ahlcg.ApiService/Migrations/ApplicationDbContextModelSnapshot.cs for actual structure.

---

## Middleware Pipeline

Request flow through middleware:

```
1. ExceptionHandling
2. CORS (future)
3. Routing
4. Authentication (cookie validation)
5. Authorization (policy checks)
6. Endpoint Execution
7. Response Headers (e.g., HSTS, CSP)
8. Logging & Diagnostics
```

---

## Configuration Management

**appsettings.json** — Default settings
**appsettings.Development.json** — Dev overrides
**Environment Variables** — Runtime configuration

Example:
```json
{
  "Logging": { "LogLevel": { "Default": "Information" } },
  "Aspire": { ... },
  "ConnectionStrings": { "ahlcg": "..." }
}
```

Production uses environment variables or secret stores (Azure Key Vault, etc).

---

## AppHost (.NET Aspire)

Spins up:
- PostgreSQL container + PgAdmin
- Migrator service (applies migrations)
- API service (ASP.NET Core)
- Frontend dev server (npm start)
- Health checks and dependency order

Not used in production; for development only.

---

## Key Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| Service | Business logic | `IAuthService` |
| Middleware | Cross-cutting concerns | Auth, logging, CORS |
| Dependency Injection | Decoupling | Services registered in Program.cs |
| Route Groups | Organization | `/auth`, `/game`, future groups |
| SignalR Hubs | Real-time | `GameHub` |

---

## Performance Considerations

- **Connection Pooling:** EF Core pools DB connections
- **Caching:** Response caching for static endpoints (future)
- **Async/Await:** All I/O operations are asynchronous
- **Hosted Services:** Migrator runs as background service
- **Lazy Loading:** EF relationships can be loaded on demand (virtual properties)
- **Query Optimization:** Use `.Select()` projections to fetch only needed columns

---

## Security Hardening Checklist

- [ ] **HTTPS:** Enforce TLS end-to-end
- [ ] **CORS:** Explicit allowed origins, credentials, headers
- [ ] **CSRF:** Anti-forgery tokens (if cross-origin cookies)
- [ ] **Cookies:** `Secure`, `HttpOnly`, `SameSite` attributes
- [ ] **Data Protection:** Keys persisted across instances
- [ ] **Rate Limiting:** On auth endpoints (prevent brute-force)
- [ ] **Input Validation:** All endpoints validate inputs
- [ ] **Secrets:** Externalized (not in source code)
- [ ] **PII:** Not logged or exposed in errors
- [ ] **Health Endpoints:** Run on private network only

See [Security & Secrets](../05_operations/security.md) for full checklist.
