# Security and Secrets

This document summarizes the current security posture, authentication model, secrets handling, and cross-origin considerations for the Ahlcg monorepo. Where something is inferred (not explicitly configured in code), it is labeled INFERENCE with evidence and confidence.

Contents
- Authentication and authorization
- Transport security (HTTPS/HSTS)
- CORS and cross-origin cookies
- CSRF considerations
- Secrets management
- Observability and data handling
- Health checks and API docs exposure
- Production hardening checklist
- Evidence index

## Authentication and authorization

- Identity and cookies (server-side sessions)
  - The API uses ASP.NET Identity with cookie-based authentication, and registers built-in minimal API endpoints plus EF Core stores.
  - Evidence:
    - backend/Ahlcg.ApiService/Program.cs: `builder.Services.AddIdentityApiEndpoints<AppUser>().AddEntityFrameworkStores<ApplicationDbContext>();`
    - backend/Ahlcg.ApiService/Program.cs: cookie configured with long lifetime and sliding expiration: `options.ExpireTimeSpan = TimeSpan.FromDays(90); options.SlidingExpiration = true;`

- Anonymous accounts with upgrade flow
  - Anonymous login creates a temporary user (`IsAnonymous=true`) and signs it in.
  - `linkCredentials` upgrades the current anonymous user to a permanent account (or merges into an existing account after password validation).
  - Logout deletes the account if it is anonymous, then signs out.
  - Evidence:
    - backend/Ahlcg.ApiService/AuthEndpoints.cs: `public class AppUser : IdentityUser { public bool IsAnonymous { get; set; } }`
    - backend/Ahlcg.ApiService/AuthEndpoints.cs: `LoginAnonymously`, `LinkCredentials`, `Logout` implementation and descriptions.

- Authorization on SignalR
  - The SignalR hub `/game` requires authentication.
  - Evidence:
    - backend/Ahlcg.ApiService/GameHub.cs: `[Authorize] public class GameHub : Hub { ... }`

- INFERENCE: Roles/claims
  - No role- or claim-based authorization logic is present yet beyond cookie sign-in.
  - Certainty: high. Evidence: no role policies in Program.cs; endpoints do not use role-based authorization attributes.

- INFERENCE: ASP.NET Core Data Protection keys
  - Not configured. In production with multiple instances, persist Data Protection keys (e.g., blob storage, Redis) to avoid cookie invalidation on restarts or instance changes.
  - Certainty: high. Evidence: no DataProtection configuration present.

## Transport security (HTTPS/HSTS)

- Current status
  - No explicit HTTPS/HSTS configuration is present in Program.cs. This is typical for sample/dev code; in production, terminate TLS at a reverse proxy or enable HTTPS redirection and HSTS.
  - Evidence: backend/Ahlcg.ApiService/Program.cs shows no `UseHttpsRedirection()` or HSTS setup.

- Recommendations (production)
  - Terminate TLS at a load balancer or reverse proxy, or enable HTTPS redirection and HSTS at the app level.
  - Mark auth cookies as `Secure` and review `SameSite` and `Domain/Path` attributes based on deployment topology.

## CORS and cross-origin cookies

- Current status
  - No CORS is configured in the API, and cookies are used for auth. If the SPA and API are hosted on different origins, cross-origin credentials will fail unless CORS and cookie attributes are set accordingly.
  - Evidence: backend/Ahlcg.ApiService/Program.cs contains no `AddCors` or `UseCors` calls.

- INFERENCE: Deployment topology
  - If SPA and API are served on the same origin (co-hosted), CORS can remain disabled. If they are on different origins, CORS must be configured to allow credentials for both REST and SignalR endpoints.
  - Certainty: medium. AppHost runs Angular dev server externally (`AddViteApp("webfrontend", "../../frontend", "start")`), implying cross-origin during dev.

