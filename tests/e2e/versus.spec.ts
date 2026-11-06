import { expect, test } from '@playwright/test';
import { boot, startBot } from './helpers';

test('two players on one keyboard: pick a contest, pick toys, fight to a winner', async ({ page }) => {
  const errors = await boot(page, { clear: true });
  await page.getByText('Versus — 2 Players').click();
  await expect(page.locator('.contest-card')).toHaveCount(5);
  await page.keyboard.press('KeyD');
  await page.keyboard.press('Space'); // Wrap Battle
  await expect(page.locator('.vs-card')).toHaveCount(2);
  await page.keyboard.press('KeyD'); // P1 → Ginger Snap
  await page.keyboard.press('ArrowLeft'); // P2 moves independently
  await expect(page.locator('.rcell.p1 span')).toHaveText('Ginger Snap');
  await page.keyboard.press('Space');
  await expect(page.locator('.vs-card.side0.locked')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.plate')).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('.plate.side0 .plate-name')).toHaveText('Ginger Snap');
  await startBot(page, 0.8);
  await expect(page.locator('.postmatch')).toBeVisible({ timeout: 330_000 });
  await expect(page.locator('.pm-head')).toHaveText(/P[12] WINS/);
  expect(errors).toEqual([]);
});
