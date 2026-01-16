[![Frontend CI](https://github.com/rombolshak/ahlcg/actions/workflows/frontend.yml/badge.svg?branch=main)](https://github.com/rombolshak/ahlcg/actions/workflows/frontend.yml)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=rombolshak_ahlcg&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rombolshak_ahlcg)

[![Coverage Status](https://coveralls.io/repos/github/rombolshak/ahlcg/badge.svg?branch=main)](https://coveralls.io/github/rombolshak/ahlcg?branch=main)

\

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=rombolshak_ahlcg&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=rombolshak_ahlcg)

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=rombolshak_ahlcg&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=rombolshak_ahlcg)

[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=rombolshak_ahlcg&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=rombolshak_ahlcg)

# Arkham Horror LCG

Fan made rules compliant online version of the game.

## Quickstart

Run everything locally via .NET Aspire (Postgres + Migrator + API + Frontend):
```
cd backend/Ahlcg.AppHost
dotnet restore
dotnet run
```

Run the frontend only (Angular dev server):
```
cd frontend
npm ci
npm start
```

Run the backend API only (requires a Postgres connection):
```
cd backend/Ahlcg.ApiService
dotnet restore
dotnet run
```

## Copyright Disclaimer

The information presented in this app about [Arkham Horror: The Card Game™][arkham], both textual and graphical, is © Fantasy Flight Games 2025. This app is a fan project and is not produced, endorsed, or supported by, or affiliated with Fantasy Flight Games.

All artwork and illustrations are the intellectual property of their respective creators. All Arkham Horror: The Card Game™ images and graphics are copyrighted by Fantasy Flight Games.

[arkham]: https://www.fantasyflightgames.com/en/products/arkham-horror-the-card-game/

