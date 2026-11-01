# Ahlcg frontend

Angular 22 SPA. Start at [the documentation index](../docs/README.md) and read [frontend conventions](../docs/frontend/frontend-conventions.md) before changing code.

See [development workflow](../docs/practice/workflow.md) for prerequisites and commands, and [testing](../docs/practice/testing.md) for Vitest, Storybook/Chromium and Chromatic coverage. The existing end-to-end suite lives in [`e2e/`](../e2e/), uses Playwright with Aspire, and runs with `npm test` from that directory.

Run the full app through AppHost for API and SignalR connectivity. `npm start` from this directory starts only the frontend; it does not supply the API proxy target.
