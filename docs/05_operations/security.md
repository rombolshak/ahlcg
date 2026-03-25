# Security and Secrets

## Purpose
Reference for authentication design, transport security, CORS/CSRF handling, secrets management, and production hardening.

## When to Load
Read this before deploying to production, when configuring authentication, handling secrets, or planning cross-origin scenarios.

## Related Files
- [Product Overview](../01_product/overview.md) — User flows including auth
- [Backend Services](../03_implementation/backend/services.md) — Auth endpoint implementation
- [Development Workflow](./dev_workflow.md) — Local dev with Aspire

---

## Authentication Model

### Cookie-Based Sessions

**Current Setup:**
- ASP.NET Identity with cookie-based authentication
- Cookies configured with 90-day lifetime and sliding expiration
- Cookies include `HttpOnly`, `Secure` (HTTPS only), implicit `SameSite` policy

**Implementation:**

```csharp
builder.Services.AddIdentityApiEndpoints<AppUser>()
  .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.ConfigureApplicationCookie(options => {
  options.ExpireTimeSpan = TimeSpan.FromDays(90);
  options.SlidingExpiration = true;
  options.Cookie.HttpOnly = true;
  options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
  // SameSite defaults to Lax
});
```

### Anonymous Accounts & Upgrade Flow

**Anonymous Login:**

```csharp
POST /auth/login-anonymous
→ Creates AppUser with IsAnonymous=true
→ Signs in user (cookie issued)
```

**Upgrade (Link Credentials):**

```csharp
POST /auth/link-credentials
Body: { email, password }
→ If new email: Upgrades anonymous account
→ If existing account: Merges after password validation
→ Sets IsAnonymous=false
```

**Logout:**

```csharp
POST /auth/logout
→ Deletes account if IsAnonymous=true
→ Signs out (cookie cleared)
```

**Use Case:** Users can play anonymously, then create permanent account without losing progress.

### Authorization

**SignalR Hub:**

```csharp
[Authorize]
public class GameHub : Hub {
  public async Task Ping() { ... }
}
```

Hub `/game` requires authentication; anonymous users can access if signed in.

**Roles/Claims:**

- No role-based authorization yet
- All endpoints treat authenticated users equally
- Extend with role-based policy when needed

---

## Transport Security

### Current Status

- No explicit HTTPS redirection in code
- Safe for development (localhost works without HTTPS)
- **Production:** Requires hardening

### Production Configuration

**HTTPS Enforcement:**

```csharp
if (!app.Environment.IsDevelopment()) {
  app.UseHttpsRedirection();  // Redirect HTTP → HTTPS
  app.UseHsts();              // Add Strict-Transport-Security header
}
```

**HSTS Header:**

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Ensures browsers only use HTTPS for this domain.

**TLS Termination:**

- Option A: Terminate at load balancer/proxy; use `X-Forwarded-Proto: https` header
- Option B: Terminate in application (add HTTPS certificate to Kestrel)

### Cookie Attributes (Production)

**Co-hosted (SPA + API on same origin):**

```csharp
options.Cookie.SameSite = SameSiteMode.Lax;  // CSRF protection
options.Cookie.SecurePolicy = CookieSecurePolicy.Always;  // HTTPS only
options.Cookie.HttpOnly = true;  // No JS access
```

**Cross-origin (SPA and API on different origins):**

```csharp
options.Cookie.SameSite = SameSiteMode.None;  // Allow cross-site
options.Cookie.SecurePolicy = CookieSecurePolicy.Always;  // HTTPS required
options.Cookie.HttpOnly = true;
options.Cookie.Domain = ".example.com";      // Allow subdomains
options.Cookie.Path = "/";                   // Root path
```

⚠️ **Warning:** `SameSite=None` requires `Secure` (HTTPS) and increases CSRF risk.

---

## CORS Configuration

### Current Status

- **No CORS configured** in code
- Works for co-hosted scenarios (SPA + API on same origin)
- **Fails for cross-origin** scenarios without configuration

### Cross-Origin Setup

**Enable CORS:**

```csharp
builder.Services.AddCors(options => {
  options.AddPolicy("AllowFrontend", policy => {
    policy
      .WithOrigins("https://app.example.com")  // Specific origin
      .AllowAnyMethod()
      .AllowAnyHeader()
      .AllowCredentials()  // Allow cookies
      .WithExposedHeaders("content-length");  // Custom headers if needed
  });
});

app.UseCors("AllowFrontend");
```

**Apply to SignalR:**

```csharp
app.MapHub<GameHub>("/game")
  .RequireHost("api.example.com")
  .WithMetadata(new EnableCorsAttribute("AllowFrontend"));
```

**Preflight Configuration:**

```csharp
policy.WithHeaders("Content-Type", "Authorization", "X-CSRF-Token")
      .SetPreflightMaxAge(TimeSpan.FromSeconds(3600));
```

