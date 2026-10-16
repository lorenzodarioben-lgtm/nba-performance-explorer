/* global document, window, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { format } from 'prettier';

const phase = process.argv[2] ?? 'after';
const base = phase === 'approved' ? 'http://localhost:5174' : 'http://localhost:5173';
const output = 'docs/visual-polish/screenshots/home-refinement';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
const results = [];
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
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  if (phase !== 'approved') {
    await page.screenshot({ path: `${output}/${phase}-hero-${width}.png` });
    const input = page.getByRole('combobox', { name: 'Search NBA players' });
    const field = page.locator('.homehero__search');
    for (const state of ['empty', 'focused', 'typed', 'results']) {
      if (state === 'focused') await input.focus();
      if (state === 'typed') await input.fill('L');
      if (state === 'results') {
        await input.fill('LeBron');
        await page.getByRole('option', { name: /LeBron James/ }).waitFor();
      }
      await field.screenshot({
        path: `${output}/${phase}-search-${state}-${width}.png`,
      });
    }
    await input.fill('');
    await input.press('Escape');
    await input.blur();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.home-status__dot').waitFor();
    await page.evaluate(() => {
      for (const animation of document
        .querySelector('.home-status__dot')
        .getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 1400;
      }
    });
    const status = await page.locator('.home-status').boundingBox();
    await page.screenshot({
      path: `${output}/${phase}-status-${width}.png`,
      clip: {
        x: Math.max(0, status.x - 18),
        y: status.y - 25,
        width: Math.min(420, width - Math.max(0, status.x - 18)),
        height: 65,
      },
    });
    results.push({
      width,
      status: await page.locator('.home-status__dot').evaluate((dot) => {
        const style = getComputedStyle(dot),
          core = getComputedStyle(dot, '::before'),
          ring = getComputedStyle(dot, '::after');
        return {
          width: style.width,
          height: style.height,
          background: style.backgroundColor,
          shadow: style.boxShadow,
          animation: style.animationName,
          duration: style.animationDuration,
          core: {
            width: core.width,
            height: core.height,
            color: core.backgroundColor,
            content: core.content,
          },
          ring: {
            width: ring.width,
            height: ring.height,
            background: ring.backgroundColor,
            transform: ring.transform,
            animation: ring.animationName,
            duration: ring.animationDuration,
          },
        };
      }),
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  const section = page.locator('.homecmp');
  await section.scrollIntoViewIfNeeded();
  // Let responsive lazy images finish choosing a source after entering the viewport.
  await page.waitForTimeout(300);
  await page.evaluate(async () =>
    Promise.all(
      [...document.querySelectorAll('.homecmp img')].map((image) => image.decode()),
    ),
  );
  await section.screenshot({ path: `${output}/${phase}-comparison-${width}.png` });
  results.push({
    width,
    comparison: await section.evaluate((section) => {
      const origin = section.getBoundingClientRect();
      const selectors = [
        '.homecmp__photo:first-child img',
        '.homecmp__vs',
        '.homecmp__vs-label',
        '.homecmp__title',
        '.homecmp__lede',
        '.homecmp__cta',
        '.homecmp__photo:last-child img',
      ];
      return Object.fromEntries(
        selectors.map((selector) => {
          const element = section.querySelector(selector);
          if (!element) return [selector, null];
          const box = element.getBoundingClientRect(),
            style = getComputedStyle(element);
          return [
            selector,
            {
              x: box.x - origin.x,
              y: box.y - origin.y,
              width: box.width,
              height: box.height,
              font: style.font,
              color: style.color,
              background: style.backgroundColor,
              shadow: style.boxShadow,
            },
          ];
        }),
      );
    }),
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    errors,
  });
  if (phase === 'after' && width === 1440) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const ball = page.locator('.homecmp__vs');
    await ball.waitFor();
    await page.waitForTimeout(1200);
    const box = await ball.boundingBox();
    const cx = box.x + 44,
      cy = box.y + 44;
    // Capture without element auto-scrolling or waiting for visual stability:
    // this records an actual moving contour driven by mouse events.
    await page.mouse.move(cx - 75, cy);
    await page.waitForTimeout(800);
    await page.mouse.move(cx + 65, cy, { steps: 2 });
    await page.waitForTimeout(40);
    await page.screenshot({
      path: `${output}/after-cursor-interaction.png`,
      clip: { x: cx - 90, y: cy - 90, width: 180, height: 180 },
    });
  }
  await page.close();
}
await browser.close();
await writeFile(
  `${output}/${phase}-checks.json`,
  await format(JSON.stringify(results), { parser: 'json' }),
);
console.log(`Saved ${phase} homepage checks at four widths.`);
