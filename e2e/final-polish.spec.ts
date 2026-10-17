import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const evidence =
  process.env.POLISH_EVIDENCE_DIR ?? 'docs/visual-polish/screenshots/final';
mkdirSync(evidence, { recursive: true });

test('polished search keeps shortcuts, Escape, keyboard selection and focus', async ({
  page,
}, info) => {
  await page.goto('/');
  const search = page.getByRole('dialog', { name: 'Search', exact: true });
  await page.locator('.mast__search').click();
  await expect(search).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toBeHidden();
  for (const shortcut of ['/', 'Control+k', 'Meta+k']) {
    await page.keyboard.press(shortcut);
    await expect(search).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
  }
  const input = page.getByRole('combobox', { name: 'Search NBA players' });
  await expect(input).toHaveAttribute('placeholder', 'Search by player name');
  const heroField = page.locator('.homehero__search .searchfield-wrap');
  expect(await heroField.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgba(14, 14, 16, 0.36)',
  );
  await input.focus();
  await expect(input).toBeFocused();
  await expect
    .poll(() => heroField.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe('rgba(14, 14, 16, 0.5)');
  await input.fill('LeBron');
  await expect(page.getByRole('option', { name: /LeBron James/ })).toBeVisible();
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /2544/);
  await page.screenshot({
    path: `${evidence}/after-search-focus-${info.project.name}.png`,
  });
  await input.press('Enter');
  await expect(page).toHaveURL(/\/players\/2544$/);
});

