# Product Overview

## Purpose
Describes what Ahlcg is, its core features, and high-level user interactions. This document focuses on the *product* not the implementation.

## When to Load
Read this to understand what problem Ahlcg solves and what users can do with it.

## Related Files
- [Authentication Flow](./flows/authentication.md) — How users sign in and manage accounts
- [Architecture Overview](../02_architecture/overview.md) — How the product is implemented

---

## What is Ahlcg?

**Ahlcg** is a digital implementation of the Arkham Horror Living Card Game, enabling players to:

- **Build decks** — Assemble card collections following game rules and deckbuilding constraints
- **Play scenarios** — Experience single-player and multiplayer game sessions with real-time synchronization
- **Track game state** — Manage complex game mechanics including investigators, enemies, locations, acts, and agendas
- **Persist progress** — Save game sessions and campaign progress across multiple scenarios
- **Collaborate in real-time** — Multiple players can play together with synchronized game state

The system comprises:
- **Frontend (Angular SPA)** — Game interface, deck building, game board visualization
- **Backend (ASP.NET Core)** — User accounts, game logic, real-time synchronization, persistence
- **Database (PostgreSQL)** — Permanent storage of users, games, and campaign progress

---

## Core Concepts

### User Accounts
- **Anonymous Login** — Players can start playing immediately without signing up
- **Account Upgrade** — Anonymous players can upgrade to permanent accounts with email/password
- **Persistent Profiles** — Saved profiles track deck collections and campaign progress

### Game State
A **game session** encapsulates:
- Active investigators and their status (health, resources, trauma)
- Scenario setup (location layout, agendas, acts, enemies)
- All game pieces (cards in play, locations, etc.)
- Current player turn and decision points
- Campaign history and player choices

### Real-Time Synchronization
Players in the same game receive live updates when:
- Other players take actions
- Game events occur
- Game state changes
- Game ends or scenario completes

---

## High-Level Architecture

```
┌─────────────────────────────┐
│   Player Browser (SPA)      │
│  - Deck builder             │
│  - Game board UI            │
│  - State visualization      │
└──────────┬──────────────────┘
           │ HTTP + WebSocket
           ▼
┌─────────────────────────────┐
│   Backend API               │
│  - Authentication           │
│  - Game orchestration       │
│  - Real-time hub (/game)    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   PostgreSQL Database       │
│  - User accounts            │
│  - Game sessions            │
│  - Campaign state           │
└─────────────────────────────┘
```

---

## User Flows

### New Player
1. Land on homepage
2. Start playing anonymously (no signup required)
3. Build a deck
4. Play a scenario
5. **Optional:** Upgrade to permanent account with email/password

### Returning Player
1. Log in with email/password
2. See saved games and deck collections
3. Resume previous game or start a new scenario
4. After completion, view campaign history

### Multiplayer Game
1. Create a game session
2. Share session code with other players
3. All players join and see synchronized game state
4. Collaborate to complete the scenario
5. See updated campaign progress for all players

---

## Key Features (Current & Future)

### Currently Implemented
- ✅ User authentication (anonymous + upgrade)
- ✅ Real-time communication infrastructure (SignalR)
- ✅ Frontend UI framework and state management
- ✅ Database persistence layer
- ✅ CI/CD and test infrastructure

### In Progress / Planned
- 🔄 Game rules engine and domain model
- 🔄 Scenario definition and loading
- 🔄 Deck builder and validation
- 🔄 Multiplayer synchronization logic
- 🔄 Campaign progression tracking

---

## Technical Constraints

- **Browser Compatibility** — Must work on modern browsers (Chrome, Firefox, Safari, Edge)
- **Offline Support** — Currently requires network connection; offline play not yet supported
- **Mobile** — Currently desktop-focused; mobile responsiveness to be determined
- **API Surface** — Backend currently has auth endpoints only; domain APIs in development
- **Database** — PostgreSQL only; no support for other databases currently planned
