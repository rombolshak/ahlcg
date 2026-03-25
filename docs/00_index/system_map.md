# System Map

## Purpose
A hierarchical overview of all Ahlcg documentation, showing relationships between sections and where to find specific topics.

## When to Load
Use this when you want an overview of the entire documentation structure or need to find related documents on a tema.

## Related Files
- [README](./README.md) — Quick navigation guide
- [Glossary](./glossary.md) — Key terms and definitions

---

## Map: By Reading Order

```
START HERE
├─ 00_index/README.md
│  └─ "What should I read for my task?"
│
UNDERSTAND THE PRODUCT
├─ 01_product/overview.md
│  └─ "What is Ahlcg and how does it work?"
├─ 01_product/flows/authentication.md
│  └─ "How do users log in and manage accounts?"
│
UNDERSTAND THE ARCHITECTURE
├─ 02_architecture/overview.md
│  └─ "How are backend and frontend connected?"
├─ 02_architecture/frontend.md
│  └─ "What is the frontend architecture?"
├─ 02_architecture/backend.md
│  └─ "What is the backend architecture?"
│
IMPLEMENT FEATURES
├─ 03_implementation/frontend/state_management.md
│  └─ "How does the frontend store work?"
├─ 03_implementation/frontend/ui_patterns.md
│  └─ "How do I create components?"
├─ 03_implementation/backend/domain_model.md
│  └─ "What are the core domain entities?"
├─ 03_implementation/backend/services.md
│  └─ "How do I create API endpoints?"
├─ 03_implementation/backend/persistence.md
│  └─ "How does the database layer work?"
│
TEST YOUR CHANGES
├─ 04_testing/strategy.md
│  └─ "What's the overall testing approach?"
├─ 04_testing/frontend.md
│  └─ "How do I write frontend tests?"
├─ 04_testing/backend.md
│  └─ "How do I write backend tests?"
│
BUILD AND DEPLOY
├─ 05_operations/build_and_release.md
│  └─ "How do I build and deploy?"
├─ 05_operations/dev_workflow.md
│  └─ "What are my day-to-day commands?"
├─ 05_operations/security.md
│  └─ "How is the app secured?"
│
QUICK LOOKUPS
├─ 99_reference/api.md
│  └─ "What endpoints and contracts exist?"
├─ 99_reference/conventions.md
│  └─ "What conventions should I follow?"
└─ 00_index/glossary.md
   └─ "What do these terms mean?"
```

---

## Map: By Topic

### Product & Strategy
- **What is Ahlcg?**
  - [Product Overview](../01_product/overview.md)
- **How do users interact with the system?**
  - [Authentication Flow](../01_product/flows/authentication.md)
- **What are the risks and unknowns?**
  - [Product Overview](../01_product/overview.md) (Risks & Unknowns section)

### Architecture & Design
- **How is the system structured?**
  - [Architecture Overview](../02_architecture/overview.md)
- **What is the frontend architecture?**
  - [Frontend Architecture](../02_architecture/frontend.md)
- **What is the backend architecture?**
  - [Backend Architecture](../02_architecture/backend.md)
- **What contracts exist between frontend/backend?**
  - [API Reference](../99_reference/api.md)
- **What technology stack is used?**
  - [Frontend Architecture](../02_architecture/frontend.md) (Tech Stack section)
  - [Backend Architecture](../02_architecture/backend.md) (Tech Stack section)

### Frontend Development
- **How do I understand the frontend codebase?**
  - [Frontend Architecture](../02_architecture/frontend.md)
- **How does the state management system work?**
  - [Frontend State Management](../03_implementation/frontend/state_management.md)
- **How do I create a new component?**
  - [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md)
- **How are routes configured?**
  - [Frontend Architecture](../02_architecture/frontend.md) (Routing section)
- **How do I test components?**
  - [Frontend Testing](../04_testing/frontend.md)
- **How do I run the frontend locally?**
  - [Dev Workflow](../05_operations/dev_workflow.md) (Frontend section)

### Backend Development
- **How do I understand the backend codebase?**
  - [Backend Architecture](../02_architecture/backend.md)
- **What is the domain model?**
  - [Domain Model](../03_implementation/backend/domain_model.md)
- **How do I create an API endpoint?**
  - [Backend Services](../03_implementation/backend/services.md)
  - [API Reference](../99_reference/api.md)
- **How does the database layer work?**
  - [Persistence Layer](../03_implementation/backend/persistence.md)
- **How do I test backend code?**
  - [Backend Testing](../04_testing/backend.md)
- **How do I run migrations?**
  - [Persistence Layer](../03_implementation/backend/persistence.md) (Migrations section)
- **How do I run the backend locally?**
  - [Dev Workflow](../05_operations/dev_workflow.md) (Backend section)

### Testing
- **What is the testing strategy?**
  - [Testing Strategy](../04_testing/strategy.md)
- **How do I write frontend tests?**
  - [Frontend Testing](../04_testing/frontend.md)
- **How do I write backend tests?**
  - [Backend Testing](../04_testing/backend.md)
- **How is coverage measured and reported?**
  - [Testing Strategy](../04_testing/strategy.md) (Coverage section)

### Building & Deployment
- **How do I build the application locally?**
  - [Build & Release](../05_operations/build_and_release.md) (Local Build section)
  - [Dev Workflow](../05_operations/dev_workflow.md) (Quick Start section)
- **How do I run all-in-one development with AppHost?**
  - [Dev Workflow](../05_operations/dev_workflow.md) (Quick Start section)
