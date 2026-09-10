import { test as base } from '@playwright/test';

/**
 * `playwright.config.ts` is evaluated before `global-setup.ts` runs, so a `use.baseURL` literal
 * there would read `E2E_BASE_URL` before the AppHost has assigned it. Resolving it here instead
 * defers the read to fixture setup, which happens per worker after global setup has completed.
 */
export const test = base.extend({
  baseURL: async ({}, use) => {
    await use(process.env['E2E_BASE_URL']);
  },
});

export { expect } from '@playwright/test';
