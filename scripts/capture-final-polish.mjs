import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] ?? 'after';
const output = 'docs/visual-polish/screenshots/final';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH,
});
const checks = [];
const routes = [
  ['home', '/'],
  ['teams', '/teams'],
  ['games', '/games?date=2024-06-17'],
  ['history', '/history'],
  ['compare', '/compare'],
  ['photo', '/players/2544'],
  ['no-photo', '/players/1629611'],
  ['career', '/players/2544/career'],
];
for (const [width, height] of [
  [1440, 900],
  [1920, 1080],
  [1024, 900],
  [390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [name, route] of routes) {
    await page.goto(`http://localhost:5173${route}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/${phase}-${name}-${width}.png` });
    if (name === 'teams')
      await page.screenshot({
        path: `${output}/${phase}-teams-all-${width}.png`,
        fullPage: true,
      });
    if (name === 'home') {
      await page.locator('.homecmp').scrollIntoViewIfNeeded();
      await page
        .locator('.homecmp')
        .screenshot({ path: `${output}/${phase}-liquid-${width}.png` });
    }
    checks.push({
      name,
      width,
      ...(await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        brokenImages: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.src),
        title: document.querySelector('h1')?.textContent,
        heroHeight: document.querySelector('.phero')?.getBoundingClientRect().height,
      }))),
    });
  }
  checks.push({ width, errors });
  await page.close();
}
await writeFile(`${output}/${phase}-checks.json`, JSON.stringify(checks, null, 2));
await browser.close();
console.log(JSON.stringify(checks));