- Recommended CORS configuration (production)
  - Allow only known frontend origins (e.g., https://app.example.com).
  - Set `AllowCredentials=true`; allow `Authorization`, `Content-Type`, and any custom headers needed.
  - Apply CORS to both API routes and SignalR hub (`/game`).
  - Configure preflight (OPTIONS) responses with adequate `Access-Control-Max-Age`.

- Cookie attributes
  - If cross-origin with cookies:
    - Set cookies with `SameSite=None; Secure`.
    - Ensure TLS is always used (otherwise Secure cookies won’t be sent).
  - If co-hosted on a single origin:
    - Prefer `SameSite=Lax` for CSRF protection, assuming navigation-based flows.

## CSRF considerations

- Current status
  - State-changing endpoints exist under `/auth`; they rely on cookie-based auth. With `SameSite=None` cookies (cross-origin scenario), CSRF protections are required server-side because browsers will send cookies on cross-site requests.
  - Evidence: backend/Ahlcg.ApiService/AuthEndpoints.cs defines POST endpoints for login, link, logout; no anti-forgery is apparent.

- Options (choose one or combine)
  1) Co-host SPA and API on the same origin and keep `SameSite=Lax` cookies. This mitigates most CSRF via browser rules for top-level navigation but verify POST semantics in your flows.
  2) Add CSRF protection for cross-origin:
     - Use anti-forgery tokens (synchronizer token pattern) and require a header (e.g., `X-CSRF-Token`) on state-changing requests.
     - Implement the double-submit cookie pattern (less preferred for highly sensitive flows).
  3) Switch to token-based auth (e.g., JWT in Authorization header) and do not use cookies for cross-origin flows. This shifts responsibility to client code (store/refresh tokens securely) and avoids CSRF at the HTTP layer but introduces XSS risks if tokens are not protected.

- Additional controls
  - Enable rate limiting on auth endpoints to mitigate brute-force attempts.
  - Validate `Origin` and `Referer` headers on state-changing requests when feasible.

## Secrets management

- Current secrets usage
  - CI secrets (GitHub Actions): `SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`.
    - Evidence: .github/workflows/backend.yml uses `secrets.SONAR_TOKEN`; .github/workflows/chromatic.yml uses `secrets.CHROMATIC_PROJECT_TOKEN`.
  - AppHost user secrets (local dev):
    - Evidence: backend/Ahlcg.AppHost/Ahlcg.AppHost.csproj contains `<UserSecretsId>...</UserSecretsId>`.
  - Bugsnag keys (frontend) are hardcoded in source:
    - Evidence: frontend/src/app/app.config.ts: `Bugsnag.start({ apiKey: '...' })`; `BugsnagPerformance.start({ apiKey: '...' })`.

- Sensitive configuration to externalize
  - Bugsnag API keys (frontend).
  - Database connection strings (production), OTEL exporter endpoints.
  - Any third-party API credentials (none observed beyond Bugsnag in the snapshot).

- Recommended handling
  - Backend:
    - Use environment variables and/or a secret store (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault).
    - Do not log secrets; mask them in diagnostics/exporters.
    - For multi-instance deployments, configure ASP.NET Core Data Protection key storage (e.g., shared blob/Redis).
  - Frontend:
    - Avoid committing API keys. Use environment files, build-time replacements, or runtime-injected configuration (e.g., window.__env JSON served by the backend).
    - For public RUM tools (like Bugsnag), consider project-scoped browser keys distinct from server-side keys; rotate keys regularly.

- INFERENCE: Database credentials in production
  - AppHost wires EF to Postgres locally via resource binding `.AddNpgsqlDbContext<ApplicationDbContext>("ahlcg")`. In production, provide explicit connection strings via environment or a configuration provider and keep them out of source control.
  - Certainty: high. Evidence: backend/Ahlcg.ApiService/Program.cs uses `.AddNpgsqlDbContext<ApplicationDbContext>("ahlcg")` (Aspire pattern).

## Observability and data handling

- OpenTelemetry
  - Exporter is enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
  - Evidence: backend/Ahlcg.ServiceDefaults/Extensions.cs checks this configuration and wires exporters accordingly.

- PII and logs
  - Avoid logging PII, secrets, or tokens. Review log levels and message content in production.
  - INFERENCE: No current PII filters present; implement logging scopes/filters if needed.

- ProblemDetails
  - `AddProblemDetails()` is registered. Ensure production responses don’t include sensitive stack traces or internal details. Developer exception page is only enabled in Development.
  - Evidence: backend/Ahlcg.ApiService/Program.cs registers ProblemDetails; `app.UseDeveloperExceptionPage()` inside Development.

## Health checks and API docs exposure

