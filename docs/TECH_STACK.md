# Tech Stack

This document summarizes the technologies used across the Ahlcg monorepo and provides direct evidence (file/line references) for each claim.

## Languages and Runtimes

- Backend: C# on .NET 10.0
  - Evidence:
    ```ahlcg/backend/Ahlcg.ApiService/Ahlcg.ApiService.csproj#L1-9
    <Project Sdk="Microsoft.NET.Sdk.Web">
        <PropertyGroup>
            <TargetFramework>net10.0</TargetFramework>
            <ImplicitUsings>enable</ImplicitUsings>
            <Nullable>enable</Nullable>
            <RootNamespace>Ahlcg.ApiService</RootNamespace>
            <InterceptorsNamespaces>$(InterceptorsNamespaces);Microsoft.AspNetCore.Http.Validation.Generated</InterceptorsNamespaces>
            <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
        </PropertyGroup>
    ```
    ```ahlcg/backend/Ahlcg.AppHost/Ahlcg.AppHost.csproj#L1-11
    <Project Sdk="Microsoft.NET.Sdk">
        <Sdk Name="Aspire.AppHost.Sdk" Version="13.0.0"/>
        <PropertyGroup>
            <OutputType>Exe</OutputType>
            <TargetFramework>net10.0</TargetFramework>
            <ImplicitUsings>enable</ImplicitUsings>
            <Nullable>enable</Nullable>
            <UserSecretsId>512ce96a-36b4-42fb-aabc-830314848c65</UserSecretsId>
            <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
        </PropertyGroup>
    ```
- Frontend: TypeScript (Angular 20), TS ~5.9
  - Evidence:
    ```ahlcg/frontend/package.json#L18-28
    "dependencies": {
      "@angular/animations": "^20.3.14",
      "@angular/common": "^20.3.14",
      "@angular/compiler": "^20.3.14",
      "@angular/core": "^20.3.14",
      ...
    }
    ```
    ```ahlcg/frontend/package.json#L63-70
    "devDependencies": {
      ...
      "typescript": "~5.9.3",
      ...
    }
    ```

## Backend Stack

- Web framework: ASP.NET Core Minimal APIs
  - Evidence (pipeline + endpoint mapping):
    ```ahlcg/backend/Ahlcg.ApiService/Program.cs#L7-20
    builder
        .AddServiceDefaults()
        .AddNpgsqlDbContext<ApplicationDbContext>("ahlcg");

    builder.Services
        .AddProblemDetails()
        .AddOpenApi()
        .AddValidation();

    builder.Services.AddSignalR().AddHubInstrumentation();
    ```
- Authentication/Authorization: ASP.NET Identity (cookie-based)
  - Evidence:
    ```ahlcg/backend/Ahlcg.ApiService/Program.cs#L22-33
    builder.Services
        .AddIdentityApiEndpoints<AppUser>()
        .AddEntityFrameworkStores<ApplicationDbContext>();
    builder.Services.ConfigureApplicationCookie(options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromDays(90);
        options.SlidingExpiration = true;
    });

    app.MapGroup("auth").MapAuthEndpoints().WithTags("Auth");
    ```
    ```ahlcg/backend/Ahlcg.ApiService/AuthEndpoints.cs#L6-16
    public class AppUser : IdentityUser
    {
        public bool IsAnonymous { get; set; }
    }
    ```
- Persistence: Entity Framework Core (Npgsql/PostgreSQL)
  - Evidence:
    ```ahlcg/backend/Ahlcg.ApiService/Ahlcg.ApiService.csproj#L15-23
    <ItemGroup>
        <PackageReference Include="Aspire.Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.5.2"/>
        ...
        <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.0.10"/>
        <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0-rc.1.25451.107"/>
        <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.10">
            <PrivateAssets>all</PrivateAssets>
            <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
        </PackageReference>
    </ItemGroup>
    ```
    ```ahlcg/backend/Ahlcg.ApiService/ApplicationDbContext.cs#L1-7
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : IdentityDbContext<AppUser>(options);
    ```
    ```ahlcg/backend/Ahlcg.ApiService/Migrations/20251114145044_Initial.cs#L1-30
    using Microsoft.EntityFrameworkCore.Migrations;
    ...
    migrationBuilder.CreateTable(
        name: "AspNetUsers",
        columns: table => new
        {
          Id = table.Column<string>(type: "text", nullable: false),
          ...
        },
    ```
