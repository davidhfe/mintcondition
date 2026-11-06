import { expect, type Page } from '@playwright/test';
import path from 'node:path';

export async function boot(page: Page, opts: { clear?: boolean } = {}) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript({ path: path.join(import.meta.dirname, 'bot.js') });
  if (opts.clear) await page.addInitScript(() => {
    if (!sessionStorage.getItem('__cleared')) {
      localStorage.clear();
      sessionStorage.setItem('__cleared', '1');
    }
  });
  await page.goto('/');
  await expect(page.locator('.title-menu')).toBeVisible();
  return errors;
}

export async function startBot(page: Page, skill = 0.85) {
  await page.evaluate((s) => {
    const b = (window as unknown as { __bot: { on: boolean; skill: number } }).__bot;
    b.skill = s;
    b.on = true;
  }, skill);
}
