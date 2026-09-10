import { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { createIdentity, Identity } from './identity';

test('walks the auth lifecycle from anonymous sign-in through upgrade to a permanent account', async ({ page }) => {
  const identity = createIdentity();
  const wrongPassword = `${identity.password}wrong`;

  await page.goto('/');
  await page.getByTestId('login_to_continue').click();
  await page.getByTestId('anonymous').click();
  await openAccountView(page);
  await expect(page.getByTestId('upgrade')).toBeVisible();

  await page.getByTestId('upgrade').click();
  await submitCredentials(page, identity);
  await expect(page.getByTestId('account-user-name')).toHaveText(identity.username);
  await expect(page.getByTestId('account-email')).toHaveText(identity.email);

  await page.getByTestId('sign_out').click();
  await expect(page.getByTestId('sign_in')).toBeVisible();

  await page.getByTestId('sign_in').click();
  await submitCredentials(page, { ...identity, password: wrongPassword });
  await expect(page.getByTestId('credentials-error')).toBeVisible();

  await page.getByTestId('credentials-password').fill(identity.password);
  await page.getByTestId('credentials-submit').click();
  await expect(page.getByTestId('account-user-name')).toHaveText(identity.username);
  await expect(page.getByTestId('account-email')).toHaveText(identity.email);
});

async function openAccountView(page: Page): Promise<void> {
  await page.getByTestId('settings').click();
  await page.getByTestId('account-row').click();
}

async function submitCredentials(page: Page, identity: Identity): Promise<void> {
  await page.getByTestId('credentials-email').fill(identity.email);
  await page.getByTestId('credentials-username').fill(identity.username);
  await page.getByTestId('credentials-password').fill(identity.password);
  await page.getByTestId('credentials-submit').click();
}
