import { expect, test } from '@playwright/test';

test('ai evaluation console requires authentication', async ({ page }) => {
  await page.goto('/administration/evaluation');
  await expect(page).toHaveURL(/\/login$/);
});

test('login page stays reachable while evaluation routes are guarded', async ({ page }) => {
  await page.goto('/administration/evaluation');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter platform' })).toBeVisible();
});
