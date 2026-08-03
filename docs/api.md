# API Reference

Source of truth: `backend/Ahlcg.ApiService/AuthEndpoints.cs` and `GameHub.cs`. Live spec in Development at `/openapi/v1.json`, browsable at `/scalar/v1`.

Base path is `/auth` (group registered as `app.MapGroup("auth")`, tagged `Auth`). From the frontend dev server the same routes are reached as `/api/auth/*` — see [architecture.md](architecture.md).

`AddIdentityApiEndpoints<AppUser>()` is called for its services, but `MapIdentityApi()` is **not** — the stock Identity routes (`/register`, `/login`, `/refresh`, `/confirmEmail`, …) do not exist. The four routes below are the entire API.

## POST /auth/loginAnonymously

Creates an anonymous account and signs it in. No authorization required, no request body.

- `200 OK`, empty body. Sets the `AspNetCore.Identity.Application` cookie (persistent).
- `400 Bad Request` with an `IdentityResult` body if a user is already signed in (`"Already logged in"`), or if user creation fails.

The created user has a GUID `UserName`, no email, no password, `IsAnonymous = true`.

## POST /auth/linkCredentials

Upgrades the current anonymous account, or transfers to an existing permanent account. Requires authorization.

```json
{ "email": "user@example.com", "username": "playername", "password": "..." }
```

All three fields are `[Required]`; `email` is `[EmailAddress]`.

- `200 OK`, empty body.
  - Email not found → the current account gains the password, email, and username, and `IsAnonymous` becomes `false`.
  - Email found and password valid → the anonymous account is **deleted** and the existing account is signed in. Data transfer is not implemented (`TODO` in source).
- `403 Forbidden` — the email exists but the password is wrong.
- `400 Bad Request` with an `IdentityResult` body — caller is not signed in or is not anonymous (`"Account is not anonymous and cannot be linked to another"`), or `AddPasswordAsync`/`UpdateAsync` failed.

## GET /auth/info

Returns the current session. Requires authorization.

- `200 OK` → `{ "email": string | null, "isAnonymous": boolean }` (`UserDto`). `email` is `null` for anonymous accounts. There is no `id` or `userName` in the response.
- `401 Unauthorized` — no valid cookie.

`AuthService` on the frontend treats `401` as "logged out", not as an error.

## POST /auth/logout

Signs out. **Not** marked `RequireAuthorization`, so it is safe to call unauthenticated (it becomes a no-op).

- `200 OK`, empty body. Clears the auth cookie.
- Side effect: if the signed-in user has `IsAnonymous = true`, the account is deleted.

## Error bodies

Auth endpoints return `IdentityResult` (`{ succeeded, errors: [{ code, description }] }`) on `400`, **not** RFC 7807 ProblemDetails. `AddProblemDetails()` is registered and covers unhandled exceptions and framework-generated responses; do not assume a uniform error envelope across the API.

## SignalR: /game

```csharp
[Authorize]
public class GameHub : Hub
{
    public async Task Ping() => await Clients.Caller.SendAsync("ping", DateTime.UtcNow);
}
```

- Client → server: `Ping()`.
- Server → client: `"ping"` with a UTC timestamp, sent to the caller only.
- Authenticated with the same session cookie; anonymous accounts qualify once signed in.
- No groups, no broadcasts, no game methods.

There is no SignalR client in the frontend — `@microsoft/signalr` is not a dependency. Adding one means installing the package first.

## Development endpoints

Development environment only:

| Path | |
| --- | --- |
| `/openapi/v1.json` | OpenAPI document |
| `/scalar/v1` | Scalar API explorer |
| `/health` | Readiness (all health checks) |
| `/alive` | Liveness (checks tagged `live`) |

`MapDefaultEndpoints()` returns early outside Development, so the health endpoints are genuinely absent in other environments.
