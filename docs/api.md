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

Not part of the OpenAPI document — SignalR hubs never are, which is why the hub is described here rather than in a route description.

**A connection is bound to one game, named in the query string:** `/game?gameId={guid}`. There is no join method — `OnConnectedAsync` reads the parameter, and `OnDisconnectedAsync` reads the same one to know which game it is leaving. A client that opts into SignalR's automatic reconnect gets session re-entry for free, because it reconnects to the same URL — no separate join call. Opting in is still the client's job; nothing here makes a dropped connection come back on its own.

Authenticated with the same session cookie as the endpoints; anonymous accounts qualify once signed in.

**Connecting is what starts a game.** The first member to connect creates the session; from that moment the game is running. There is no separate "started" flag anywhere, and nothing in the hub knows or asks what is being played — whether a connected member may act or only watch is game state, decided game-side.

**Membership is the only gate.** A caller with no `GameMember` row for that game is rejected in `OnConnectedAsync` with a `HubException`. A game that does not exist takes the same path, so the rejection leaks nothing about whether it does. A missing or unparseable `gameId` is rejected the same way.

**Rejection is a close, not a refused handshake** — SignalR has already completed the handshake by the time `OnConnectedAsync` runs. The client's `start()` therefore *succeeds*, and the connection is closed with an error immediately afterwards. A rejected caller never joins the session or the group, but a client cannot treat "start resolved" as "I am a member": it has to handle the close. An unauthenticated caller is different — `[Authorize]` rejects it at negotiate, so `start()` itself fails there.

**Server → client messages are an interface, not strings.** `GameHub` is a `Hub<IGameClient>`, so every broadcast is a method call the compiler checks — there are no message-name constants to drift. **SignalR takes the wire name from the interface method verbatim, so these names are PascalCase**, and renaming a method on `IGameClient` is a breaking wire change even though nothing in C# will complain.

| Direction | Message | Payload |
| --- | --- | --- |
| Client → server | `Ping()` | — |
| Server → client | `Ping` | UTC timestamp, to the caller only |
| Server → group | `MemberConnected` | the user id |
| Server → group | `MemberDisconnected` | the user id |

One group per game, named by the game id. Both broadcasts go to the whole group, so a member receives their own `MemberConnected` too.

**The broadcasts are per member, not per connection.** A member with two tabs open produces one `memberConnected` when the first arrives and one `memberDisconnected` when the last goes — closing one tab does not announce them offline while they are still present in the other.

**Disconnecting writes that member's `GameMember.LastPlayedAt`**, and nothing else in the backend writes it after creation. That is what makes it the last moment you were at the table rather than the moment you opened the app, and it is what orders `GET /games` and picks the one `GET /games/latest` returns.

**Sessions are in-memory and are not persisted** — see [backend.md](backend.md#signalr) for why, and for the single-replica ceiling that follows.

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
