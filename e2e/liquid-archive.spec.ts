import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const evidence =
  process.env.LIQUID_ARCHIVE_EVIDENCE_DIR ??
  'docs/visual-polish/screenshots/liquid-archive';
mkdirSync(evidence, { recursive: true });
async function expectTransparentHero(page: Page) {
  const layers = await page.locator('.homehero__search').evaluate((hero) => {
    const input = hero.querySelector('input')!;
    const wrap = input.parentElement!;
    return [hero, wrap.parentElement!, wrap, input].flatMap((el) =>
      [null, '::before', '::after'].map((pseudo) => {
        const c = getComputedStyle(el, pseudo);
        return {
          background: c.backgroundColor,
          image: c.backgroundImage,
          opacity: c.opacity,
          backdrop: c.backdropFilter,
          shadow: c.boxShadow,
          generated: pseudo ? c.content : 'none',
        };
      }),
    );
  });
  for (const layer of layers) {
    expect(layer).toEqual({
      background: 'rgba(0, 0, 0, 0)',
      image: 'none',
      opacity: '1',
      backdrop: 'none',
      shadow: 'none',
      generated: 'none',
    });
  }
}
const baseline = JSON.parse(
  readFileSync(
    'docs/visual-polish/screenshots/liquid-archive/before-checks.json',
    'utf8',
  ),
) as {
  width: number;
  route: string;
  headline?: string;
}[];

test('home keeps the two-line headline at 97% of the approved current size', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'four explicit widths are checked once');
  for (const width of [1920, 1440, 1024, 390]) {
    await page.setViewportSize({
      width,
      height: width === 1920 ? 1080 : width === 390 ? 844 : 900,
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expectTransparentHero(page);
    await page.getByRole('combobox', { name: 'Search NBA players' }).focus();
    await expectTransparentHero(page);
    const lines = page.locator('.homehero__line');
    await expect(lines).toHaveCount(2);
    await expect(lines).toHaveText(['Read', 'the game.']);
    const font = await lines
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const before = parseFloat(
      baseline.find((row) => row.route === '/' && row.width === width)!.headline!,
    );
    expect(font / before).toBeCloseTo(0.97, 3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBe(0);
  }
});

test('transparent home search retains loading, results, contrast and keyboard selection', async ({
  page,
}, info) => {
  await page.goto('/');
  const field = page.locator('.homehero__search .searchfield-wrap');
  const input = page.getByRole('combobox', { name: 'Search NBA players' });
  await expect(input).toHaveAttribute('placeholder', 'Search by player name');
  expect(await field.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  );
  expect(await input.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expectTransparentHero(page);
  await field.hover();
  await expectTransparentHero(page);
  await field.screenshot({ path: `${evidence}/search-idle-${info.project.name}.png` });
  await input.focus();
  await expect
    .poll(() => field.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe('rgba(0, 0, 0, 0)');
  await expectTransparentHero(page);
  await field.screenshot({ path: `${evidence}/search-focus-${info.project.name}.png` });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/players?*', async (route) => {
    await gate;
    await route.continue();
  });
  await input.fill('LeBron');
  await expect(page.getByText('Searching players...')).toBeVisible();
  await expectTransparentHero(page);
  await page
    .locator('.homehero__search')
    .screenshot({ path: `${evidence}/search-loading-${info.project.name}.png` });
  release();
  await expect(page.getByRole('option', { name: /LeBron James/ })).toBeVisible();
  const resultSurface = await page
    .getByRole('listbox')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(resultSurface).toBe('rgb(17, 17, 20)');
  await expectTransparentHero(page);
  await input.press('ArrowDown');
  await page
    .locator('.homehero__search')
    .screenshot({ path: `${evidence}/search-results-${info.project.name}.png` });
  await input.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await input.fill('LeBron ');
  await expect(page.getByRole('option', { name: /LeBron James/ })).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/players\/2544$/);
});

test('transparent hero search preserves empty and error feedback', async ({
  page,
}, info) => {
  await page.route('**/api/players?*', async (route) => {
    const search = new URL(route.request().url()).searchParams.get('search');
    await route.fulfill({
      status: search === 'failure' ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        search === 'failure' ? { error: { message: 'Unavailable' } } : { players: [] },
      ),
    });
  });
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Search NBA players' });
  await input.fill('no-match');
  await expect(page.getByText('No players found.')).toBeVisible();
  await expectTransparentHero(page);
  await page
    .locator('.homehero__search')
    .screenshot({ path: `${evidence}/search-empty-${info.project.name}.png` });
  await input.fill('failure');
  await expect(page.getByRole('alert')).toHaveText(
    'Player search is unavailable. Please try again.',
  );
  await expectTransparentHero(page);
  await page
    .locator('.homehero__search')
    .screenshot({ path: `${evidence}/search-error-${info.project.name}.png` });
  await input.press('Escape');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(input).toBeFocused();
});