- Real-time: SignalR with OpenTelemetry instrumentation
  - Evidence:
    ```ahlcg/backend/Ahlcg.ApiService/Program.cs#L15-20
    builder.Services.AddSignalR().AddHubInstrumentation();
    ```
    ```ahlcg/backend/Ahlcg.ApiService/GameHub.cs#L5-11
    [Authorize]
    public class GameHub : Hub
    {
        public async Task Ping() => await Clients.Caller.SendAsync("ping", DateTime.UtcNow);
    }
    ```
- API documentation: OpenAPI + Scalar UI (development only)
  - Evidence:
    ```ahlcg/backend/Ahlcg.ApiService/Ahlcg.ApiService.csproj#L21-28
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0-rc.1.25451.107"/>
    ...
    <PackageReference Include="Scalar.AspNetCore" Version="2.10.3"/>
    ```
    ```ahlcg/backend/Ahlcg.ApiService/Program.cs#L34-39
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
        app.UseDeveloperExceptionPage();
    }
    ```
- Observability: OpenTelemetry (logs, metrics, tracing), health checks
  - Evidence:
    ```ahlcg/backend/Ahlcg.ServiceDefaults/Extensions.cs#L60-93
    builder.Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
            metrics.AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation())
        .WithTracing(tracing =>
        {
            tracing.AddSource(builder.Environment.ApplicationName)
                .AddAspNetCoreInstrumentation(tracing =>
                    tracing.Filter = context =>
                        !context.Request.Path.StartsWithSegments(HealthEndpointPath)
                        && !context.Request.Path.StartsWithSegments(AlivenessEndpointPath)
                )
                .AddHttpClientInstrumentation()
                .AddSignalRInstrumentation();
        });
    ```
    ```ahlcg/backend/Ahlcg.ServiceDefaults/Extensions.cs#L43-58
    if (!app.Environment.IsDevelopment()) return app;
    app.MapHealthChecks("/health");
    app.MapHealthChecks("/alive", new HealthCheckOptions
    {
        Predicate = r => r.Tags.Contains("live")
    });
    ```
- Local orchestration: .NET Aspire AppHost (Postgres + EF migrator + API + frontend dev server)
  - Evidence:
    ```ahlcg/backend/Ahlcg.AppHost/AppHost.cs#L3-24
    var postgres = builder.AddPostgres("postgresdb").WithPgAdmin();
    var database = postgres.AddDatabase("ahlcg");

    var migrator = builder.AddProject<Ahlcg_Migrator>("migrator").WithReference(database).WaitFor(database);

    var apiService = builder.AddProject<Ahlcg_ApiService>("apiservice")
        .WithHttpHealthCheck("/health")
        .WithReference(database)
        .WithReference(migrator)
        .WaitForCompletion(migrator);

    builder.AddViteApp("webfrontend", "../../frontend", "start")
        .WithExternalHttpEndpoints()
        .WithReference(apiService)
        .WaitFor(apiService);
    ```

## Frontend Stack

- Framework: Angular 20
  - Evidence:
    ```ahlcg/frontend/package.json#L18-28
    "@angular/animations": "^20.3.14",
    "@angular/common": "^20.3.14",
    "@angular/compiler": "^20.3.14",
    "@angular/core": "^20.3.14",
    ...
    ```
- Build and Dev:
  - Angular CLI, scripts
  - Evidence:
    ```ahlcg/frontend/package.json#L9-17
    "scripts": {
      "ng": "ng",
      "start": "ng serve",
      "build": "ng build",
      "watch": "ng build --watch --configuration development",
      "test": "npm run test:ci",
      ...
    }
    ```
    ```ahlcg/frontend/angular.json#L24-44
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "outputPath": "dist/ahlcg",
        "index": "src/index.html",
        "browser": "src/main.ts",
        "tsConfig": "tsconfig.app.json",
        ...
      }
    }
    ```
- State management: `@ngrx/signals` (signalStore)
  - Evidence:
    ```ahlcg/frontend/src/app/pages/game-view/store/game-state.store.ts#L1-17
    import { computed } from '@angular/core';
    import {
      patchState,
      signalStore,
      withComputed,
      withMethods,
      withProps,
      withState,
      WritableStateSource,
    } from '@ngrx/signals';
    ```
