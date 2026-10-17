/* global document, window, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const output =
  process.env.LIQUID_PHYSICS_EVIDENCE_DIR ??
  'docs/visual-polish/screenshots/liquid-physics-3';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
const records = [];
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
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${output}/home-${width}.png` });
  const section = page.locator('.homecmp');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('.homecmp img')].map((img) => img.decode()),
    ),
  );
  await section.screenshot({ path: `${output}/rest-comparison-${width}.png` });
  records.push({
    width,
    height,
    errors,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    rest: await page.locator('.homecmp__vs').evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        width: c.width,
        height: c.height,
        background: c.backgroundColor,
        color: c.color,
        shadow: c.boxShadow,
        canvasOpacity: getComputedStyle(el.querySelector('canvas')).opacity,
      };
    }),
  });
  await page.close();
}
await browser.close();
await writeFile(`${output}/rest-checks.json`, JSON.stringify(records, null, 2) + '\n');
console.log('Captured unchanged home/resting comparison at all four widths.');
