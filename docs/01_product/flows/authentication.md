# Authentication Flow

## Purpose
Describes how users create accounts, sign in, and manage their credentials in Ahlcg.

## When to Load
Read this when implementing auth endpoints, debugging authentication issues, or understanding the account lifecycle.

## Related Files
- [Product Overview](../overview.md) — Overall product description
- [Backend Services](../../03_implementation/backend/services.md) — Implementation of auth endpoints
- [Backend Architecture](../../02_architecture/backend.md) — Authentication infrastructure
- [API Reference](../../99_reference/api.md) — Auth endpoint contracts

---

## Overview

Ahlcg uses a **cookie-based session model** with an optional upgrade path from anonymous to permanent accounts:

```
Visitor → Anonymous Login → Game Play → Optional: Upgrade Account → Permanent Player
```

---

## Step 1: Anonymous Login

### What Happens
1. Player clicks "Play Now" without signing up
2. Backend creates an anonymous user account
3. Backend signs player in (creates session cookie)
4. Player can immediately play and build decks

### Player Experience
- ✅ Instant access — no sign-up form
- ✅ No email verification needed
- ⚠️ Progress lost if browser clears cookies
- ⚠️ Cannot play on another device

### Implementation Details
- Account is created with `IsAnonymous = true`
- No email or password required
- Session cookie automatically set and sent with all requests
- Account can be deleted if logout occurs

### Endpoint
```
POST /auth/loginAnonymously
Response: 200 OK
Cookies: Set authentication cookie
```

---

## Step 2: Play Anonymously

### What Happens
1. Player plays scenarios and builds decks
2. Game state is stored server-side
3. Session cookie ensures player data is associated with their account
4. Progress persists as long as cookie remains valid

### Session Timeout
- Cookies expire after **90 days** of creation
- **Sliding expiration** — Each login action resets the timer
- Inactive longer than 90 days → Force re-login

### What Happens to Save Data
- ✅ Saved during play session
- ✅ Recoverable if player logs back in within 90 days
- ⚠️ Planned policy: eligible anonymous accounts would be deleted after 90 days of inactivity, but no automatic background purge exists in current implementation (see TODO).
- ❌ Deleted if player logs out while anonymous

---

## Step 3: Optional - Upgrade to Permanent Account

### Prerequisites
- Player is currently logged in as anonymous
- Player has decided to keep their progress

### What Happens
1. Player clicks "Create Account"
2. Forms prompts for email and password
3. Backend validates inputs
4. Backend **upgrades** the anonymous account to permanent by setting email/password
5. Account is now persistent even after cookie expiration

### Links to Existing Permanent Account
- If player already has a permanent account with that email:
  - Backend prompts for that account's password
  - Decks/progress from both accounts are **merged** (exact merge logic TBD)
  - Active session switches to the permanent account

### Endpoint
```
POST /auth/linkCredentials
Required: Authorization (must be logged in as anonymous)
Body:
  email: "player@example.com"
  username: "playername"
  password: "newpassword"
Response: 200 OK or 403 Forbidden (if existing email password invalid)
```

---

## Step 4: Permanent Login (as supported today)

### What Happens
1. For anonymous play, use `POST /auth/loginAnonymously` to get a temporary session.
2. To persist progress, call `POST /auth/linkCredentials` while logged in as anonymous.
   - Pass `email`, `username`, `password` to upgrade the same account.
   - If `email` exists, backend verifies password and merges progress (current behavior for existing users).
3. Use `GET /auth/info` to inspect current session status.
4. Use `POST /auth/logout` to sign out; anonymous accounts are deleted, permanent accounts remain.

### Session
- Cookie lifetime is configured for 90 days with sliding expiration.
- For anonymous accounts, session is only valid on the device where cookie remains.
- Permanent accounts are intended to persist across devices once linked.

### Relevant Endpoints
- `POST /auth/loginAnonymously` — create anonymous account + set auth cookie
- `POST /auth/linkCredentials` — upgrade or merge to permanent account
- `GET /auth/info` — return `{ email, isAnonymous }`
- `POST /auth/logout` — sign out current user

---

## Step 5: Check Current User

### What Happens
- Player can request their current profile at any time
- Returns email and account type (anonymous / permanent)
- Confirms login status

### Endpoint
```
GET /auth/info
Response: 200 OK
Body: { email, isAnonymous }
OR
Response: 401 Unauthorized (if not logged in)
```

