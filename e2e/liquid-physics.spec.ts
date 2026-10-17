import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const output =
  process.env.LIQUID_PHYSICS_EVIDENCE_DIR ??
  'docs/visual-polish/screenshots/liquid-physics-3';
mkdirSync(output, { recursive: true });
type Stroke = {
  speed: number;
  y?: number;
  angle?: number;
  segments?: number;
  captureContact?: string;
};

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const ball = page.locator('.homecmp__vs');
  await ball.scrollIntoViewIfNeeded();
  await expect(ball).toHaveAttribute('data-liquid', 'ready');
  await page.waitForTimeout(900);
  return ball;
}

async function stroke(
  page: Page,
  { speed, y = 0, angle = 0, segments = 8, captureContact }: Stroke,
) {
  const box = (await page.locator('.homecmp__vs').boundingBox())!;
  const cx = box.x + 44,
    cy = box.y + 44;
  const point = (x: number) => ({
    x: cx + x * Math.cos(angle) - y * Math.sin(angle),
    y: cy + x * Math.sin(angle) + y * Math.cos(angle),
  });
  const start = point(-95),
    end = point(95);
  // Route outside the disk before starting: repositioning must not add a hidden swipe.
  const current = await page.evaluate(
    () => (window as unknown as { liquidMouse?: { x: number; y: number } }).liquidMouse,
  );
  if (current) {
    const vx = current.x - cx,
      vy = current.y - cy,
      scale = 135 / Math.max(1, Math.hypot(vx, vy));
    await page.mouse.move(cx + vx * scale, cy + vy * scale);
    // A perimeter arc uses short chords safely beyond the original radius.
    const from = Math.atan2(vy, vx),
      to = Math.atan2(start.y - cy, start.x - cx);
    let delta = to - from;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    for (let i = 1; i <= 8; i++)
      await page.mouse.move(
        cx + 135 * Math.cos(from + (delta * i) / 8),
        cy + 135 * Math.sin(from + (delta * i) / 8),
      );
  } else await page.mouse.move(cx - 135, cy - 135);
  await page.mouse.move(start.x, start.y);
  const begin = Date.now();
  for (let i = 1; i <= segments; i++) {
    await page.waitForTimeout((190 / segments / speed) * 1000);
    const p = point(-95 + (190 * i) / segments);
    await page.mouse.move(p.x, p.y);
    if (captureContact && i === Math.ceil(segments / 2))
      await page.screenshot({
        path: `${output}/${captureContact}-contact.png`,
        clip: { x: cx - 104, y: cy - 104, width: 208, height: 208 },
      });
  }
  await page.evaluate((p) => {
    Object.assign(window, { liquidMouse: p });
  }, end);
  return {
    requestedSpeed: speed,
    wallSpeed: 190 / ((Date.now() - begin) / 1000),
    segments,
  };
}

async function totals(page: Page) {
  return page.locator('.homecmp__vs').evaluate((el) => ({
    count: Number((el as HTMLElement).dataset.emitted),
    mass: Number((el as HTMLElement).dataset.emittedMass),
  }));
}
function histogram(values: number[]) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort((a, b) => a - b)
      .map((n) => [n, values.filter((v) => v === n).length]),
  );
}
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

