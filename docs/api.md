# API Reference

Source of truth: `backend/Ahlcg.ApiService/AuthEndpoints.cs`, `GameEndpoints.cs`, and `GameHub.cs`. Live spec in Development at `/openapi/v1.json`, browsable at `/scalar/v1`.

Two route groups exist: `/auth` (`app.MapGroup("auth")`, tagged `Auth`) and `/games` (`app.MapGroup("games")`, tagged `Games`). From the frontend dev server the same routes are reached as `/api/auth/*` / `/api/games` — see [architecture.md](architecture.md).

`AddIdentityApiEndpoints<AppUser>()` is called for its services, but `MapIdentityApi()` is **not** — the stock Identity routes (`/register`, `/login`, `/refresh`, `/confirmEmail`, …) do not exist. The four `/auth` routes below plus `POST /games` are the entire API.

## POST /auth/loginAnonymously

Creates an anonymous account and signs it in. No authorization required, no request body.

- `200 OK`, empty body. Sets the `AspNetCore.Identity.Application` cookie (persistent).
- `400 Bad Request` with an `IdentityResult` body if a user is already signed in (`"Already logged in"`), or if user creation fails.

The created user has a GUID `UserName`, no email, no password, `IsAnonymous = true`.

## POST /auth/signIn

Signing in, registering, and upgrading an anonymous account are **one route**, because which of the three happens is decided by state the caller does not have — whether the email is already on record. No authorization required; works from a logged-out, anonymous, or permanent session.

```json
{ "email": "user@example.com", "username": "playername", "password": "..." }
```

`RegisterRequest`: all three fields are `[Required]`, `email` is `[EmailAddress]`. `username` is only used on the branches that create or rename an account.

| Email on record | Caller's session | Result |
| --- | --- | --- |
| Yes, password valid | any | The existing account is signed in. An anonymous session is deleted first |
| Yes, password wrong | any | `403 Forbidden` — nothing is deleted. Counts towards lockout |
| No | anonymous | That account is **upgraded in place**: it gains the password, email and username, `IsAnonymous` becomes `false`. It keeps its id, so its games survive, and the existing cookie stays valid — no re-sign-in |
| No | logged out | A new permanent account is created and signed in |
| No | permanent | `400 Bad Request` (`"Already signed in with a permanent account"`) — nothing is created. There is nothing to sign into and nothing to upgrade, so the only outcome would be a session naming somebody else while the caller's own account, and its games, sit behind a logout they did not ask for. Log out first to register a second account |

- `200 OK`, empty body. Sets the `AspNetCore.Identity.Application` cookie (persistent) on every branch except the in-place upgrade, which does not need to.
- `403 Forbidden` — the email exists but the password is wrong, **or** the account is locked out. The two are deliberately indistinguishable, so the endpoint does not confirm that an email is registered.
- `400 Bad Request` with an `IdentityResult` body — a permanent session asked for an unknown email, or `CreateAsync`, `AddPasswordAsync` or `UpdateAsync` failed (weak password, duplicate username, invalid email, …).

The password check runs through `SignInManager.CheckPasswordSignInAsync(..., lockoutOnFailure: true)`, so failures count against Identity's lockout. `Program.cs` configures no `IdentityOptions.Lockout`, so the defaults apply: 5 failed attempts, then a 5-minute lockout.

Keeping the upgrade branch is the point of the merge: splitting it out meant a register button could delete an anonymous player's account and create a fresh one, silently losing their games. Two paths still destroy an anonymous account and everything hanging off it — `Game.OwnerId` cascades, so the games go with the row:

- signing in here to an **existing** account while anonymous, which discards the anonymous one (`// TODO transfer all data to the linked account`);
- `POST /auth/logout` while anonymous, which deletes the account outright. That one is deliberate rather than a gap — an anonymous account has no credentials, so it could never be signed into again.

Only the unknown-email-while-anonymous branch above preserves everything, by upgrading the account in place instead of replacing it.

## GET /auth/info

Returns the current session. Requires authorization.

- `200 OK` → `{ "email": string | null, "userName": string | null, "isAnonymous": boolean }` (`UserDto`). `email` is `null` for anonymous accounts; `userName` is set for every account, and is a raw GUID for anonymous ones. There is no `id` in the response.
- `401 Unauthorized` — no valid cookie.

`AuthService` on the frontend treats `401` as "logged out", not as an error.

## POST /auth/logout

Signs out. **Not** marked `RequireAuthorization`, so it is safe to call unauthenticated (it becomes a no-op).

- `200 OK`, empty body. Clears the auth cookie.
- Side effect: if the signed-in user has `IsAnonymous = true`, the account is deleted.

## POST /games

Creates a new game owned by the calling user. Requires authorization.

Request headers:

- `Idempotency-Key` — required. Repeating the same key for the same user returns the game created the first time instead of creating a second one; the same key from a *different* user creates a separate game. Enforced by a unique index on `(OwnerId, IdempotencyKey)` in the database, not by a check-then-insert.

```json
{ "configuration": { "...": "..." } }
```

`configuration` is opaque — the backend stores it in a `jsonb` column and hands it back unchanged, and never parses or validates its contents (#198). Only its *presence* is checked.

- `200 OK` → `{ "id": "guid", "createdAt": "...", "lastPlayedAt": "...", "configuration": {...} }` (`GameDto`). `createdAt` and `lastPlayedAt` are equal on creation.
- `400 Bad Request` (`ValidationProblem`) — the `configuration` field was omitted.
- `401 Unauthorized` — no valid cookie.

## Error bodies

Auth endpoints return `IdentityResult` (`{ succeeded, errors: [{ code, description }] }`) on `400`, **not** RFC 7807 ProblemDetails. `GameEndpoints.CreateGame` returns a `ValidationProblem` (RFC 7807) instead. `AddProblemDetails()` is registered and covers unhandled exceptions and framework-generated responses; do not assume a uniform error envelope across the API.

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