- Domain modeling and validation: `arktype` with strict TS, RFC6902 patches via `rfc6902`, immutable updates via `immer`, GSAP Flip animations
  - Evidence:
    ```ahlcg/frontend/src/app/shared/domain/game-state.ts#L1-20
    import { Traversal, type } from 'arktype';
    import { CardType } from './entities/card.model';
    ...
    export const gameState = type({ ... }).narrow((state, ctx: Traversal) => { ... });
    ```
    ```ahlcg/frontend/src/app/pages/game-view/store/game-state.store.ts#L11-20
    import { gsap } from 'gsap';
    import { Flip } from 'gsap/Flip';
    import { produce } from 'immer';
    import { applyPatch, Operation } from 'rfc6902';
    ```
- Internationalization (i18n): Transloco
  - Evidence:
    ```ahlcg/frontend/src/app/app.config.ts#L23-66
    provideTransloco({
      config: {
        availableLangs: [ { id: 'en', label: 'English' }, ... ],
        defaultLang: 'en',
        fallbackLang: 'en',
        ...
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    ```
    ```ahlcg/frontend/transloco.config.ts#L1-9
    const config: TranslocoGlobalConfig = {
      rootTranslationsPath: 'public/assets/i18n/',
      langs: ['en', 'ru', 'fr', 'de', 'it', 'ko', 'pl', 'pt', 'es', 'uk', 'zh'],
      keysManager: {},
    };
    ```
- Error monitoring (frontend): Bugsnag (keys currently hardcoded)
  - Evidence:
    ```ahlcg/frontend/src/app/app.config.ts#L15-22
    Bugsnag.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
    BugsnagPerformance.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
    ```
- UI/Dev tooling:
  - Storybook + Chromatic
    - Evidence:
      ```ahlcg/frontend/.storybook/main.ts#L1-10
      const config: StorybookConfig = {
        stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
        staticDirs: ['../public'],
        addons: [],
        framework: { name: '@storybook/angular', options: {} },
      };
      ```
      ```ahlcg/.github/workflows/chromatic.yml#L1-20
      name: "Chromatic"
      on:
        push:
          branches-ignore:
            - "dependabot/**"
          paths:
            - "frontend/src"
            - "frontend/public/assets/fonts"
      ```
  - Linting/formatting: ESLint (flat config), Stylelint, Prettier; Angular ESLint rules; Tailwind lint rules
    - Evidence:
      ```ahlcg/frontend/eslint.config.js#L1-21
      import eslint from "@eslint/js";
      import { configs as ngConfigs, processInlineTemplates } from "angular-eslint";
      import prettierConfig from "eslint-config-prettier";
      import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
      ...
      ```
      ```ahlcg/frontend/eslint.config.js#L86-116
      {
        plugins: { "better-tailwindcss": eslintPluginBetterTailwindcss },
        rules: {
          ...eslintPluginBetterTailwindcss.configs["recommended-warn"].rules,
          ...eslintPluginBetterTailwindcss.configs["recommended-error"].rules,
          "better-tailwindcss/enforce-consistent-line-wrapping": ["warn", { printWidth: 140, preferSingleLine: true }],
          "better-tailwindcss/no-unregistered-classes": ["warn", { detectComponentClasses: true }],
        },
        settings: { "better-tailwindcss": { entryPoint: "./src/styles.css" } },
      }
      ```
    - INFERENCE: Tailwind CSS is likely used given dependencies (`tailwindcss`, `daisyui`) and Tailwind-specific ESLint rules, although the Tailwind config file is not shown in this repository snapshot. Certainty: medium.
      - Evidence: `frontend/package.json` includes `tailwindcss`, `daisyui`; templates use utility classes consistent with Tailwind (e.g., arbitrary values).
- Testing: Karma + Jasmine (coverage lcov/html)
  - Evidence:
    ```ahlcg/frontend/karma.conf.cjs#L1-9
    module.exports = function (config) {
      config.set({
        basePath: "",
        frameworks: ["jasmine"],
        plugins: [
          require("karma-jasmine"),
          require("karma-chrome-launcher"),
          require("karma-jasmine-html-reporter"),
          require("karma-coverage"),
    ```
    ```ahlcg/frontend/karma.conf.cjs#L23-36
    coverageReporter: {
      dir: require("path").join(__dirname, "./coverage/ahlcg"),
      subdir: ".",
      reporters: [{ type: "lcov" }, { type: "html" }],
    },
    reporters: ["progress", "kjhtml"],
    browsers: ["Chrome"],
    restartOnFileChange: true,
    ```

