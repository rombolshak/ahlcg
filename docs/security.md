# Security

## Current posture

Everything below is what the code actually does today.

**Sessions** — ASP.NET Identity with cookie authentication. `Program.cs`:

```csharp
options.ExpireTimeSpan = TimeSpan.FromDays(90);
options.SlidingExpiration = true;
options.Cookie.HttpOnly = true;
options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
options.Cookie.SameSite = SameSiteMode.Lax;
```

`SecurePolicy = Always` means the cookie is only sent over HTTPS. The frontend never reads or handles the cookie; there is no token storage anywhere in the client.

**Authorization** — opt-in per route via `.RequireAuthorization()`. `/auth/info` and `/auth/linkCredentials` require it; `/auth/loginAnonymously` and `/auth/logout` do not. `GameHub` is `[Authorize]`. There are no roles, policies, or claims checks — any authenticated user, anonymous or permanent, is treated identically.

**Password handling** — entirely ASP.NET Identity (hashing, verification, complexity defaults). No custom crypto.

**Transport** — no `UseHttpsRedirection()`, no HSTS. Fine for localhost; not for production.

**CORS** — not configured. Works because the SPA and API are same-origin through the dev proxy. Cross-origin hosting will fail until a policy with `AllowCredentials()` is added.

**CSRF** — mitigated only by `SameSite=Lax`. No antiforgery tokens; `AddAntiforgery` is not registered.

**Secrets in the repo** — the Bugsnag browser API key is hardcoded in `frontend/src/app/app.config.ts`. That is deliberate: browser error-reporting keys are public by design. No other secrets are committed. Local backend secrets belong in user-secrets (`dotnet user-secrets`), CI secrets in GitHub repository secrets (`SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`).

**Health and docs endpoints** — `/health`, `/alive`, `/openapi/v1.json`, and `/scalar/v1` are all gated on `IsDevelopment()`, so they are absent elsewhere.

**Known gap** — `LinkCredentials` deletes the anonymous account when merging into an existing email (`// TODO transfer all data to the linked account`). Data loss, not a security hole, but it is in the auth path.

## Before deploying

Nothing in this repo deploys anything; there is no Dockerfile, pipeline, or environment config. If that changes, the following must be handled — none of it exists yet:

- [ ] HTTPS: `UseHttpsRedirection()` + `UseHsts()` outside Development, real certificate, TLS termination decided
- [ ] Data Protection key persistence to shared storage — without it, every API instance signs cookies with its own key and restarts log users out
- [ ] Connection string and any secrets sourced from the environment or a secret store, never from `appsettings.json`
- [ ] `ASPNETCORE_ENVIRONMENT=Production`, which already disables the developer exception page, OpenAPI, Scalar, and the health endpoints — confirm health checks are re-exposed on a private path if an orchestrator needs them
- [ ] CORS policy with explicit origins and `AllowCredentials()` if the SPA is not same-origin; if cross-origin, `SameSite=None` becomes necessary and antiforgery tokens become mandatory
- [ ] Rate limiting on `/auth/*`
- [ ] Verify no PII reaches logs or traces; redact `Authorization` and `Set-Cookie` in OTel instrumentation

## Key files

- `backend/Ahlcg.ApiService/Program.cs` — Identity, cookie options, middleware order
- `backend/Ahlcg.ApiService/AuthEndpoints.cs` — auth handlers and `AppUser`
- `backend/Ahlcg.ApiService/GameHub.cs` — hub authorization
- `backend/Ahlcg.ServiceDefaults/Extensions.cs` — OTel, health checks
- `frontend/src/app/app.config.ts` — Bugsnag key (public)
