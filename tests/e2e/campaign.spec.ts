import { expect, test } from '@playwright/test';
import { boot, startBot } from './helpers';

test('story → starter → first showdown → boxed → saved', async ({ page }) => {
  const errors = await boot(page, { clear: true });
  await page.getByText('Story').click();
  await expect(page.locator('.story')).toBeVisible();
  await page.keyboard.press('Escape'); // skip the intro
  await expect(page.getByText('Pick one.')).toBeVisible();
  await page.locator('.starter-card').nth(1).click(); // Slick: FROST beats the Bakery's WARM toys
  await expect(page.locator('.zone')).toHaveCount(5);
  await expect(page.locator('.zone.locked')).toHaveCount(4);
  await page.locator('.zone').first().click();
  await expect(page.locator('.foe-card')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.plate')).toHaveCount(2, { timeout: 30_000 });
  await startBot(page, 0.95);
  await expect(page.locator('.results')).toBeVisible({ timeout: 300_000 });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mint-condition/save')!));
  expect(save.stats.battles).toBe(1);
  expect(save.shelf[0].toyId).toBe('slick');
  if (save.stats.wins === 1) expect(save.shelf).toHaveLength(2);
  await page.keyboard.press('Space');
  await expect(page.locator('.map')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Continue')).toBeVisible();
  await page.getByText('The Shelf').click();
  await expect(page.locator('.scell:not(.missing)')).toHaveCount(save.shelf.length === 2 ? 2 : 1);
  expect(errors).toEqual([]);
});