Prevents unnecessary OPTIONS requests.

---

## CSRF Protection

### Risk Assessment

| Scenario | Risk | Mitigation |
|----------|------|-----------|
| Co-hosted, `SameSite=Lax` | Low | Browser blocks cross-site POST |
| Cross-origin, `SameSite=None` | High | Must use CSRF token or header auth |
| GET endpoints | Very Low | GET should not change state |

### CSRF Controls (Current Implementation)

The codebase does not currently expose a dedicated `/auth/csrf-token` endpoint, and it does not yet use a custom header-vs-cookie token comparison path. Instead it relies on cookie-based session authentication with `SameSite=Lax`.

**Current and recommended settings:**
- `ConfigureApplicationCookie` sets `HttpOnly = true`, `SecurePolicy = CookieSecurePolicy.Always`, `SameSite = SameSiteMode.Lax`, and a 90-day sliding expiration.
- For stricter CSRF protection in future, implement `services.AddAntiforgery(...)` and `IAntiforgery.ValidateRequestAsync(ctx)`.

### Alternative: Header-Based Auth (JWT)

Avoids CSRF entirely but requires secure token storage and non-persistent storage.

```typescript
// Store JWT in memory (non-persistent) and clear on page unload
let token: string | null = jwtToken;
window.addEventListener('beforeunload', () => {
  token = null;
});

// Preferred approach: use httpOnly secure cookie + automatic refresh flow
```

---

## Secrets Management

### Development (Local)

**User Secrets:**

```bash
# Aspire AppHost securely stores local secrets
cd backend/Ahlcg.AppHost
dotnet user-secrets set "Bugsnag:ApiKey" "your-key"
# Stored in ~/.microsoft/usersecrets/<project-id>/secrets.json (not in repo)
```

**Environment Variables:**

```bash
export ConnectionStrings__DefaultConnection="postgres://user:pass@localhost/ahlcg"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
dotnet run
```

### Production (Deployment)

**Use a Secret Store:**

- **Option A: Azure Key Vault**
  ```csharp
  var client = new SecretClient(new Uri("https://vault.azure.net"), credential);
  var secret = await client.GetSecretAsync("DbConnectionString");
  builder.Configuration["ConnectionStrings:Default"] = secret.Value.Value;
  ```

- **Option B: AWS Secrets Manager**
  ```csharp
  var client = new SecretsManagerClient();
  var secret = await client.GetSecretValueAsync("ahlcg/db-connection");
  builder.Configuration["ConnectionStrings:Default"] = secret.SecretString;
  ```

- **Option C: Environment Variables**
  ```bash
  docker run -e ConnectionStrings__DefaultConnection="..." ahlcg-api
  ```

### Secrets Rotation

| Secret | Rotation Frequency | Impact |
|--------|--------------------|--------|
| Database password | Every 90 days | Requires config update |
| API keys (Bugsnag) | Every 180 days | Frontend redeploy |
| OTEL exporter token | Every 90 days | No downtime (runtime config) |
| TLS cert | Before expiry (1-3 years) | Requires load balancer restart |

### Avoid These Mistakes

❌ **DON'T:**

```csharp
// NEVER hardcode secrets
var password = "super-secret-password";

// NEVER commit .env files
// .env (contains secrets)

// NEVER log secrets
logger.LogInformation($"Password: {password}");

// NEVER keep old secrets in history
git commit -m "Remove secrets"  // Too late, still in git log
```

✅ **DO:**

```csharp
// Use configuration
var password = configuration["Database:Password"];

// Use .gitignore
echo ".env" >> .gitignore
echo "secrets.json" >> .gitignore

// Redact in logs
logger.LogInformation("User authenticated");

// Use git-secrets or TruffleHog to prevent commits
git secrets install
```

---

## Data Protection Keys (Multiple Instances)

When running multiple backend instances, you must persist Data Protection keys:

### Problem

```
Instance A issues cookie signed with key K1.
Instance A restarts, generates new key K2.
Cookie issued by A before restart is now invalid (signed with K1).
User logs out unexpectedly.
```

### Solution: Persist Keys to Shared Storage

**Azure Blob Storage:**

```csharp
builder.Services.AddDataProtection()
  .PersistKeysToAzureBlobStorage(
    new Uri("https://storage.blob.core.windows.net/dpkeys/"),
    new DefaultAzureCredential());
```

**Redis:**

```csharp
var redis = StackExchange.Redis.ConnectionMultiplexer
  .Connect("redis.example.com:6379");
builder.Services.AddDataProtection()
  .PersistKeysToStackExchangeRedis(redis);
```

**File System (single server only):**

```csharp
builder.Services.AddDataProtection()
  .PersistKeysToFileSystem(new DirectoryInfo("/var/lib/ahlcg/keys"));
```

---

## Observability & PII

### Logging Best Practices

**Avoid logging:**

