# Build and Release

This document explains how Ahlcg is built and validated locally and in CI, how code coverage and quality gates are produced, and the current status of “releases.” Where a statement is not explicit in code, it is marked as INFERENCE with reasoning.

Contents
- Overview
- Prerequisites
- Local build commands (backend, frontend)
- Tests and coverage (backend, frontend)
- CI pipelines (entry, backend, frontend, Chromatic)
- Artifacts and where to find them
- Release process 

## Overview

- The repository is a monorepo with two main parts:
  - Backend (ASP.NET Core, EF Core, SignalR) under `backend/`
  - Frontend (Angular) under `frontend/`
- CI is split into path-filtered workflows so that only impacted parts are built and tested.
- Coverage is collected in both backend and frontend and aggregated in Coveralls; SonarCloud scans run for both.
- INFERENCE: There is no production deployment pipeline or release job yet; .NET Aspire AppHost is oriented for local orchestration.

## Prerequisites

- Backend: .NET SDK 10.x
  - Evidence: .github/workflows/backend.yml: uses setup-dotnet with version “10”
- Frontend: Node.js (latest in CI; recommended 20+), npm
  - Evidence: .github/workflows/frontend.yml: uses setup-node with node-version “latest”

## Local build commands

Backend (from repository root, then do):

- Build:
  - cd backend
  - dotnet restore
  - dotnet build
- Run API (standalone):
  - cd backend/Ahlcg.ApiService
  - dotnet run
- All-in-one dev via Aspire (Postgres + Migrator + API + Frontend dev server):
  - cd backend/Ahlcg.AppHost
  - dotnet restore
  - dotnet run

Frontend:

- Build:
  - cd frontend
  - npm ci
  - npm run build
- Start dev server:
  - cd frontend
  - npm start

## Tests and coverage

Backend (xUnit + Moq, coverage via XPlat + reportgenerator):

- Run tests locally:
  - cd backend
  - dotnet test
- Coverage output (in CI):
  - reportgenerator aggregates to `backend/coveragereport/` (Cobertura.xml, HTML, SonarQube formats)
- Evidence:
  - .github/workflows/backend.yml: contains “dotnet test … --collect:"XPlat Code Coverage" …” and “reportgenerator … -targetDir:"coveragereport" -reporttypes:Html,cobertura,SonarQube …”

Frontend (Karma + Jasmine, Chrome/ChromeHeadless):

- Run tests locally:
  - cd frontend
  - npm run test
- CI tests:
  - npm run test:ci (ChromeHeadless; configured via Angular builder)
- Coverage output:
  - frontend/coverage/ahlcg (lcov and html)
- Evidence:
  - frontend/karma.conf.cjs: sets reporters “lcov” and “html” and output path “coverage/ahlcg”

## CI pipelines

Entry workflow (path-filtered):
- File: .github/workflows/ci.yml
- Triggers on pushes and PRs to main.
- Uses dorny/paths-filter to set:
  - backend = true if `backend/**` or backend workflow file changes
  - frontend = true if `frontend/src/**` or `frontend/*.json` or frontend workflow file changes
- Delegates to reusable workflows:
  - Backend: .github/workflows/backend.yml (if backend = true)
  - Frontend: .github/workflows/frontend.yml (if frontend = true)
- Final Coveralls “parallel-finished” step runs regardless (always) to merge parallel jobs.

Backend workflow:
- File: .github/workflows/backend.yml
- Steps (summarized):
  - Checkout
  - Setup .NET 10
  - Install tools: dotnet-reportgenerator-globaltool, dotnet-sonarscanner
  - Sonar begin (project key “rombolshak_ahlcg_backend”, org “rombolshak”)
  - dotnet restore, dotnet build
  - dotnet test with coverage collection
  - reportgenerator to produce HTML/Cobertura/SonarQube reports at backend/coveragereport
  - Sonar end (requires SONAR_TOKEN)
  - Coveralls upload (Cobertura.xml; flagged as “backend”)
- Evidence:
  - .github/workflows/backend.yml: shows exact commands and paths

Frontend workflow:
- File: .github/workflows/frontend.yml
- Steps (summarized):
  - Checkout
  - Setup Node (latest) with npm caching
  - npm ci (uses “--force” note for Tailwind 4 resolution with angular-builder 19.1)
  - npm run ci:all (lint + test)
  - Coveralls upload (flagged as “frontend”)
  - SonarQube Scan (requires SONAR_TOKEN)
- Evidence:
  - .github/workflows/frontend.yml: shows exact commands and flags

Chromatic workflow:
- File: .github/workflows/chromatic.yml
- Triggers on pushes (excluding dependabot branches) when frontend/src or frontend/public/assets/fonts change
- Steps:
  - Checkout
  - Setup Node and install dependencies (npm ci)
  - Build Storybook (npm run build-storybook)
  - Run chromaui/action with TurboSnap (requires CHROMATIC_PROJECT_TOKEN)
- Evidence:
  - .github/workflows/chromatic.yml: shows “onlyChanged: true”, “storybookBuildDir: 'storybook-static'”

## Artifacts and locations

- Backend:
  - Coverage: backend/coveragereport/ (HTML report, Cobertura.xml, SonarQube.xml)
  - Test results (trx, coverage.cobertura.xml) generated under test project’s output paths and aggregated by reportgenerator in CI
- Frontend:
  - Build artifacts: frontend/dist/ahlcg (Angular build)
  - Coverage: frontend/coverage/ahlcg (lcov, html)
  - Storybook static: frontend/storybook-static (built in Chromatic workflow and via `npm run build-storybook`)
- CI integrations:
  - Coveralls: Receives parallel uploads from frontend and backend; final “parallel-finished” job ends the run
  - SonarCloud: Scans both frontend and backend (separate tokens/contexts in workflows)
  - Chromatic: Uploads Storybook build for visual regression

## Release process

Current status:
- INFERENCE: No release pipeline (Docker images, publish steps, or environment-specific deploy jobs) is defined in the repository. Aspire AppHost is configured primarily for local development and orchestration. Certainty: high (no Dockerfiles, no deploy workflows).

Minimal manual release (interim guidance):
- Backend:
  - Build/publish a self-contained artifact or containerize (see “Proposed” below)
  - Ensure environment config for DB connection and telemetry is provided (connection strings, OTEL exporter)
- Frontend:
  - `npm run build` to produce `frontend/dist/ahlcg`
  - Host the static assets behind a web server or CDN; if using cookie auth across origins, configure CORS and SameSite=None;Secure on backend