- **How do I run tests?**
  - [Build & Release](../05_operations/build_and_release.md) (Tests & Coverage section)
  - [Testing Strategy](../04_testing/strategy.md)
- **How does CI/CD work?**
  - [Build & Release](../05_operations/build_and_release.md) (CI Pipelines section)
- **How do I prepare for production?**
  - [Build & Release](../05_operations/build_and_release.md) (Release Process section)
  - [Security & Secrets](../05_operations/security.md) (Hardening Checklist section)

### Security & Operations
- **How does authentication work?**
  - [Authentication Flow](../01_product/flows/authentication.md)
  - [Backend Architecture](../02_architecture/backend.md) (Authentication section)
- **What are the security concerns?**
  - [Security & Secrets](../05_operations/security.md)
- **How are secrets managed?**
  - [Security & Secrets](../05_operations/security.md) (Secrets Management section)
- **What are the production concerns?**
  - [Security & Secrets](../05_operations/security.md) (Hardening Checklist section)
- **How is observability configured?**
  - [Backend Architecture](../02_architecture/backend.md) (Observability section)

### Reference & Conventions
- **What are the API endpoints?**
  - [API Reference](../99_reference/api.md)
- **What SignalR contracts exist?**
  - [API Reference](../99_reference/api.md) (SignalR section)
- **What file/naming conventions should I follow?**
  - [Conventions](../99_reference/conventions.md)
- **Where are important files located?**
  - [Conventions](../99_reference/conventions.md) (File Structure section)
- **What terms should I know?**
  - [Glossary](../glossary.md)

---

## Map: By Audience

### Frontend Engineer
1. [Frontend Architecture](../02_architecture/frontend.md)
2. [Frontend State Management](../03_implementation/frontend/state_management.md)
3. [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md)
4. [Frontend Testing](../04_testing/frontend.md)
5. [Dev Workflow](../05_operations/dev_workflow.md)
6. [API Reference](../99_reference/api.md) (to understand backend contracts)

### Backend Engineer
1. [Backend Architecture](../02_architecture/backend.md)
2. [Domain Model](../03_implementation/backend/domain_model.md)
3. [Backend Services](../03_implementation/backend/services.md)
4. [Persistence Layer](../03_implementation/backend/persistence.md)
5. [Backend Testing](../04_testing/backend.md)
6. [Dev Workflow](../05_operations/dev_workflow.md)
7. [API Reference](../99_reference/api.md)

### Full-Stack Developer
All of the above frontend and backend documents, plus:
1. [Architecture Overview](../02_architecture/overview.md)
3. [Authentication Flow](../01_product/flows/authentication.md)
4. [Security & Secrets](../05_operations/security.md)

### DevOps / Operations Engineer
1. [Build & Release](../05_operations/build_and_release.md)
2. [Dev Workflow](../05_operations/dev_workflow.md) (AppHost section)
3. [Security & Secrets](../05_operations/security.md)
4. [Backend Architecture](../02_architecture/backend.md) (Observability section)

### Product Manager / Documentation Writer
1. [Product Overview](../01_product/overview.md)
2. [Architecture Overview](../02_architecture/overview.md)
3. [Authentication Flow](../01_product/flows/authentication.md)
4. [Glossary](../glossary.md)

### QA / Tester
1. [Testing Strategy](../04_testing/strategy.md)
2. [Frontend Testing](../04_testing/frontend.md)
3. [Backend Testing](../04_testing/backend.md)
4. [API Reference](../99_reference/api.md) (to understand endpoints to test)

---

## Dependencies Between Documents

```
00_index/
├─ README.md (entry point)
├─ Glossary.md (referenced by all)
└─ system_map.md (this document)
        ↓
Product Layer
├─ 01_product/overview.md
│   └─ References: 02_architecture/overview.md
└─ 01_product/flows/authentication.md
    └─ References: 03_implementation/backend/services.md

Architecture Layer
├─ 02_architecture/overview.md
│   ├─ References: 02_architecture/frontend.md, backend.md
│   └─ References: 03_implementation/ (for implementation details)
├─ 02_architecture/frontend.md
│   └─ References: 03_implementation/frontend/, 04_testing/frontend.md
├─ 02_architecture/backend.md
│   └─ References: 03_implementation/backend/, 04_testing/backend.md

Implementation Layer
├─ 03_implementation/frontend/
│   ├─ state_management.md
│   │   └─ References: 04_testing/frontend.md
│   └─ ui_patterns.md
│       └─ References: 04_testing/frontend.md
└─ 03_implementation/backend/
    ├─ domain_model.md
    ├─ services.md
    │   └─ References: 99_reference/api.md
    └─ persistence.md

Testing Layer
├─ 04_testing/strategy.md
├─ 04_testing/frontend.md
│   └─ References: 03_implementation/frontend/
└─ 04_testing/backend.md
    └─ References: 03_implementation/backend/

Operations Layer
├─ 05_operations/build_and_release.md
│   └─ References: 04_testing/
├─ 05_operations/dev_workflow.md
│   └─ References: 02_architecture/overview.md, 05_operations/build_and_release.md
└─ 05_operations/security.md
    └─ References: 02_architecture/backend.md, 01_product/flows/authentication.md

Reference
├─ 99_reference/api.md
│   └─ Referenced by: 03_implementation/backend/services.md
└─ 99_reference/conventions.md
    └─ Referenced by: all implementation documents
```