## CI/CD, Quality, and Coverage

- Orchestrated CI entry: path-filtered triggers for backend/frontend
  - Evidence:
    ```ahlcg/.github/workflows/ci.yml#L1-20
    name: CI Build
    ...
    jobs:
      paths-filter:
        runs-on: ubuntu-latest
        outputs:
          backend: ${{ steps.filter.outputs.backend }}
          frontend: ${{ steps.filter.outputs.frontend }}
    ```
    ```ahlcg/.github/workflows/ci.yml#L21-32
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
              - '.github/workflows/backend.yml'
            frontend:
              - 'frontend/src/**'
              - 'frontend/*.json'
              - '.github/workflows/frontend.yml'
    ```
- Backend CI: .NET 10, restore/build/test, coverage aggregation, SonarCloud, Coveralls
  - Evidence:
    ```ahlcg/.github/workflows/backend.yml#L16-33
    uses: actions/setup-dotnet@v4
    with:
      dotnet-version: 10
    ...
    - name: Install coverage tool
      run: dotnet tool install --global dotnet-reportgenerator-globaltool
    - name: Install Sonar scanner
      run: dotnet tool install --global dotnet-sonarscanner
    ```
    ```ahlcg/.github/workflows/backend.yml#L35-58
    - name: Start Sonar
      run: dotnet sonarscanner begin ...
    - name: Restore dependencies
      run: dotnet restore
    - name: Build
      run: dotnet build --no-restore
    - name: Test
      run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage" --logger:"trx"
    - name: Create coverage report
      run: reportgenerator -reports:"**/coverage.cobertura.xml" -targetDir:"coveragereport" ...
    - name: Stop Sonar
      run: dotnet sonarscanner end ...
    ```
    ```ahlcg/.github/workflows/backend.yml#L60-70
    - name: Coveralls
      uses: coverallsapp/github-action@v2
      with:
        file: ${{ github.workspace }}/backend/coveragereport/Cobertura.xml
        ...
        flag-name: 'backend'
    ```
- Frontend CI: Node latest, npm ci, lint+test, SonarCloud, Coveralls
  - Evidence:
    ```ahlcg/.github/workflows/frontend.yml#L17-31
    uses: actions/setup-node@v4
    with:
      node-version: latest
      cache: 'npm'
      cache-dependency-path: 'frontend/package-lock.json'
    - run: npm ci --force
    - run: npm run ci:all
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
- Visual regression (Chromatic)
  - Evidence:
    ```ahlcg/.github/workflows/chromatic.yml#L27-49
    - name: Build storybook
      run: npm run build-storybook
    - name: Run Chromatic
      uses: chromaui/action@latest
      with:
        projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        onlyChanged: true
        externals: public/assets/(fonts|images)/**
        workingDir: 'frontend'
        storybookBuildDir: 'storybook-static'
    ```

## Security and Secrets (high-level tech)

- Secrets in CI: `SONAR_TOKEN`, `CHROMATIC_PROJECT_TOKEN`
  - Evidence:
    ```ahlcg/.github/workflows/backend.yml#L35-41
    dotnet sonarscanner begin ... /d:sonar.token="${{ secrets.SONAR_TOKEN }}"
    ```
    ```ahlcg/.github/workflows/chromatic.yml#L41-49
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    ```
- INFERENCE: Frontend Bugsnag API keys are hardcoded and should be externalized via environment configs for production. Certainty: high.
  - Evidence:
    ```ahlcg/frontend/src/app/app.config.ts#L15-22
    Bugsnag.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
    BugsnagPerformance.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
    ```

## Summary

- Backend: ASP.NET Core Minimal APIs + Identity + EF Core (Postgres), SignalR, OpenTelemetry, health checks; orchestrated locally with .NET Aspire.
- Frontend: Angular 20 + strict TypeScript, `@ngrx/signals` store, arktype validation, RFC6902 patches with GSAP Flip animations, Transloco i18n, Storybook/Chromatic, ESLint/Stylelint/Prettier.
- CI: GitHub Actions with path filters; SonarCloud and Coveralls integrated.
- Notable concerns: Move Bugsnag keys to secrets; define production deployment strategy (Docker/IaC); implement CORS/cookie settings for cross-origin scenarios.