test('hero transparency leaves navigation, directory and comparison search surfaces intact', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page
      .locator('.mast__search')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgba(255, 255, 255, 0.024)');
  await page.locator('.mast__search').click();
  expect(
    await page
      .getByRole('dialog', { name: 'Search', exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgb(17, 17, 20)');
  await page.keyboard.press('Escape');
  for (const route of ['/players', '/compare']) {
    await page.goto(route);
    const field = page.locator('.searchfield-wrap').first();
    await expect(field).toBeVisible();
    expect(
      await field.evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toContain('linear-gradient');
    await field.locator('input').focus();
    await expect
      .poll(() => field.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe('rgb(23, 23, 28)');
  }
});

test('archive filters, decade chapters, source index and season pages retain honest navigation', async ({
  page,
}, info) => {
  await page.goto('/history?from=1990&to=2005');
  const rail = page.getByRole('navigation', { name: 'Explore decades' });
  await expect(rail).toBeVisible();
  await expect(page.getByLabel('First season start year')).toHaveValue('1990');
  const nineties = rail.getByRole('button', { name: /^1990s/ });
  await nineties.focus();
  await nineties.press('Enter');
  await expect(nineties).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#timeline-chapter')).toHaveText('1990s');
  await page.getByLabel('Champion source entity').fill('wd:Q121783');
  await page.getByRole('button', { name: 'Apply historical filters' }).click();
  await expect(page).toHaveURL(/champion=wd%3AQ121783/);
  await expect(rail).toBeVisible();
  await expect(page.getByLabel('Shareable history URL')).toHaveValue(
    /champion=wd%3AQ121783/,
  );
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page).toHaveURL('/history');
  await expect(page.getByLabel('Champion source entity')).toHaveValue('');
  await expect(rail).toBeVisible();
  await rail.getByRole('button', { name: /^2020s/ }).click();
  await expect(
    page.getByRole('link', { name: /champion unavailable in source/ }).first(),
  ).toBeVisible();
  await rail.getByRole('button', { name: /^2000s/ }).click();
  await page
    .locator('.timeline__chapter')
    .screenshot({ path: `${evidence}/archive-chapter-${info.project.name}.png` });
  await page.getByRole('link', { name: 'Open the source index' }).click();
  const summary = page.locator('.archive-index summary');
  await expect(page.getByRole('table')).toBeHidden();
  await summary.focus();
  await summary.press('Enter');
  await expect(page.getByRole('table')).toBeVisible();
  const table = page.getByRole('table');
  await expect(
    table.getByRole('link', { name: /^Wikidata wd:Q/ }).first(),
  ).toHaveAttribute('href', /^https:\/\/www.wikidata.org\/wiki\/Q/);
  const box = (await summary.boundingBox())!;
  await page.screenshot({
    path: `${evidence}/archive-index-open-${info.project.name}.png`,
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: Math.min(500, page.viewportSize()!.height - box.y),
    },
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBe(0);
  await page.goto('/history/2000-01?from=1990&to=2005');
  await expect(page.locator('h1')).toHaveText('2000-01 · historical facts');
  await expect(page.locator('.histshot')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: /Previous recorded season:/ }),
  ).toHaveAttribute('href', /\?from=1990&to=2005$/);
  await expect(page.getByRole('table')).toBeVisible();
  await page.goto('/history?from=2005&to=1990');
  await expect(page.getByRole('alert')).toContainText('Invalid historical selection');
  await expect(page.locator('.timeline')).toHaveCount(0);
});

async function raster(page: Page) {
  return page.locator('.homecmp__liquid').evaluate((element) => {
    const canvas = element as HTMLCanvasElement,
      w = canvas.width,
      h = canvas.height;
    const data = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
    const visited = new Uint8Array(w * h),
      queue = new Int32Array(w * h),
      areas: number[] = [];
    const ink = (i: number) => data[i * 4 + 3]! > 170;
    for (let i = 0; i < w * h; i++) {
      if (visited[i] || !ink(i)) continue;
      let head = 0,
        tail = 1,
        area = 0;
      queue[0] = i;
      visited[i] = 1;
      while (head < tail) {
        const pixel = queue[head++]!;
        area++;
        for (const next of [pixel - 1, pixel + 1, pixel - w, pixel + w]) {
          if (next < 0 || next >= w * h || visited[next] || !ink(next)) continue;
          if (Math.abs((next % w) - (pixel % w)) > 1) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (area >= 4) areas.push(area);
    }
    areas.sort((a, b) => b - a);
    return { body: areas[0] ?? 0, detached: areas.slice(1), dpr: w / 208 };
  });
}

test('real swipes separate visible liquid droplets, stay bounded and stop at rest', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'touch keeps the original static circle');
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const ball = page.locator('.homecmp__vs');
  await ball.scrollIntoViewIfNeeded();
  await expect(ball).toHaveAttribute('data-liquid', 'ready');
  await page.waitForTimeout(1200);
  const box = (await ball.boundingBox())!,
    cx = box.x + 44,
    cy = box.y + 44;
  const clip = { x: cx - 104, y: cy - 104, width: 208, height: 208 };
  const positions = await page
    .locator('.homecmp__vs-label, .homecmp__title, .homecmp__photo')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  await page.screenshot({ path: `${evidence}/motion-00-rest.png`, clip });
  await page.mouse.move(cx - 75, cy);
  for (let x = -65; x <= 65; x += 10) {
    await page.mouse.move(cx + x, cy);
    await page.waitForTimeout(80);
    await expect(ball).toHaveAttribute('data-droplets', '0');
    if (x === -45)
      await page.screenshot({ path: `${evidence}/motion-01-gentle.png`, clip });
  }
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  for (let x = -65; x <= 65; x += 20) {
    await page.mouse.move(cx + x, cy);
    await page.waitForTimeout(45);
  }
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    const state = { draws: 0, intervals: [] as number[], last: 0, recording: true };
    Object.assign(window, { dropletProbe: state });
    const ctx = document
      .querySelector<HTMLCanvasElement>('.homecmp__liquid')!
      .getContext('2d')!;
    const clear = ctx.clearRect.bind(ctx);
    ctx.clearRect = (...args) => {
      state.draws++;
      clear(...args);
    };
    const sample = (time: number) => {
      if (state.last) state.intervals.push(time - state.last);
      state.last = time;
      if (state.recording) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.mouse.move(cx - 150, cy);
  await page.waitForTimeout(30);
  await page.mouse.move(cx + 150, cy);
  await expect
    .poll(async () => Number(await ball.getAttribute('data-droplets')))
    .toBeGreaterThan(0);
  const samples = [];
  for (let frame = 0; frame < 4; frame++) {
    await page.waitForTimeout(frame ? 50 : 25);
    samples.push(await raster(page));
    await page.screenshot({ path: `${evidence}/motion-0${frame + 2}-fast.png`, clip });
  }
  expect(
    Math.max(...samples.map((sample) => sample.detached.length)),
  ).toBeGreaterThanOrEqual(1);
  expect(
    await page
      .locator('.homecmp__vs-label, .homecmp__title, .homecmp__photo')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON())),
  ).toEqual(positions);
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  await page.mouse.move(cx - 100, cy - 100);
  await page.waitForTimeout(30);
  await page.mouse.move(cx + 100, cy + 100);
  await expect
    .poll(async () => Number(await ball.getAttribute('data-droplets')))
    .toBeGreaterThan(0);
  await page.waitForTimeout(110);
  expect((await raster(page)).detached.length).toBeGreaterThan(0);
  await page.screenshot({ path: `${evidence}/motion-06-diagonal.png`, clip });
  for (let swipe = 0; swipe < 8; swipe++) {
    await page.mouse.move(cx + (swipe % 2 ? 150 : -150), cy);
    await page.waitForTimeout(55);
    expect(Number(await ball.getAttribute('data-droplets'))).toBeLessThanOrEqual(16);
  }
  await page.mouse.move(cx + 300, cy + 200);
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6000 });
  await expect(ball).toHaveAttribute('data-droplets', '0');
  await page.screenshot({ path: `${evidence}/motion-07-recovered.png`, clip });
  const performance = await page.evaluate(() => {
    const state = (
      window as unknown as {
        dropletProbe: { draws: number; intervals: number[]; recording: boolean };
      }
    ).dropletProbe;
    state.recording = false;
    const sorted = state.intervals.sort((a, b) => a - b);
    return {
      draws: state.draws,
      frames: sorted.length,
      medianMs: sorted[Math.floor(sorted.length * 0.5)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    };
  });
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { dropletProbe: { draws: number } }).dropletProbe.draws,
    ),
  ).toBe(performance.draws);
  await cpu.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.mouse.move(cx - 150, cy);
  await page.mouse.move(cx + 150, cy);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(ball).toHaveAttribute('data-active', 'false');
  await expect(ball).toHaveAttribute('data-droplets', '0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ball).not.toHaveAttribute('data-liquid', 'ready');
  expect(await ball.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(185, 28, 28)',
  );
  writeFileSync(
    `${evidence}/motion-checks.json`,
    JSON.stringify({ cpuThrottle: 4, samples, performance }, null, 2) + '\n',
  );
});
