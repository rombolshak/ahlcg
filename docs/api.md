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

**Membership is the only gate.** A caller with no `GameMember` row for that game is sent `Exit(NotAMember)` and joins neither the session nor the group. A game that does not exist takes the same path, so the answer leaks nothing about whether it does.

**A turned-away caller is asked to leave, not cut off.** SignalR has already completed the handshake by the time `OnConnectedAsync` runs, so `start()` *succeeds* whatever the server decides — a client cannot read "start resolved" as "I am a member". Rather than force-closing, the hub sends `Exit` and leaves the connection open; **stopping it is the client's job.** A client that ignores `Exit` stays connected to nothing: it is in no group and no session, so no game traffic reaches it.

That cooperative shape is what keeps automatic reconnect usable. A close cannot be told apart from a network drop, so a client that inferred rejection from one would either retry forever against a server that will never accept it, or guess from event ordering. `Exit` is unambiguous: reconnect on a drop, stop on `Exit`.

A missing or unparseable `gameId`, or a missing user id, still throws `HubException` — those are client bugs rather than answers about membership. An unauthenticated caller is different again: `[Authorize]` rejects it at negotiate, so `start()` itself fails there.

**Server → client messages are an interface, not strings.** `GameHub` is a `Hub<IGameClient>`, so every broadcast is a method call the compiler checks — there are no message-name constants to drift. **SignalR takes the wire name from the interface method verbatim, so these names are PascalCase**, and renaming a method on `IGameClient` is a breaking wire change even though nothing in C# will complain.

| Direction | Message | Payload |
| --- | --- | --- |
| Client → server | `Ping()` | returns a UTC timestamp |
| Server → client | `Exit` | an `ExitReason`, to the caller only — stop the connection and do not reconnect |
| Server → group | `MemberConnected` | the user id |
| Server → group | `MemberDisconnected` | the user id |

**A hub method that answers the caller returns its answer; it does not push one.** `Ping()` is `Task<DateTime>`, so the client gets it as the result of `invoke('Ping')`. Pushing the answer through `IGameClient` instead would look equivalent and is not: a push carries no correlation id, so a client with two calls in flight cannot tell which reply belongs to which, and every caller has to register and tear down a handler. Keep request/response on the return value and reserve `IGameClient` for messages the server sends unprompted.

**`ExitReason` crosses the wire as a string** (`"NotAMember"`), not a number. That is not SignalR's default — `AddSignalR()` in `Program.cs` registers a `JsonStringEnumConverter` on the hub's payload serializer to get it. Drop that converter and every enum silently becomes an integer, which no client reading `"NotAMember"` will match.

One group per game, named by the game id. Both broadcasts go to the whole group, so a member receives their own `MemberConnected` too.

**The broadcasts are per member, not per connection.** A member with two tabs open produces one `memberConnected` when the first arrives and one `memberDisconnected` when the last goes — closing one tab does not announce them offline while they are still present in the other.

**Disconnecting writes that member's `GameMember.LastPlayedAt`**, and nothing else in the backend writes it after creation. That is what makes it the last moment you were at the table rather than the moment you opened the app, and it is what orders the active games in `GET /games/recent` and picks the one `GET /games/latest` returns. Completed games are ordered by `Game.CompletedAt` instead.

**Sessions are in-memory and are not persisted** — see [backend.md](backend.md#signalr) for why, and for the single-replica ceiling that follows.

The frontend client is `GameConnectionService` (`features/games/game-connection.service.ts`). It connects through **`/api/game?gameId=…`**, not `/game`: the hub path collides with the SPA's own `/game/:id` route, and the dev proxy already rewrites `^/api` → `` . That entry carries `ws: true`, without which the websocket upgrade is not proxied and SignalR quietly falls back to long polling.

It carries no game state — the board still renders `@domain/testing/test-game-state`. What exists is the transport, its connection state, and `Ping`.

## Development endpoints

Development environment only, and outside the `/auth` and `/games` groups:

| Path | |
| --- | --- |
| `/openapi/v1.json` | OpenAPI document |
| `/scalar/v1` | Scalar API explorer |
| `/health` | Readiness (all health checks) |
| `/alive` | Liveness (checks tagged `live`) |

`MapDefaultEndpoints()` returns early outside Development, so the health endpoints are genuinely absent in other environments.
