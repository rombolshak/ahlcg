# API Reference

## Purpose
Complete REST endpoint specifications, SignalR contracts, request/response formats, and status codes.

## When to Load
Read this when integrating with backend endpoints, debugging API errors, or implementing client code.

## Related Files
- [Backend Services](../03_implementation/backend/services.md) — Endpoint implementation
- [Security & Secrets](../05_operations/security.md) — Auth model details

---

## Authentication Endpoints

Base URL: `https://api.example.com/auth` (development: `https://localhost:5001/auth`)

### Login Anonymously

Creates a temporary anonymous account.

```
POST /auth/login-anonymous
Content-Type: application/json
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "id": "user-guid-123",
  "email": null,
  "userName": "anonymous-user-123",
  "isAnonymous": true
}
```

**Error Responses:**
- `400 Bad Request` — Already logged in (anonymous or permanent)

**Cookie Side Effect:**
- Sets `AspNetCore.Identity.Application` cookie (90-day lifetime, sliding expiration)

**Use Cases:**
- User starts playing without account
- Anonymous progress preserved until upgrade

---

### Link Credentials

Upgrades anonymous account or signs into permanent account.

```
POST /auth/link-credentials
Content-Type: application/json
Cookie: AspNetCore.Identity.Application=...
Authorization: Bearer <not used; uses cookie>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**

**Error Responses:**

- `401 Unauthorized` — Invalid credentials
- `400 Bad Request` — Not logged in as anonymous

**Behavior:**
- If email doesn't exist: Upgrade anonymous account
- If email exists: Validate password, merge into existing account (future enhancement)

---

### Get Current User

Retrieves authenticated user info.

```
GET /auth/info
Cookie: AspNetCore.Identity.Application=...
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "id": "user-guid-123",
  "email": "user@example.com",
  "userName": "user@example.com",
  "isAnonymous": false
}
```

**Error Responses:**

- `401 Unauthorized` — Not authenticated

**Use Case:**
- Frontend polls on app init to check login status
- Update UI based on anonymous vs. permanent account

---

### Logout

Clears session and deletes anonymous accounts.

```
POST /auth/logout
Content-Type: application/json
Cookie: AspNetCore.Identity.Application=...
```

**Success Response (200 OK):**

**Side Effects:**
- If `IsAnonymous=true`: Deletes account from database
- If permanent account: Account persists; only cookie cleared
- Cookie cleared (ASP.NET Identity sign-out)

---

## SignalR Hub

Endpoint: `wss://api.example.com/game` (development: `wss://localhost:5001/game`)

Supports both HTTP and WebSocket transports.

### Hub Methods (Server → Client)

Server can invoke these methods on connected clients:

```typescript
// Example: Client listens for game state updates
connection.on("OnGameStateChanged", (patch: JsonPatch[]) => {
  // Apply RFC6902 patch to local state
  // Trigger animations
});

connection.on("OnPlayerJoined", (userId: string) => {
  // Update UI with new player
});

connection.on("OnGameEnded", (result: GameResult) => {
  // Show results screen
});
```

### Hub Methods (Client → Server)

Client can invoke these methods on server (requires authentication):

```csharp
public async Task Ping() { ... }
```

**Signature:**

```
Ping()
→ Task (completes when server processes)
```

**Example (TypeScript):**

```typescript
const connection = new HubConnectionBuilder()
  .withUrl("https://api.example.com/game", {
    accessTokenFactory: () => getAuthToken(),
    withCredentials: true
  })
  .withAutomaticReconnect()
  .build();

await connection.start();
const response = await connection.invoke("Ping");
```

### Authorization

- Hub requires authentication (cookie or token)
- Anonymous users can access if logged in via `/auth/login-anonymous`
- Connection closes if token expires

### Connection Lifecycle

```
Client: connect
  ↓
Server: Accept connection
  ↓
Client: Invoke methods / Receive updates
  ↓
Server: Broadcasts via Groups or broadcast to all
  ↓
Client: Disconnect
```

### Error Handling

```typescript
connection.onreconnected(() => {
  console.log("Reconnected");
  // Resync state from server
});

connection.onreconnecting((error) => {
  console.log("Reconnecting...", error);
});

connection.onclose((error) => {
  if (error) console.error("Disconnected:", error);
});
```

### Transports (In Order of Preference)

1. **WebSocket** — Persistent, full-duplex
2. **Server-Sent Events** — One-way server → client streaming
3. **Long Polling** — Fallback for restrictive networks

---

## Common HTTP Status Codes

| Code | Status | Meaning | Example |
|------|--------|---------|---------|
| 200 | OK | Request succeeded | Login successful |
| 201 | Created | Resource created | (Not currently used) |
| 400 | Bad Request | Invalid input or state | Already logged in |
| 401 | Unauthorized | Auth required or failed | No valid cookie |
| 403 | Forbidden | Authenticated but not allowed | (Future: role check) |
| 404 | Not Found | Endpoint doesn't exist | `/auth/invalid` |
| 500 | Internal Server Error | Unhandled exception | Database connection lost |
| 503 | Service Unavailable | Service temporarily down | (Future: database down) |

---

## Error Format (ProblemDetails)

All error responses use RFC 7807 ProblemDetails format:

```json
{
  "type": "https://example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Email is required",
  "instance": "/auth/link-credentials",
  "errors": {
    "email": ["Email is required"]
  }
}
```

**Fields:**
- `type`: Machine-readable error classification (URI)
- `title`: Human-readable error title
- `status`: HTTP status code (mirrors response status)
- `detail`: Explanation of what went wrong
- `instance`: Request path that caused error (debugging)
- `errors`: Field-level validation errors (if applicable)

---

## Development Testing

### Scalar UI

Interactive API explorer (development only):

```
https://localhost:5001/scalar/v1
```

Features:
- View all endpoints
- Send test requests without curl
- See actual requests/responses
- Copy request examples

### OpenAPI JSON

Raw OpenAPI specification:

```
https://localhost:5001/openapi/v1.json
```

Use with:
- Postman (import OpenAPI)
- SwaggerUI
- API documentation generators

---

## Versioning

Current version: v1 (implicit)

**Policy:**
- API endpoints versioned in URL path (future: `/api/v2/auth/...`)
- SignalR versioned via negotiation during connection
- Breaking changes require new version

**Example (future):**

```
POST /api/v1/auth/login-anonymous
POST /api/v2/auth/login-anonymous  (breaking changes)
```

---

## Debugging

### Enable Verbose Logging (Development)

```csharp
builder.Services.AddLogging(options => {
  options.AddConsole();
  options.SetMinimumLevel(LogLevel.Trace);
});
```

### SignalR Logging (TypeScript)

```typescript
import * as signalR from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
  .withUrl("/game")
  .configureLogging(signalR.LogLevel.Debug)
  .build();
```

Shows all SignalR messages in DevTools Console.

### Network Tab (Chrome DevTools)

Inspect actual HTTP/WebSocket traffic:

1. Open DevTools (F12)
2. Switch to Network tab
3. Filter by WebSocket or Fetch
4. Click request to view headers/body/response

