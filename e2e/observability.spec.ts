import { expect, test } from '@playwright/test';

test('observability console requires authentication', async ({ page }) => {
  await page.goto('/administration/observability');
  await expect(page).toHaveURL(/\/login$/);
});

test('login page stays reachable while observability routes are guarded', async ({ page }) => {
  await page.goto('/administration/observability');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter platform' })).toBeVisible();
});
