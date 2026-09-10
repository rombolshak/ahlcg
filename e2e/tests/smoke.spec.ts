import { expect, test } from './fixtures';

test('loads the main menu from the Aspire-served frontend', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('new_game')).toBeVisible();
});

test('reaches the real API through the dev server proxy', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.text()).toBe('Healthy');
});
