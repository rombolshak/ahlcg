# Glossary

## Purpose
Definitions of key domain terms (card game concepts) and technical terms specific to Ahlcg.

## When to Load
Read when you encounter unfamiliar terminology while working on product or implementation code.

## Related Files
- [README](./README.md) — Documentation index

---

## Domain Terms (Card Game)

**Investigator**
A playable character in the card game representing the player's role in the campaign. Each investigator has attributes, skills, and a unique deck.

**Deck**
A collection of cards assembled by the player according to specific rules and point limits. Decks contain various card types (supports, events, enemies, etc.).

**Act**
A phase of the campaign scenario that represents progression toward a goal. Investigators must fulfill the "Act" card's condition to advance to the next act or conclude the scenario.

**Agenda**
A scenario threat card that represents the enemy's counter-plan. Like Acts, Agendas have conditions that trigger when they advance, forcing investigators to react.

**Enemy**
A card type representing a threat that enemies must defeat or evade. Enemies have Hit Points, threat level, and can attack investigators.

**Location**
A playable area on the board where investigators can interact, search for clues, and face enemies.

**Clue**
A game resource representing investigation progress. Investigators move actions to different locations and claim clues to advance the Act.

**Game State**
The complete snapshot of a single game session, including:
- All investigators and their status
- The current Act and Agenda cards
- Active locations and enemies
- The scenario board state
- All player decisions and progression

**Scenario**
A self-contained campaign session with specific rules, enemies, locations, and victory conditions.

**Campaign**
A series of connected scenarios that tell a broader story. Campaign state carries over between scenarios (investigator resources, story flags, etc.).

---

## Technical Terms

**Ahlcg**
The name of this project: "Arkham Horror Living Card Game" (a digital implementation or companion for the physical game).

**SPA (Single-Page Application)**
Frontend architecture where the entire UI loads once and subsequent navigation uses client-side JavaScript. Ahlcg's frontend is an Angular SPA served from `frontend/`.

**Signal Store**
Ahlcg's state management solution using `@ngrx/signals`. Provides reactive state updates with type-safe patches and computed selectors.

**RFC6902 Patch**
An industry-standard format for describing partial updates to JSON documents. Ahlcg applies patches from the server to the frontend store for incremental state synchronization.

**GSAP Flip Animation**
A JavaScript animation library used to smoothly transition the UI when game state changes. Provides visual feedback for state updates.

**Minimal API**
ASP.NET Core feature allowing endpoint definition without controllers. Ahlcg uses minimal APIs for lightweight REST endpoints grouped under `/auth`.

**Entity Framework Core (EF Core)**
Object-Relational Mapper (ORM) for .NET that maps database tables to C# classes. Ahlcg uses it with PostgreSQL.

**AppHost (.NET Aspire)**
A local orchestration tool that manages the development environment: spinning up PostgreSQL, applying migrations, starting the API server, and running the frontend dev server with health checks.

**Migrator**
A .NET background service that applies Entity Framework migrations on startup, ensuring the database schema is up-to-date before the API starts.

**SignalR**
A .NET library for real-time, bi-directional communication between server and client. Ahlcg prepares a `/game` hub for future live game synchronization.

**Cookie-Based Auth**
Session authentication using HTTP cookies. The backend signs users in; the browser automatically sends the cookie on subsequent requests.

**Anonymous User**
A temporary account created without credentials. Can be upgraded to a permanent account with email/password; deleted on logout.

**OpenTelemetry (OTel)**
A standards-based observability framework for collecting logs, metrics, and traces. Ahlcg integrates OTel for debugging and monitoring.

**Storybook**
A tool for developing and testing UI components in isolation. Components are documented with "stories" demonstrating various states.

**Chromatic**
A visual regression testing service that captures screenshots of Storybook stories and detects visual changes across versions.

**Coverage**
Measurement of how much code is executed by tests. Ahlcg tracks frontend and backend coverage separately and aggregates them in Coveralls.

**Cobertura**
An XML format for test coverage reports. Used to display coverage metrics in SonarCloud and Coveralls.

**xUnit**
A unit testing framework for .NET. Ahlcg uses it for backend tests.

**Moq**
A mocking library for .NET that creates stub objects for testing. Used in backend unit tests.

**Karma**
A test runner for JavaScript/TypeScript (Angular). Runs Jasmine tests in real or headless browsers.

**Jasmine**
A behavior-driven testing framework for JavaScript. Used for frontend unit and spec tests.

**Transloco**
An i18n (internationalization) library for Angular. Ahlcg uses it to support multiple languages.

**Arktype**
A TypeScript schema validation library. Used to validate game state in the frontend store.

**CORS (Cross-Origin Resource Sharing)**
HTTP mechanism allowing a server to permit requests from different origins (domains/ports). Required if the frontend and API run on different origins.

**CSRF (Cross-Site Request Forgery)**
A security attack where an attacker tricks a user into making unwanted requests. Mitigated by cookie attributes and/or token verification.

**ProblemDetails**
A standardized format (RFC 7807) for error responses in REST APIs. Ahlcg APIs use this format for consistent error handling.

**Health Checks**
Endpoints (`/health`, `/alive`) that report application readiness. Used by orchestrators to verify service startup.

---

## System Architecture Terms

**Monorepo**
A single repository containing multiple projects or applications. Ahlcg is a monorepo with separate `backend/` and `frontend/` folders.

**Domain-Driven Design (DDD)**
An architectural approach emphasizing a rich domain model. Ahlcg's game state validation follows DDD principles.

**Separation of Concerns**
A design principle where different responsibilities live in different modules. Ahlcg separates:
- Frontend UI from state management
- Backend endpoints from business logic
- Application logic from infrastructure concerns

**Data Flow**
The path data takes through the system. Example: User → Browser → HTTP Request → Backend → Database → Response → Browser → Store Update → UI Render.

---

## CI/CD Terms

**GitHub Actions**
GitHub's built-in CI/CD platform. Ahlcg uses it for automated testing, coverage, and Chromatic visual regression.

**Path Filtering**
A GitHub Actions feature that runs workflows conditionally based on which files changed. Ahlcg runs frontend tests only if frontend code changed.

**SonarCloud**
A static analysis tool that scans code for bugs, vulnerabilities, and code smells. Ahlcg runs SonarCloud on backend and frontend separately.

**Coveralls**
A code coverage aggregation service. Ahlcg uploads coverage from frontend and backend and reports combined metrics.

**TurboSnap**
A Chromatic feature that only captures visual diffs for changed components, speeding up visual regression testing.

---

## Environment Terms

**.NET SDK**
The development kit for building .NET applications. Ahlcg requires .NET 10.0.

**Node.js / npm**
JavaScript runtime and package manager. Used for frontend development and dependencies.

**PostgreSQL**
An open-source relational database. Ahlcg's persistent layer stores user identity and future game state.

**PgAdmin**
A web interface for PostgreSQL administration. Spun up alongside Postgres in the AppHost for dev convenience.
