/* global document, window, getComputedStyle */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Use before or after.');
const output = 'docs/visual-polish/screenshots/home-micro-polish';
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
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${output}/${phase}-home-${width}.png` });
  const inspect = () =>
    page.evaluate(() => {
      const surface = (el, pseudo) => {
        const c = getComputedStyle(el, pseudo);
        return {
          background: c.backgroundColor,
          image: c.backgroundImage,
          opacity: c.opacity,
          backdrop: c.backdropFilter,
          shadow: c.boxShadow,
          content: c.content,
        };
      };
      const hero = document.querySelector('.homehero__search');
      const input = hero.querySelector('input');
      const wrap = hero.querySelector('.searchfield-wrap');
      const layers = [hero, input.parentElement.parentElement, wrap, input].map(
        (el) => ({
          class: el.className,
          ...surface(el),
          before: surface(el, '::before'),
          after: surface(el, '::after'),
        }),
      );
      const photo = document.querySelector('.homehero__photo');
      const img = photo.querySelector('img');
      return {
        layers,
        photo: {
          bounds: photo.getBoundingClientRect().toJSON(),
          mask: getComputedStyle(photo).maskImage,
          imageBounds: img.getBoundingClientRect().toJSON(),
          fit: getComputedStyle(img).objectFit,
          position: getComputedStyle(img).objectPosition,
          source: img.currentSrc,
          natural: [img.naturalWidth, img.naturalHeight],
        },
        headline: getComputedStyle(document.querySelector('.homehero__line')).fontSize,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
  const idle = await inspect();
  await page.getByRole('combobox', { name: 'Search NBA players' }).focus();
  await page.waitForTimeout(200);
  await page
    .locator('.homehero__search')
    .screenshot({ path: `${output}/${phase}-search-focus-${width}.png` });
  const focus = await inspect();
  records.push({ width, height, errors, idle, focus });
  await page.close();
}
await browser.close();
await writeFile(
  `${output}/${phase}-checks.json`,
  JSON.stringify(records, null, 2) + '\n',
);
console.log(`Captured ${phase} homepage and computed layers at four sizes.`);
