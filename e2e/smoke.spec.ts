import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { routeExamples } from './routes';

// Structural smoke checks for every route at desktop and phone width: one page heading, one main
// landmark, no horizontal page overflow and no uncaught script errors. A full-page capture of the
// settled (reduced-motion) state is written to e2e/.artifacts for visual review.
for (const route of routeExamples) {
  test(`${route.name} renders a complete page`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route.path);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
    expect(errors, 'uncaught page errors').toEqual([]);

    const dir = `e2e/.artifacts/screens/${info.project.name}`;
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/${route.name}.png`, fullPage: true });
  });
}