---

## Step 6: Logout

### While Logged In as Anonymous
1. Player clicks "Logout"
2. Backend **deletes** the entire anonymous account
3. All save data and decks are permanently deleted
4. Session cookie is invalidated

### While Logged In as Permanent
1. Player clicks "Logout"
2. Backend **signs out** (invalidates cookie) but keeps account intact
3. Save data and decks remain
4. Player can log back in later with email/password

### Endpoint
```
POST /auth/logout
Response: 200 OK
Cookie: Clear authentication cookie
Side Effects:
  - If anonymous: Account deleted
  - If permanent: Account kept, next login available
```

---

## Diagram: Account Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPLETE ACCOUNT LIFECYCLE                    │
└──────────────────────────────────────────────────────────────────┘

                    ┌─ Anonymous Player ─┐
                    │                    │
          ┌─────────▶ Plays Scenarios ──┐│
          │         │                   ││
[Visit]──┤         │ Builds Decks ◀────┘│
          │         │ (Session)          │
          │         └─────┬──────────────┘
          │               │
          │         [Upgrade Path]
          │               │
          │        ┌──────▼─────────┐
          │        │ Enter Email &  │
          │        │ Password       │
          │        └────────┬───────┘
          │                 │
          │          ┌──────▼──────────────┐
          │          │ Account Upgrade or  │
          │          │ Account Merge       │
          │          └────────┬────────────┘
          │                   │
          │           ┌───────▼─────────┐
          └──────────▶│ Permanent Player │
                      │ (Persistent)     │
                      └─────────────────┘
                            │
                     [Logout]
                            │
                      Can Log In Again
```

---

## Edge Cases & Considerations

### What if a player has multiple browsers/devices?
- **Anonymous:** Must play on same device (cookie-dependent)
- **Permanent:** Can log in from any device after upgrading

### What if a player forgets their password?
- **Current:** ❌ No password reset implemented yet
- **Future:** Add "Forgot Password" flow with email verification

### What if two players try to sign up with the same email?
- **Current:** ❌ Duplicate email prevention not yet implemented
- **Future:** Implement email uniqueness validation

### What about CORS and cross-origin login?
- **Current:** ⚠️ No CORS configured; may fail if SPA and API on different origins
- **Future:** Configure CORS with `AllowCredentials = true` for cross-origin cookies

### Session Hijacking Risk?
- **Current:** Cookies use HTTP-only (secure) + SameSite attributes (TBD in production)
- **Production:** Must enable HTTPS and configure `Secure` and `SameSite=Lax` or `None` (with Secure)

---

## Sequence Diagram: Anonymous to Permanent Upgrade

```
Player                Browser                Backend
  │                     │                       │
  ├─ Click Play Now ────▶│                       │
  │                     │─ POST /login ────────▶│
  │                     │                    Anonymous
  │                     │◀─ 200 + Cookie ────│ Account Created
  │                     │                    Sign In
  │                 (Saved State)             │
  │                     │                       │
  │◀──── Play Game ────┐ │                      │
  │    (3 days later)  └─▶│                      │
  │                     │                       │
  ├─ Upgrade Account ──▶│                       │
  │                     │ POST /linkCredentials│
  │                     │ + email/password ────▶│
  │                     │                  Account Upgraded
  │                     │◀─ 200 OK ────────│    to Permanent
  │                     │ (Cookie updated)  │
  │                     │                       │
  │  (1 month later)    │                       │
  │  (Cookie expired)   │                       │
  │                     │                       │
  ├─ Return to App ────▶│                       │
  │                     │◀─ 401 Unauthorized ▶│ (old cookie invalid)
  │                     │                       │
  ├─ Sign In ──────────▶│                       │
  │ (email/password)    │ POST /login ────────▶│
  │                     │                  Credentials
  │                     │                  Validated
  │                     │◀─ 200 + New ────│    New Cookie
  │                     │    Cookie       │    Issued
  │                     │                       │
  └─────────────────────────────────────────────┘
  Back to playing with saved progress
```

---

## Security Considerations

See [Security & Secrets](../../05_operations/security.md) for details on:
- CORS configuration for cross-origin auth
- CSRF protection for state-changing endpoints
- Cookie attributes (`Secure`, `HttpOnly`, `SameSite`)
- Session timeout and re-authentication
- Password storage and hashing (ASP.NET Identity handles this)
- Data protection keys for cookie encryption
