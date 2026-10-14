import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { routeExamples } from './routes';

// Automated accessibility scan of every route in its settled state. Serious and critical
// violations fail the run; lesser findings are attached to the report for review.
for (const route of routeExamples) {
  test(`${route.name} has no serious accessibility violations`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'scanned once, at desktop width');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route.path);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    await info.attach('axe-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
    expect(
      blocking.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
    ).toEqual([]);
  });
}
