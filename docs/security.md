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

**Authorization** — opt-in per route via `.RequireAuthorization()`; read the endpoint definitions for which routes carry it. `GameHub` is `[Authorize]`. There are no roles, policies, or claims checks — any authenticated user, anonymous or permanent, is treated identically. Nothing checks ownership of a resource either: `Game.OwnerId` is recorded but not yet enforced anywhere.

**Password handling** — entirely ASP.NET Identity (hashing, verification, complexity defaults). No custom crypto.

**Brute force** — `SignIn` verifies passwords with `SignInManager.CheckPasswordSignInAsync(..., lockoutOnFailure: true)`, so failed attempts count against Identity's lockout. No `IdentityOptions.Lockout` is configured, so the defaults stand: 5 attempts, 5-minute lockout, enabled for new users. `SignIn` also sets `LockoutEnabled` explicitly on the accounts it creates and on anonymous accounts it upgrades — the upgrade path needs it because `AllowedForNewUsers` only applies at `CreateAsync`, and that row already exists. A locked-out account returns `403`, the same as a wrong password, so the endpoint does not leak which emails are registered.

This covers guessing an existing password. It does not cover the account *creation* path below, which is still unmetered.

**Transport** — no `UseHttpsRedirection()`, no HSTS. Fine for localhost; not for production.

**CORS** — not configured. Works because the SPA and API are same-origin through the dev proxy. Cross-origin hosting will fail until a policy with `AllowCredentials()` is added.

**CSRF** — mitigated only by `SameSite=Lax`. No antiforgery tokens; `AddAntiforgery` is not registered.

**Secrets in the repo** — the Bugsnag browser API key is hardcoded in `frontend/src/app/app.config.ts`. That is deliberate: browser error-reporting keys are public by design. No other secrets are committed. Local backend secrets belong in user-secrets (`dotnet user-secrets`), CI secrets in GitHub repository secrets (`SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`).

**Health and docs endpoints** — `/health`, `/alive`, `/openapi/v1.json`, and `/scalar/v1` are all gated on `IsDevelopment()`, so they are absent elsewhere.

**Known gap** — `SignIn` deletes the anonymous account when signing in to an existing email (`// TODO transfer all data to the linked account`). Data loss, not a security hole, but it is in the auth path. The other branch — unknown email while anonymous — upgrades the account in place and loses nothing.

**Unauthenticated account creation** — `POST /auth/signIn` creates a permanent account when the email is unknown and the caller is logged out, and `POST /auth/loginAnonymously` creates one on demand. Neither requires authorization and neither has a CAPTCHA, email verification, or rate limit, so both are open to automated account creation.

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
