# Testing

This document explains how to run, extend, and understand tests across the backend and frontend, including how code coverage is produced locally and in CI. Each claim includes an evidence reference (path + short snippet) from this repository.

Contents
- Overview
- Backend (xUnit + Moq)
- Frontend (Karma + Jasmine)
- Coverage (local and CI)
- CI integrations (Coveralls, Sonar)
- Writing tests: tips and examples
- Troubleshooting
- Evidence index

## Overview

- Backend testing uses xUnit with Moq. Coverage is generated via “XPlat Code Coverage” and aggregated with reportgenerator.
- Frontend testing uses Angular’s Karma runner with Jasmine. Coverage reporters output lcov and HTML.

## Backend (xUnit + Moq)

- Test project location:
  - backend/unit-tests/Ahlcg.ApiService.Tests
- Frameworks and runners:
  - xUnit, Moq, Microsoft.NET.Test.Sdk
- Scope (current):
  - Focused on the authentication flow (`AuthEndpoints`) covering anonymous login, linking credentials, logout, and “get current user.”

Run locally (from repo root):
- `cd backend`
- `dotnet test`

Typical backend developer loop:
- Build + test with a single command: `dotnet test`
- Filter a single test: `dotnet test --filter "FullyQualifiedName~AuthEndpointsTests.LinkCredentials_*"`

Evidence:
```ahlcg/backend/unit-tests/Ahlcg.ApiService.Tests/Ahlcg.ApiService.Tests.csproj#L1-24
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    ...
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.4"/>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1"/>
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="xunit" Version="2.9.3"/>
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4"/>
  </ItemGroup>
  ...
</Project>
```

```ahlcg/backend/unit-tests/Ahlcg.ApiService.Tests/AuthEndpointsTests.cs#L1-30
namespace Ahlcg.ApiService.Tests;

public class AuthEndpointsTests
{
    [Fact]
    public async Task LoginAnonymously_NotLoggedIn_CreatesAnonymousAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();
        ...
    }
    ...
}
```

## Frontend (Karma + Jasmine)

- Test runner:
  - Karma (Chrome/ChromeHeadless) with Jasmine
- Configuration:
  - Angular CLI test builder configured in `angular.json`
  - Karma configured with reporters (lcov, html)

Run locally (from repo root):
- `cd frontend`
- `npm run test` (headed, watch)
- `npm run test:ci` (headless, CI-friendly)

Where tests live:
- Co-located with components/services as `*.spec.ts` under `frontend/src/**`

Evidence:
```ahlcg/frontend/package.json#L9-22
"scripts": {
  "start": "ng serve",
  "build": "ng build",
  "test": "npm run test:ci",
  "test:ci": "ng test --no-watch --no-progress --browsers=ChromeHeadless",
  ...
}
```

```ahlcg/frontend/karma.conf.cjs#L1-12
module.exports = function (config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine"],
    plugins: [
      require("karma-jasmine"),
      require("karma-chrome-launcher"),
      require("karma-jasmine-html-reporter"),
      require("karma-coverage"),
    ],
```

```ahlcg/frontend/angular.json#L57-79
"test": {
  "builder": "@angular/build:karma",
  "options": {
    "codeCoverage": true,
    "tsConfig": "tsconfig.spec.json",
    "inlineStyleLanguage": "css",
    "assets": [{ "glob": "**/*", "input": "public" }],
    "styles": ["src/styles.css"],
    "scripts": [],
    "karmaConfig": "karma.conf.cjs"
  }
}
```

## Coverage (local and CI)

### Backend coverage
- Local (quick path):
  - `dotnet test` will produce coverage when configured; CI shows the full flow.
- CI flow:
  - Collect with `--collect:"XPlat Code Coverage"`
  - Aggregate using `reportgenerator` into `backend/coveragereport/`:
    - HTML report
    - Cobertura.xml (used by Coveralls)
    - SonarQube.xml (used by SonarCloud)

Evidence:
```ahlcg/.github/workflows/backend.yml#L41-58
- name: Test
  run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage" --logger:"trx"
- name: Create coverage report
  run: reportgenerator -reports:"**/coverage.cobertura.xml" -targetDir:"coveragereport" -reporttypes:Html,cobertura,SonarQube ...
```

Artifacts (CI):
- Folder: `backend/coveragereport/`
- Primary files: `Cobertura.xml`, `index.htm` (HTML), `SonarQube.xml`

### Frontend coverage
- Local:
  - `npm run test` or `npm run test:ci` with `codeCoverage: true` generates:
    - lcov report (for tooling)
    - HTML report (human-readable)
