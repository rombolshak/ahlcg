# API Reference

**The OpenAPI document is the reference, not this file.** Routes, request and response shapes, status codes and per-endpoint semantics live in `/openapi/v1.json` (browsable at `/scalar/v1`, both Development only), generated from `backend/Ahlcg.ApiService/AuthEndpoints.cs` and `GameEndpoints.cs`. An endpoint is documented by its `.WithDescription()` and `.Produces()` calls; if something about a route is missing or wrong, fix it there, not here.

This file holds only what the spec cannot carry.

## Reaching the API

Two route groups: `/auth` (`app.MapGroup("auth")`, tagged `Auth`) and `/games` (`app.MapGroup("games")`, tagged `Games`). From the frontend dev server the same routes are reached under an `/api` prefix — `/api/auth/*`, `/api/games` — see [architecture.md](architecture.md).

## Routes that deliberately do not exist

`AddIdentityApiEndpoints<AppUser>()` is called for its services, but `MapIdentityApi()` is **not** — the stock Identity routes (`/register`, `/login`, `/refresh`, `/confirmEmail`, …) are absent by choice. The spec shows what exists; only this file can tell you what was left out on purpose.

## Error bodies are not uniform

Auth endpoints return `IdentityResult` (`{ succeeded, errors: [{ code, description }] }`) on `400`, **not** RFC 7807 ProblemDetails. `GameEndpoints.CreateGame` returns a `ValidationProblem` (RFC 7807) instead. `AddProblemDetails()` is registered and covers unhandled exceptions and framework-generated responses. Do not write a client that assumes one error envelope across the API.

## SignalR: /game

Not part of the OpenAPI document — SignalR hubs never are.

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

Development environment only, and outside the `/auth` and `/games` groups:

| Path | |
| --- | --- |
| `/openapi/v1.json` | OpenAPI document |
| `/scalar/v1` | Scalar API explorer |
| `/health` | Readiness (all health checks) |
| `/alive` | Liveness (checks tagged `live`) |

`MapDefaultEndpoints()` returns early outside Development, so the health endpoints are genuinely absent in other environments.
