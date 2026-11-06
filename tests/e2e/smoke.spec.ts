import { expect, test } from '@playwright/test';
import { boot } from './helpers';

test('title boots with a WebGL stage and no errors', async ({ page }) => {
  const errors = await boot(page, { clear: true });
  const gl = await page.evaluate(() => {
    const c = document.getElementById('stage') as HTMLCanvasElement;
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  expect(gl).toBe(true);
  await expect(page.getByText('Versus — 2 Players')).toBeVisible();
  await expect(page.getByText('Continue')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('settings persist across reloads', async ({ page }) => {
  await boot(page, { clear: true });
  await page.getByText('Settings').click();
  await page.getByRole('button', { name: 'hard' }).click();
  await page.getByLabel('Reduce flashing & shake').check();
  await page.getByText('Done').click();
  await page.reload();
  await page.getByText('Settings').click();
  await expect(page.getByRole('button', { name: 'hard' })).toHaveClass(/on/);
  await expect(page.getByLabel('Reduce flashing & shake')).toBeChecked();
});

test('a corrupt save is backed up, not fatal', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mint-condition/save', '{"v":1,"shelf":"nope"}'));
  const errors = await boot(page);
  await expect(page.getByText(/save was damaged/)).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith('mint-condition/save/corrupt-'))).toBe(true);
  expect(errors).toEqual([]);
});

test('every sound effect synthesises without throwing', async ({ page }) => {
  const errors = await boot(page, { clear: true });
  await page.mouse.click(10, 10); // user gesture unlocks the AudioContext
  const result = await page.evaluate(async () => {
    const { sfx } = (window as unknown as { __mc: { sfx: Record<string, (...a: unknown[]) => void> } }).__mc;
    const fired: string[] = [];
    for (const [name, fn] of Object.entries(sfx)) {
      fn(name === 'type' ? 'warm' : name === 'impact' ? true : name === 'hitNote' ? 2 : name === 'mash' ? 5 : undefined);
      fired.push(name);
      await new Promise((r) => setTimeout(r, 20));
    }
    for (const t of ['frost', 'pine', 'spark', 'plain']) sfx.type!(t);
    return fired.length;
  });
  expect(result).toBeGreaterThan(25);
  expect(errors).toEqual([]);
});