```csharp
// ❌ DON'T log sensitive data
logger.LogInformation($"User {userId} logged in with password {password}");
logger.LogInformation($"Token: {bearerToken}");
logger.LogInformation($"Email: {userEmail}");
```

**Instead:**

```csharp
// ✅ DO log safely
logger.LogInformation("User {UserId} logged in", userId);
logger.LogInformation("Authentication successful");
logger.LogInformation("Email validation passed");
```

### OpenTelemetry Configuration

**Set export endpoint:**

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
dotnet run
```

**Scrub PII in traces:**

```csharp
builder.Services.AddOpenTelemetry()
  .WithTracing(builder => {
    builder
      .AddAspNetCoreInstrumentation(opt => {
        opt.RequestHeadersToRedact.Add("Authorization");
        opt.ResponseHeadersToRedact.Add("Set-Cookie");
      });
  });
```

### ProblemDetails Responses

**Development (shows detailed errors):**

```
ASPNETCORE_ENVIRONMENT=Development
→ Stack traces visible
→ Internal exceptions exposed
```

**Production (hides details):**

```csharp
app.UseDeveloperExceptionPage();  // Only in Development
```

Generic error response in production:

```json
{
  "type": "https://example.com/errors/internal-error",
  "title": "An error occurred",
  "status": 500
}
```

---

## Health Checks & API Docs

### Health Endpoints (Development Only)

**Current:**

```csharp
if (app.Environment.IsDevelopment()) {
  app.MapHealthChecks("/health");
  app.MapHealthChecks("/alive");
}
```

**Production Recommendation:**

Expose on private network only (internal health checks) or behind auth.

```csharp
// Option A: Behind authentication
app.MapHealthChecks("/health")
  .RequireAuthorization();

// Option B: Custom handler (returns minimal info)
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
  .AllowAnonymous();
```

### OpenAPI/Swagger (Development Only)

**Current:**

```csharp
if (app.Environment.IsDevelopment()) {
  app.MapOpenApi();
  app.MapScalarApiReference();
}
```

Automatically disabled in Production.

**Production Override (if needed):**

```csharp
// Behind auth
if (app.Environment.IsDevelopment() || IsInternalNetwork(ctx)) {
  app.MapOpenApi();
}

// Or protect with API key
app.MapOpenApi()
  .RequireAuthorization("InternalApiKey");
```

---

## Production Hardening Checklist

### Pre-Deployment

- [ ] Configure HTTPS/TLS (certificate, redirect, HSTS)
- [ ] Setup Data Protection key persistence (Azure, Redis, or filesystem)
- [ ] Move all secrets to secret store (not env vars, not code)
- [ ] Configure database credentials in secure store
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Disable developer exception page and OpenAPI UI
- [ ] Enable health check access control
- [ ] Configure CORS with explicit `AllowCredentials=true` if cross-origin
- [ ] Enable CSRF protection if using cookies cross-origin
- [ ] Configure OpenTelemetry exporter endpoint
- [ ] Test cookie handling across origins (if applicable)

### Runtime

- [ ] Verify HTTPS redirection working
- [ ] Test authentication flow end-to-end
- [ ] Monitor DataProtection key rotations
- [ ] Log authentication attempts (without passwords)
- [ ] Setup alerts for repeated 401/403 responses
- [ ] Regularly rotate secrets (quarterly minimum)
- [ ] Monitor and audit API usage via OTEL
- [ ] Test with real HTTPS certificate (not self-signed)

### Ongoing

- [ ] Patch ASP.NET Core within 30 days of release
- [ ] Review and rotate API keys (Bugsnag, etc.)
- [ ] Audit CORS origins quarterly
- [ ] Test disaster recovery (key loss, DB restore)
- [ ] Review logs for suspicious patterns
- [ ] Keep Data Protection keys backed up

---

## Reference

### Key Configuration Files

- [Program.cs](../../backend/Ahlcg.ApiService/Program.cs) — Identity, cookies, middleware setup
- [AuthEndpoints.cs](../../backend/Ahlcg.ApiService/AuthEndpoints.cs) — Auth endpoint implementation
- [GameHub.cs](../../backend/Ahlcg.ApiService/GameHub.cs) — SignalR authorization
- [Extensions.cs](../../backend/Ahlcg.ServiceDefaults/Extensions.cs) — Health checks, OTEL setup
- [app.config.ts](../../frontend/src/app/app.config.ts) — Frontend Bugsnag configuration (⚠️ contains API keys)

### External References

- [ASP.NET Identity Security](https://learn.microsoft.com/en-us/aspnet/core/security/)
- [OWASP: CORS Configuration](https://owasp.org/www-community/attacks/csrf)
- [Azure Key Vault Integration](https://learn.microsoft.com/en-us/azure/key-vault/)
- [Secrets Manager CLI](https://aws.amazon.com/secretsmanager/)