- Health checks
  - Mapped only in Development by `MapDefaultEndpoints()` (which early-returns outside Development).
  - Evidence: backend/Ahlcg.ServiceDefaults/Extensions.cs: `if (!app.Environment.IsDevelopment()) return app;` then `app.MapHealthChecks("/health"); app.MapHealthChecks("/alive", ...)`.
  - Note: AppHost defines `WithHttpHealthCheck("/health")` for the API. For production, decide whether to expose `/health` (internally) and enable health mappings accordingly.

- OpenAPI & Scalar UI
  - Exposed only in Development:
  - Evidence: backend/Ahlcg.ApiService/Program.cs inside `if (app.Environment.IsDevelopment()) { app.MapOpenApi(); app.MapScalarApiReference(); ... }`.

- Recommendation (production)
  - Expose health endpoints only on private networks or behind auth (or restrict to liveness/readiness without sensitive checks).
  - Keep Swagger/Scalar disabled in production or protect behind auth/firewall.

## Production hardening checklist

- Authentication and sessions
  - Persist Data Protection keys across instances.
  - Review cookie settings (`Secure`, `SameSite`, `HttpOnly`, `Domain`, `Path`).
  - Consider session idle timeouts shorter than 90 days or add re-auth flows for sensitive operations.

- Cross-origin and CSRF
  - If SPA and API are on different origins:
    - Configure CORS with explicit `AllowedOrigins` and `AllowCredentials`.
    - Use `SameSite=None; Secure` cookies.
    - Add CSRF protection (anti-forgery token header) or avoid cookies in cross-origin by using header-based auth tokens.
  - If co-hosted:
    - Keep CORS disabled; use `SameSite=Lax` cookies and HTTPS.

- Secrets
  - Move all secrets out of source code. Rotate keys periodically (Bugsnag, etc.).
  - Use environment variables or a centralized secret store.
  - Lock down CI secrets to least privilege.

- Transport security
  - Enforce TLS end-to-end. If terminating TLS at a proxy, ensure `X-Forwarded-*` headers are honored and redirection is correct.
  - Consider enabling HSTS with safe preload directives after verifying subdomain coverage.

- API surface
  - Rate limit and/or captcha-protect auth endpoints to mitigate abuse.
  - Validate request sizes and add input validation (already partially present via endpoint validation).
  - Build domain-level authorization once domain APIs are added.

- Observability
  - Scrub PII in logs/traces/metrics where applicable.
  - Configure OTLP exporter credentials and endpoints via secrets.

- Health and docs
  - Limit health endpoint exposure to internal networks; avoid disclosing sensitive info.
  - Keep OpenAPI UIs disabled or protected in production.

## Evidence index

- Identity + cookies:
  - backend/Ahlcg.ApiService/Program.cs: `AddIdentityApiEndpoints<AppUser>()`, cookie options, `UseAuthentication()`, `UseAuthorization()`.
- Auth endpoints and anonymous user model:
  - backend/Ahlcg.ApiService/AuthEndpoints.cs: `AppUser.IsAnonymous`, `loginAnonymously`, `linkCredentials`, `logout`, `info`.
- SignalR authorization:
  - backend/Ahlcg.ApiService/GameHub.cs: `[Authorize]` hub at `/game`.
- Health checks (dev-only mapping):
  - backend/Ahlcg.ServiceDefaults/Extensions.cs: `MapHealthChecks("/health")` and `"/alive"` inside Development-only block.
- OpenAPI/Scalar (dev-only):
  - backend/Ahlcg.ApiService/Program.cs: `app.MapOpenApi(); app.MapScalarApiReference();`.
- AppHost health probe (note on prod):
  - backend/Ahlcg.AppHost/AppHost.cs: `.WithHttpHealthCheck("/health")` for the API service.
- Secrets in CI:
  - .github/workflows/backend.yml: `secrets.SONAR_TOKEN`
  - .github/workflows/chromatic.yml: `secrets.CHROMATIC_PROJECT_TOKEN`
- Frontend Bugsnag keys:
  - frontend/src/app/app.config.ts: `Bugsnag.start({ apiKey: '...' })`, `BugsnagPerformance.start({ apiKey: '...' })`.
- OTLP exporter toggle:
  - backend/Ahlcg.ServiceDefaults/Extensions.cs: checks `OTEL_EXPORTER_OTLP_ENDPOINT`.