test('all thirty directory marks have their own space above team identity', async ({
  page,
}) => {
  await page.goto('/teams');
  await expect(page.locator('.teamwall__logo')).toHaveCount(30);
  // Exercise native lazy loading all the way down the directory on a phone, too.
  for (const logo of await page.locator('.teamwall__logo').all()) {
    await logo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        logo.evaluate(
          (img) =>
            (img as HTMLImageElement).complete &&
            (img as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  const cards = await page.locator('.teamwall__plate').evaluateAll((cards) =>
    cards.map((card) => {
      const img = card.querySelector('img')!,
        logo = img.getBoundingClientRect(),
        abbr = card.querySelector('b')!.getBoundingClientRect();
      return {
        name: card.getAttribute('aria-label'),
        width: logo.width,
        height: logo.height,
        cardHeight: card.getBoundingClientRect().height,
        loaded: img.complete && img.naturalWidth > 0,
        clear: logo.bottom <= abbr.top + 1,
        fit: getComputedStyle(img).objectFit,
      };
    }),
  );
  expect(
    cards.every(
      (c) =>
        c.width === 62 && c.height === 62 && c.loaded && c.clear && c.fit === 'contain',
    ),
    JSON.stringify(cards),
  ).toBe(true);
  expect(new Set(cards.map((c) => c.cardHeight)).size).toBe(1);
});

test('the three editorial headers retain images without visible captions', async ({
  page,
}) => {
  for (const [route, selector] of [
    ['/games', '.gameshot'],
    ['/history', '.histshot'],
    ['/compare', '.cmpshot'],
  ]) {
    await page.goto(route);
    await expect(page.locator(`${selector} img`)).toBeVisible();
    await expect(page.locator(`${selector} img`)).toHaveAttribute('alt', /.+/);
    await expect(page.getByText(/Pictured:/)).toHaveCount(0);
  }
  await page.getByRole('combobox', { name: 'Search for Player A' }).fill('LeBron');
  await expect(page.getByRole('option', { name: /LeBron James/ })).toBeVisible();
});

test('no-photo hero is compact while a mapped photograph retains its frame', async ({
  page,
}, info) => {
  await page.goto('/players/1629611');
  await expect(page.locator('.phero--plain')).toBeVisible();
  const plain = (await page.locator('.phero').boundingBox())!.height;
  await expect(page.locator('.phero__photo')).toHaveCount(0);
  await page.goto('/players/2544');
  await expect(page.locator('.phero--photo')).toBeVisible();
  const photo = (await page.locator('.phero').boundingBox())!.height;
  expect(plain).toBeLessThan(photo * (info.project.name === 'desktop' ? 0.65 : 0.8));
  const image = page.locator('.phero__photo img');
  await image.evaluate((img) => img.dispatchEvent(new Event('error')));
  await expect(page.locator('.phero--plain')).toBeVisible();
});

test('game and career disclosures show seven rows and retain keyboard expansion', async ({
  page,
}, info) => {
  // Expand only the existing, explicitly labelled DEMO fixtures for a long-table layout test.
  await page.route('**/api/players/2544/seasons/*/games', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.games = Array.from({ length: 14 }, (_, i) => ({
      ...data.games[i % data.games.length],
      id: `layout-fixture-${i}`,
      date: `2024-04-${String(20 - i).padStart(2, '0')}`,
    }));
    await route.fulfill({ response, json: data });
  });
  await page.route('**/api/players/2544/season-trends', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.seasons = Array.from({ length: 12 }, (_, i) => ({
      ...data.seasons[i % data.seasons.length],
      season: `${2010 + i}-${11 + i}`,
    }));
    await route.fulfill({ response, json: data });
  });
  await page.goto('/players/2544');
  for (const noun of ['games', 'seasons']) {
    const rollup = page.locator('.rollup').nth(noun === 'games' ? 0 : 1);
    const body = rollup.locator('tbody tr:visible');
    await expect(body).toHaveCount(7);
    const button = rollup.getByRole('button');
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await page.screenshot({
      path: `${evidence}/after-seven-${noun}-${info.project.name}.png`,
    });
    await button.press('Enter');
    await expect(body).toHaveCount(noun === 'games' ? 14 : 12);
    await button.press('Enter');
    await expect(body).toHaveCount(7);
    await expect(button).toBeFocused();
  }
});

test('liquid surface deforms with real pointer velocity, settles, pauses and falls back', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'touch uses the static surface');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const ball = page.locator('.homecmp__vs');
  await ball.scrollIntoViewIfNeeded();
  await expect(ball).toHaveAttribute('data-liquid', 'ready');
  await page.waitForTimeout(1200);
  const originalCircle = {
    width: '88px',
    height: '88px',
    background: 'rgb(185, 28, 28)',
    shadow: 'rgba(185, 28, 28, 0.32) 0px 0px 48px 0px',
    color: 'rgb(255, 255, 255)',
    canvasOpacity: '0',
  };
  async function restingStyle() {
    return ball.evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        width: css.width,
        height: css.height,
        background: css.backgroundColor,
        shadow: css.boxShadow,
        color: css.color,
        canvasOpacity: getComputedStyle(el.querySelector('canvas')!).opacity,
      };
    });
  }
  expect(await restingStyle()).toEqual(originalCircle);
  const stationary = page.locator(
    '.homecmp__vs-label, .homecmp__title, .homecmp__photo img',
  );
  const positions = await stationary.evaluateAll((elements) =>
    elements.map((el) => el.getBoundingClientRect().toJSON()),
  );
  await page
    .locator('.homecmp__liquid')
    .screenshot({ path: `${evidence}/after-liquid-rest.png` });
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.homecmp__liquid')!;
    const ctx = canvas.getContext('2d')!;
    const base = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const measure = { peak: 0, draws: 0, baseline: Array.from(base) };
    Object.assign(window, { liquidMeasure: measure });
    const clear = ctx.clearRect.bind(ctx);
    ctx.clearRect = (...args) => {
      measure.draws++;
      return clear(...args);
    };
  });
  const bounds = (await ball.boundingBox())!,
    cx = bounds.x + 44,
    cy = bounds.y + 44;
  async function sample() {
    return page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('.homecmp__liquid')!;
      const data = canvas
        .getContext('2d')!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      const m = (
        window as unknown as { liquidMeasure: { baseline: number[]; draws: number } }
      ).liquidMeasure;
      let difference = 0;
      for (let i = 3; i < data.length; i += 4)
        difference += Math.abs(data[i]! - m.baseline[i]!);
      return { difference, draws: m.draws };
    });
  }
  await page.mouse.move(cx - 75, cy);
  let slow = 0;
  for (let x = -65; x <= 65; x += 10) {
    await page.mouse.move(cx + x, cy);
    await page.waitForTimeout(75);
    slow = Math.max(slow, (await sample()).difference);
  }
  await page
    .locator('.homecmp__liquid')
    .screenshot({ path: `${evidence}/after-liquid-slow.png` });
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  await page.mouse.move(cx - 75, cy);
  await page.waitForTimeout(1000);
  await page.mouse.move(cx + 65, cy, { steps: 2 });
  await page.waitForTimeout(65);
  const fast = (await sample()).difference;
  expect(fast).toBeGreaterThan(slow * 1.35);
  expect(
    await stationary.evaluateAll((elements) =>
      elements.map((el) => el.getBoundingClientRect().toJSON()),
    ),
  ).toEqual(positions);
  await page
    .locator('.homecmp__liquid')
    .screenshot({ path: `${evidence}/after-liquid-fast.png` });
  await page
    .locator('.homecmp__copy')
    .screenshot({ path: `${evidence}/after-liquid-swipe.png` });
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  expect(await restingStyle()).toEqual(originalCircle);
  const idle = await sample();
  await page.waitForTimeout(200);
  expect((await sample()).draws).toBe(idle.draws);
  await page.mouse.move(cx - 150, cy);
  await page.mouse.move(cx + 150, cy);
  await expect(ball).toHaveAttribute('data-active', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(ball).toHaveAttribute('data-active', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ball).not.toHaveAttribute('data-liquid', 'ready');
  expect(await restingStyle()).toEqual(originalCircle);
  await ball.scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: 'Compare two players', exact: true }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await info.attach('liquid-measurements', {
    body: JSON.stringify({ slow, fast, idleDraws: idle.draws }),
    contentType: 'application/json',
  });
  console.log(
    `Liquid surface: slow pixel disturbance ${slow}; fast ${fast}; idle rendering stopped.`,
  );
});

test('brand and confirmed service status provide visible feedback', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const brand = page.locator('.mast .brand');
  await expect(page.locator('.home-status__dot')).toBeVisible();
  const pulse = await page.locator('.home-status__dot').evaluate((dot) => ({
    core: getComputedStyle(dot).animationName,
    ring: getComputedStyle(dot, '::after').animationName,
  }));
  expect(pulse).toEqual({ core: 'home-status-glow', ring: 'home-status-ring' });
  const indicator = await page.locator('.home-status__dot').evaluate((dot) => {
    const area = getComputedStyle(dot),
      core = getComputedStyle(dot, '::before'),
      ring = getComputedStyle(dot, '::after');
    return {
      area: [area.width, area.height],
      core: [core.width, core.height, core.backgroundColor],
      ring: [ring.width, ring.height],
      duration: [area.animationDuration, ring.animationDuration],
    };
  });
  expect(indicator).toEqual({
    area: ['10px', '10px'],
    core: ['7px', '7px', 'rgb(80, 244, 147)'],
    ring: ['20px', '20px'],
    duration: ['2.8s', '2.8s'],
  });
  await brand.focus();
  await expect
    .poll(() => brand.evaluate((el) => getComputedStyle(el, '::after').transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  if (info.project.name === 'desktop') {
    await brand.hover();
    await page.screenshot({ path: `${evidence}/after-brand-status.png` });
  }
});
