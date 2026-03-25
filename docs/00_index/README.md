# Ahlcg Documentation Index

## Purpose
This is the **main entry point** for AI agents and developers navigating the Ahlcg documentation. The docs are organized into focused, modular topics to minimize the information you need to load for any given task.

## When to Load
Always start here when you need to understand the codebase structure or find documentation on a specific topic.

## Related Files
- [Glossary](./glossary.md) — Key terms and definitions
- [System Map](./system_map.md) — Hierarchical overview of all documentation

---

## Quick Navigation Guide

### If you're working on...

#### **Frontend UI & Components**
1. [Frontend Architecture](../02_architecture/frontend.md) — Component structure, routing, store
2. [Frontend State Management](../03_implementation/frontend/state_management.md) — Signal store, patches, animations
3. [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) — Component conventions, styling, i18n
4. [Frontend Testing](../04_testing/frontend.md) — Running tests, writing Jasmine specs

#### **Backend API & Services**
1. [Backend Architecture](../02_architecture/backend.md) — Service structure, Identity, EF Core
2. [Backend Services](../03_implementation/backend/services.md) — Service layer patterns, endpoints
3. [Domain Model](../03_implementation/backend/domain_model.md) — Entities, validation, types
4. [Persistence Layer](../03_implementation/backend/persistence.md) — EF Core, migrations, database
5. [API Reference](../99_reference/api.md) — Endpoints, SignalR contracts, payloads
6. [Backend Testing](../04_testing/backend.md) — Running tests, writing xUnit specs

#### **Authentication & Security**
1. [Auth Flow](../01_product/flows/authentication.md) — User login, linking, logout
2. [Security & Secrets](../05_operations/security.md) — CORS, CSRF, secrets management, hardening

#### **Building & Deployment**
1. [Build & Release](../05_operations/build_and_release.md) — Local builds, CI pipelines, coverage
2. [Dev Workflow](../05_operations/dev_workflow.md) — Quick start, common commands, git hooks
3. [Architecture Overview](../02_architecture/overview.md) — System design decisions

#### **Understanding the Product**
1. [Product Overview](../01_product/overview.md) — What Ahlcg is, high-level features
2. [Authentication Flow](../01_product/flows/authentication.md) — User flows, signup/login
3. [Architecture Overview](../02_architecture/overview.md) — Technical design

#### **Testing**
1. [Testing Strategy](../04_testing/strategy.md) — Overall approach, coverage goals
2. [Frontend Testing](../04_testing/frontend.md) — Karma, Jasmine, running locally
3. [Backend Testing](../04_testing/backend.md) — xUnit, Moq, running locally

#### **Understanding Existing Code**
1. [Conventions](../99_reference/conventions.md) — Naming, patterns, project structure
2. [API Reference](../99_reference/api.md) — Endpoints, payloads, contracts
3. [System Map](../system_map.md) — Where to find everything

---

## Documentation Structure

```
00_index/          ← You are here
  README.md        ← This file
  glossary.md      ← Definitions
  system_map.md    ← Hierarchical map

01_product/        ← What the product is and how users interact with it
  overview.md
  flows/
    authentication.md

02_architecture/   ← How components fit together
  overview.md
  frontend.md
  backend.md

03_implementation/ ← How to build features
  frontend/
    state_management.md
    ui_patterns.md
  backend/
    domain_model.md
    services.md
    persistence.md

04_testing/        ← How to test features
  strategy.md
  frontend.md
  backend.md

05_operations/     ← How to build, deploy, and operate
  build_and_release.md
  dev_workflow.md
  security.md

99_reference/      ← Quick lookup tables
  api.md
  conventions.md
```

---

## Key Principles

1. **Minimal Loading** — Each file is self-contained. You should never need to read the entire docs to complete a task.
2. **Clear Ownership** — Product concepts live in `01_product/`, implementation in `03_implementation/`, architecture in `02_architecture/`.
3. **Evidence-First** — Every claim includes file references and code snippets from the actual codebase.
4. **Cross-References** — Files reference related docs at the top and bottom for easy navigation.

---

## For AI Agents

When an agent asks:
- **"How does authentication work?"** → Read [Auth Flow](../01_product/flows/authentication.md) + [Backend Services](../03_implementation/backend/services.md)
- **"How do I add a frontend component?"** → Read [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) + [Frontend Testing](../04_testing/frontend.md)
- **"Why is the API structured this way?"** → Read [Backend Architecture](../02_architecture/backend.md) + [API Reference](../99_reference/api.md)
- **"How do I run tests?"** → Read [Testing Strategy](../04_testing/strategy.md) + specific test file for your layer

Start with the **Quick Navigation Guide** above. If a doc mentions a related file, read that next. You should rarely need more than 2–3 files.