- Output:
  - `frontend/coverage/ahlcg/`

Evidence:
```ahlcg/frontend/karma.conf.cjs#L23-36
coverageReporter: {
  dir: require("path").join(__dirname, "./coverage/ahlcg"),
  subdir: ".",
  reporters: [{ type: "lcov" }, { type: "html" }],
},
```

## CI integrations (Coveralls, Sonar)

- Backend:
  - SonarCloud scan wraps build/test (begin/end steps)
  - Coveralls receives the backend Cobertura.xml
- Frontend:
  - SonarQube Scan action runs in the frontend workflow
  - Coveralls receives frontend coverage (path auto-detected by action)

Evidence:
```ahlcg/.github/workflows/backend.yml#L33-58
- name: Start Sonar
  run: dotnet sonarscanner begin /k:"rombolshak_ahlcg_backend" ... /d:sonar.coverageReportPaths=coveragereport/SonarQube.xml
...
- name: Stop Sonar
  run: dotnet sonarscanner end /d:sonar.token="${{ secrets.SONAR_TOKEN }}"
```

```ahlcg/.github/workflows/backend.yml#L60-70
- name: Coveralls
  uses: coverallsapp/github-action@v2
  with:
    file: ${{ github.workspace }}/backend/coveragereport/Cobertura.xml
    flag-name: 'backend'
```

```ahlcg/.github/workflows/frontend.yml#L33-48
- name: Coveralls
  uses: coverallsapp/github-action@v2
  with:
    flag-name: 'frontend'
    parallel: true
- name: SonarQube Scan
  uses: SonarSource/sonarqube-scan-action@v6.0.0
  with:
    projectBaseDir: 'frontend'
```

```ahlcg/.github/workflows/ci.yml#L46-60
- name: Finish parallel build
  uses: coverallsapp/github-action@master
  with:
    parallel-finished: true
    carryforward: 'frontend,backend'
```

## Writing tests: tips and examples

### Backend
- Unit test surface:
  - Focus on pure logic in endpoints and services (e.g., username validation, account-link flows).
- Mocking:
  - Use `Moq` to mock `UserManager`, `SignInManager`, and services, as shown in existing tests.

Evidence:
```ahlcg/backend/unit-tests/Ahlcg.ApiService.Tests/AuthEndpointsTests.cs#L122-174
private static Mock<UserManager<AppUser>> GetMockUserManager()
{
    var mock = new Mock<UserManager<AppUser>>(...);
    ...
    mock.Setup(m => m.CreateAsync(It.IsAny<AppUser>())).ReturnsAsync(IdentityResult.Success);
    ...
}
```

### Frontend
- Component tests:
  - Prefer shallow component tests (standalone components) with Angular TestBed.
- i18n:
  - Use the project’s Transloco test module helper where needed (common in component specs).
- Signals:
  - Provide stores/services via TestBed providers and assert computed signals or DOM output.

Evidence:
```ahlcg/frontend/src/app/pages/game-view/components/game-header/game-header.component.spec.ts#L1-20
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
...
```

## Troubleshooting

- Backend
  - Coverage not showing locally:
    - Ensure you run with coverage collection (CI uses `--collect:"XPlat Code Coverage"`).
    - Install `reportgenerator` locally if you want HTML/Cobertura aggregation:
      - `dotnet tool install --global dotnet-reportgenerator-globaltool`
  - Flaky tests involving DateTime or async:
    - Abstract time and avoid relying on real delays. Use deterministic inputs.

- Frontend
  - Chrome not found (local):
    - Install Chrome or configure Karma to use a different launcher.
  - Missing i18n providers:
    - Import/Provide the Transloco test module in spec files.
  - CSS/DOM-dependent rendering issues:
    - Prefer testing DOM output and inputs rather than styling; rely on Storybook for visual checks.

## Evidence index (quick links)

- Backend test project:
  - backend/unit-tests/Ahlcg.ApiService.Tests/*
- Backend coverage in CI:
  - .github/workflows/backend.yml (test + reportgenerator + Coveralls + Sonar)
- Frontend test config and scripts:
  - frontend/karma.conf.cjs
  - frontend/angular.json (“test” builder)
  - frontend/package.json (“test”, “test:ci”)
- Frontend sample specs:
  - frontend/src/app/pages/game-view/components/**/**/*.spec.ts
- CI finalization:
  - .github/workflows/ci.yml (Coveralls parallel-finished)