test('organic liquid has varied actual mouse outcomes across twenty slow, medium and fast trials', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'touch preserves the static circle');
  test.setTimeout(360_000);
  const ball = await prepare(page);
  const groups: Record<string, { count: number; mass: number; wallSpeed: number }[]> =
    {};
  for (const [name, speed, segments] of [
    ['slow', 220, 8],
    ['medium', 650, 8],
    ['fast', 1500, 1],
  ] as const) {
    const results = [];
    for (let i = 0; i < 20; i++) {
      await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6500 });
      const before = await totals(page);
      const measurement = await stroke(page, { speed, segments });
      if (name === 'fast' && i < 3) {
        const box = (await ball.boundingBox())!;
        for (let frame = 0; frame < 2; frame++) {
          await page.waitForTimeout(frame ? 60 : 18);
          await page.screenshot({
            path: `${output}/fast-trial-${i + 1}-${frame}.png`,
            clip: { x: box.x - 60, y: box.y - 60, width: 208, height: 208 },
          });
        }
      }
      await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6500 });
      const after = await totals(page);
      results.push({
        count: after.count - before.count,
        mass: +(after.mass - before.mass).toFixed(3),
        wallSpeed: +measurement.wallSpeed.toFixed(1),
      });
    }
    groups[name] = results;
  }
  const summary = Object.fromEntries(
    Object.entries(groups).map(([name, rows]) => [
      name,
      {
        counts: rows.map((r) => r.count),
        histogram: histogram(rows.map((r) => r.count)),
        meanCount: mean(rows.map((r) => r.count)),
        meanMass: mean(rows.map((r) => r.mass)),
        meanWallSpeed: mean(rows.map((r) => r.wallSpeed)),
      },
    ]),
  );
  writeFileSync(
    `${output}/browser-trials.json`,
    JSON.stringify(
      {
        trialsPerGroup: 20,
        source:
          'Unseeded production model; actual Playwright mouse events; total new detachments including zeros.',
        summary,
        groups,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Actual liquid trials:', JSON.stringify(summary));
  expect(new Set(groups.fast!.map((r) => r.count)).size).toBeGreaterThan(2);
  expect(groups.slow!.some((r) => r.count > 0)).toBe(true);
  expect(mean(groups.fast!.map((r) => r.mass))).toBeGreaterThan(
    mean(groups.slow!.map((r) => r.mass)) * 2,
  );
  expect(mean(groups.medium!.map((r) => r.mass))).toBeGreaterThan(
    mean(groups.slow!.map((r) => r.mass)),
  );
});

test('organic liquid visibly pinches off, varies by trajectory, recovers and keeps its layout', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'touch preserves the static circle');
  test.setTimeout(120_000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `${output}/video`, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ball = await prepare(page);
  const box = (await ball.boundingBox())!;
  const clip = { x: box.x - 60, y: box.y - 60, width: 208, height: 208 };
  const positions = await page
    .locator('.homecmp__vs-label,.homecmp__title,.homecmp__photo')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  await page.screenshot({ path: `${output}/00-rest.png`, clip });
  const scenarios: [string, Stroke][] = [
    ['very-slow', { speed: 40, captureContact: 'very-slow' }],
    ['gentle', { speed: 100, captureContact: 'gentle' }],
    ['slow', { speed: 220 }],
    ['medium', { speed: 650 }],
    ['fast-horizontal', { speed: 1500, segments: 1 }],
    ['fast-vertical', { speed: 1500, angle: Math.PI / 2, segments: 1 }],
    ['fast-diagonal', { speed: 1500, angle: Math.PI / 4, segments: 1 }],
    ['fast-edge', { speed: 1500, y: 38, segments: 1 }],
    ['fast-variation', { speed: 1500, segments: 1 }],
  ];
  const records = [];
  for (const [name, input] of scenarios) {
    await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6500 });
    const before = await totals(page);
    const actual = await stroke(page, input);
    for (let frame = 0; frame < 4; frame++) {
      await page.waitForTimeout(frame ? 55 : 12);
      await page.screenshot({ path: `${output}/${name}-${frame}.png`, clip });
    }
    await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6500 });
    const after = await totals(page);
    records.push({
      name,
      ...actual,
      count: after.count - before.count,
      mass: after.mass - before.mass,
    });
  }
  const cpu = await context.newCDPSession(page);
  await cpu.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    const state = { draws: 0, intervals: [] as number[], last: 0, recording: true };
    Object.assign(window, { liquid3Probe: state });
    const ctx = document
      .querySelector<HTMLCanvasElement>('.homecmp__liquid')!
      .getContext('2d')!;
    const clear = ctx.clearRect.bind(ctx);
    ctx.clearRect = (...args) => {
      state.draws++;
      clear(...args);
    };
    const sample = (t: number) => {
      if (state.last) state.intervals.push(t - state.last);
      state.last = t;
      if (state.recording) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const before = await totals(page);
  for (let i = 0; i < 6; i++)
    await stroke(page, { speed: 1500, segments: 1, angle: i % 2 ? Math.PI / 4 : 0 });
  for (let frame = 0; frame < 4; frame++) {
    await page.waitForTimeout(45);
    await page.screenshot({ path: `${output}/repeated-${frame}.png`, clip });
    expect(Number(await ball.getAttribute('data-droplets'))).toBeLessThanOrEqual(16);
  }
  await expect(ball).toHaveAttribute('data-active', 'false', { timeout: 6500 });
  const after = await totals(page);
  records.push({
    name: 'repeated-during-recovery',
    count: after.count - before.count,
    mass: after.mass - before.mass,
  });
  await page.screenshot({ path: `${output}/99-recovered.png`, clip });
  expect(
    await page
      .locator('.homecmp__vs-label,.homecmp__title,.homecmp__photo')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON())),
  ).toEqual(positions);
  const performance = await page.evaluate(() => {
    const probe = (
      window as unknown as {
        liquid3Probe: { draws: number; intervals: number[]; recording: boolean };
      }
    ).liquid3Probe;
    probe.recording = false;
    const values = probe.intervals.sort((a, b) => a - b);
    return {
      draws: probe.draws,
      frames: values.length,
      medianMs: values[Math.floor(values.length * 0.5)],
      p95Ms: values[Math.floor(values.length * 0.95)],
    };
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { liquid3Probe: { draws: number } }).liquid3Probe.draws,
    ),
  ).toBe(performance.draws);
  expect(errors).toEqual([]);
  const video = page.video()!;
  await context.close();
  await video.saveAs(`${output}/interaction.webm`);
  writeFileSync(
    `${output}/motion-checks.json`,
    JSON.stringify(
      {
        viewport: { width: 1440, height: 900 },
        clip,
        records,
        cpuThrottle: 4,
        performance,
        idleDrawsStable: true,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
});
