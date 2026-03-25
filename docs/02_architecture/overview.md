# Architecture Overview

## Purpose
Describes how Ahlcg's major components (frontend, backend, database, real-time communication) fit together and exchange data.

## When to Load
Read this to understand the system design, technology stack, and how frontend and backend interact.

## Related Files
- [Frontend Architecture](./frontend.md) — Frontend component structure
- [Backend Architecture](./backend.md) — Backend service structure
- [Product Overview](../01_product/overview.md) — What Ahlcg does
- [Build & Release](../05_operations/build_and_release.md) — How to build each part

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Angular SPA (TypeScript)                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐ │  │
│  │  │Main Menu │  │Game View │  │Shared Components             │ │  │
│  │  │Component │  │Component │  │- UI Patterns, Directives    │ │  │
│  │  └──────────┘  └──────────┘  │- Domain Validation (arktype) │ │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ GameStateStore (@ngrx/signals)                       │  │  │
│  │  │ - Reactive state with signals                        │  │  │
│  │  │ - RFC6902 patch application                          │ │  │
│  │  │ - GSAP Flip animations on state changes             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ Services (HttpClient, SignalR, etc)                   │  │  │
│  │  │ - API communication                                  │  │  │
│  │  │ - Real-time hub subscription                         │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│  ┌─ HTTP + REST ────────────┼──── GET |POST |PATCH |DELETE ──────┐  │
│  │ ┌─ WebSocket (SignalR) ──┼──── Real-time events ───────────┐  │  │
└──┼──────────────────────────┼──────────────────────────────────┼──┘
   │                          │                                  │
   │                          ▼                                  │
   │                  ┌──────────────────────────────────────┐  │
   │                  │  Backend API                         │  │
   │                  │  (ASP.NET Core Minimal APIs)         │  │
   │                  │                                      │  │
   │                  │ ┌────────────────────────────────┐   │  │
   │                  │ │ Authentication & Authorization │   │  │
   │                  │ │ - ASP.NET Identity            │   │  │
   │                  │ │ - Cookie-based sessions       │   │  │
   │                  │ └────────────────────────────────┘   │  │
   │                  │                                      │  │
   │                  │ ┌────────────────────────────────┐   │  │
   │                  │ │ Endpoints                      │   │  │
   │                  │ │ - /auth (login, logout, info) │   │  │
   │                  │ │ - /game (SignalR hub)         │   │  │
   │                  │ │ - (future domain endpoints)   │   │  │
   │                  │ └────────────────────────────────┘   │  │
   │                  │                                      │  │
   │                  │ ┌────────────────────────────────┐   │  │
   │                  │ │ Observability                  │   │  │
   │                  │ │ - OpenTelemetry               │   │  │
   │                  │ │ - Health checks (/health)     │   │  │
   │                  │ └────────────────────────────────┘   │  │
   │                  └──────────┬───────────────────────────┘  │
   │                             │                              │
   └─ EF Core + ADO.NET ────────┬─────────────────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  PostgreSQL      │
                        │  Database        │
                        │                  │
                        │ - Users          │
                        │ - Identities     │
                        │ - Game Sessions  │
                        │ - Deck Data      │
                        │ - Campaign State │
                        │                  │
                        │ (Managed by      │
                        │  Migrations)     │
                        └──────────────────┘

Local Development Only:
┌─────────────────────────────────────────────────┐
│ .NET Aspire AppHost (backend/Ahlcg.AppHost)    │
│ Orchestrates for local dev:                     │
│ - PostgreSQL + PgAdmin                          │
│ - Migrator (applies EF migrations)              │
│ - API Service (ASP.NET Core)                    │
│ - Frontend Dev Server (npm start)               │
│ - Health checks and dependency management       │
└─────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework:** Angular 20 (TypeScript)
- **State Management:** @ngrx/signals (signal-based store)
- **DOM Animations:** GSAP Flip
- **Schema Validation:** arktype
- **Internationalization:** Transloco
- **Styling:** Tailwind CSS
- **Testing:** Karma + Jasmine
- **Component Dev:** Storybook
- **Visual Regression:** Chromatic
- **HTTP:** Angular HttpClient
- **Real-time:** SignalR client library

### Backend
- **Runtime:** .NET 10.0
- **Framework:** ASP.NET Core Minimal APIs
- **Authentication:** ASP.NET Identity
- **Persistence:** Entity Framework Core (EF Core)
- **Database Driver:** Npgsql (PostgreSQL)
- **Real-time:** SignalR
- **Testing:** xUnit + Moq
- **API Docs:** OpenAPI + Scalar UI (dev only)
- **Observability:** OpenTelemetry (logs, metrics, traces)
- **Health Checks:** ASP.NET Core health checks
- **Local Orchestration:** .NET Aspire AppHost

### Database
- **Engine:** PostgreSQL
- **Schema Management:** EF Core Migrations
- **Admin UI:** PgAdmin (local dev only)

### CI/CD
- **Provider:** GitHub Actions
- **Path Filtering:** dorny/path-filter (split workflows by module)
- **Testing:** xUnit (backend), Jasmine (frontend)
- **Coverage:** Coveralls, SonarCloud
- **Visual Regression:** Chromatic
- **Code Analysis:** SonarCloud

---

## Data Flow Examples

