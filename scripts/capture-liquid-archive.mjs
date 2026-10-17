/* global document, window, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { format } from 'prettier';

const phase = process.argv[2] ?? 'after';
const output = 'docs/visual-polish/screenshots/liquid-archive';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
const checks = [];
for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1024, 900],
  [390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const [name, route] of [
    ['home', '/'],
    ['history', '/history'],
    ['season', '/history/2023-24'],
  ]) {
    await page.goto(`http://localhost:5173${route}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    if (name === 'history' && phase !== 'before') {
      await page
        .getByRole('heading', { name: 'Season by season.', exact: true })
        .waitFor();
    } else if (name !== 'home') await page.getByRole('table').first().waitFor();
    await page.screenshot({
      path: `${output}/${phase}-${name}-${width}.png`,
      fullPage: name !== 'home',
    });
    checks.push({
      width,
      route,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      h1Count: await page.locator('h1').count(),
      errors: [...errors],
      ...(name === 'home'
        ? {
            headline: await page
              .locator('.homehero__line')
              .first()
              .evaluate((el) => getComputedStyle(el).fontSize),
            search: await page
              .locator('.homehero__search .searchfield-wrap')
              .evaluate((el) => getComputedStyle(el).backgroundColor),
          }
        : {}),
    });
    if (name === 'home') {
      const comparison = page.locator('.homecmp');
      await comparison.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.evaluate(async () =>
        Promise.all(
          [...document.querySelectorAll('.homecmp img')].map((img) => img.decode()),
        ),
      );
      await comparison.screenshot({
        path: `${output}/${phase}-comparison-${width}.png`,
      });
    }
  }
  await page.close();
}
await browser.close();
await writeFile(
  `${output}/${phase}-checks.json`,
  await format(JSON.stringify(checks), { parser: 'json' }),
);
console.log(`Saved ${phase} captures at all four widths.`);