### Authentication Flow
```
1. User clicks "Play Now"
   ├─ Browser: Click handler → AuthService uses Angular HttpClient.post('/auth/loginAnonymously', ...) and subscribes/awaits observable
   │
2. HTTP Request
   ├─ Browser → Server: POST /auth/loginAnonymously
   │
3. Backend Processing
   ├─ ASP.NET Core receives request
   ├─ AuthEndpoints.cs handles it
   ├─ Creates user: new AppUser { IsAnonymous = true }
   ├─ Saves to PostgreSQL via EF Core
   ├─ Signs in user (creates session cookie)
   │
4. HTTP Response
   ├─ Server → Browser: 200 OK + Set-Cookie header
   │
5. Frontend Update
   ├─ Browser: Cookie stored automatically
   ├─ Store notified: isAuthenticated = true
   ├─ UI redirects to game view
```

### Real-Time Game Update (Future Design)
```
1. Player A makes a move
   ├─ Browser: Patch generated locally
   ├─ Store: State updated (optimistic)
   ├─ Would be sent to backend via SignalR if implemented
   │
2. Backend Validation (not currently implemented in GameHub)
   ├─ GameHub currently exposes only Ping()
   ├─ Planned: validate patch and apply to canonical game state
   ├─ Planned: save to PostgreSQL
   │
3. Broadcast to Other Players (future)
   ├─ Backend would send updates to connected clients
   │
4. Other Clients Update
   ├─ SignalR client would apply patch to GameStateStore
   ├─ GSAP Flip animates the transition
   ├─ UI renders new state
```

---

## Communication Contracts

### REST Endpoints (HTTP)
See [API Reference](../99_reference/api.md) for full contract details.

**Authentication Routes** (`/auth`)
- `POST /auth/loginAnonymously` — Create anon account & sign in
- `POST /auth/linkCredentials` — Upgrade to permanent account
- `GET /auth/info` — Get current user info
- `POST /auth/logout` — Sign out (delete if anon)

**Health & Docs** (dev only)
- `GET /health` — Readiness probe
- `GET /alive` — Liveness probe
- `GET /openapi/v1.json` — OpenAPI schema
- `GET /scalar/v1` — Scalar UI (interactive API docs)

### SignalR Hub (`/game`)
See [API Reference](../99_reference/api.md) for SignalR contracts.

**Server → Client** (future)
- `GameStateUpdated(state)` — New game state
- `PlayerLeft(playerId)` — A player disconnected
- `GameEnded(result)` — Scenario completed

**Client → Server** (future)
- `JoinGame(gameId)` — Subscribe to game updates
- `ApplyAction(action)` — Player takes action
- `SendChat(message)` — Send chat message

---

## Deployment Architecture (Conceptual)

```
Production Environment (not yet implemented):

┌─────────────────────────────────────┐
│      Client Browser                 │
│      (Any modern browser)            │
└──────────────┬──────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────┐
│  Reverse Proxy / Load Balancer       │
│  (nginx, Azure App Gateway, etc.)    │
│  - TLS termination                   │
│  - Route to API instances            │
│  - Route to SPA assets               │
└──────────────┬───────────────────────┘
               │
      ┌────────┼────────┐
      ▼                 ▼
┌─────────────┐  ┌─────────────┐
│ API Instance│  │ API Instance│  (Scaled horizontally)
│ (Docker)    │  │ (Docker)    │
│ - ASP.NET   │  │ - ASP.NET   │
│   Core      │  │   Core      │
│ - SignalR   │  │ - SignalR   │
│   (sticky   │  │   (sticky   │
│   sessions) │  │   sessions) │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────┬───────┘
                │
                ▼
        ┌──────────────────────┐
        │ PostgreSQL Cluster   │
        │ (Replicated)         │
        │ - Primary            │
        │ - Replicas           │
        │ - Backup             │
        └──────────────────────┘
```

Note: This is a future reference design. Currently, Aspire handles local orchestration for development.

---

## Scalability Considerations

### Horizontal (More Servers)
- **Frontend:** Served as static assets; easily cacheable via CDN
- **Backend:** Can run multiple instances behind load balancer
- **SignalR:** Requires sticky sessions or backplane (e.g., Redis) for multiple instances
- **Database:** Needs replication / clustering for high availability

### Vertical (Bigger Servers)
- Trade-off: Cost vs. availability
- Simpler operational model but less resilient

### Performance Optimizations
- Cache static assets (frontend) with long TTLs
- Use connection pooling in EF Core
- Implement response caching for API endpoints
- Compress HTTP responses (gzip)
- Lazy-load frontend routes
- Optimize database queries with EF projections

---

## Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|-----------|
| Angular SPA | Rich, responsive UI; offline-capable; code splitting | Larger initial JS bundle; SEO challenges |
| ASP.NET Core Minimal APIs | Lightweight, modern; less boilerplate than controllers | Smaller ecosystem than MVC; less convention |
| PostgreSQL | Open-source, reliable, ACID-compliant; good for relational data | Not ideal for unstructured/document data |
| SignalR for real-time | Built-in .NET support; connectionless or persistent | Forces sticky sessions or backplane |
| Signal-based store | Modern, reactive; avoids NgRx complexity | Less battle-tested; smaller community |
| Cookie-based auth | Added easily with ASP.NET Identity; works across origins with CORS | Must secure cookies; requires HTTPS in prod |

---

## Observability & Monitoring

- **Logs:** Structured logs via OpenTelemetry; can be exported to external systems
- **Metrics:** ASP.NET Core, HTTP, runtime metrics; aggregated and exported
- **Traces:** Distributed tracing for request flows; includes SignalR instrumentation
- **Health:** Readiness (`/health`) and liveness (`/alive`) endpoints for orchestrators
- **Errors:** ProblemDetails format for REST errors; developer exception page in dev

See [Backend Architecture](./backend.md) (Observability section) for details.
