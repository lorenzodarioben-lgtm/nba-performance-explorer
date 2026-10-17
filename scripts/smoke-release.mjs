/* global document */
// Opt-in local release acceptance. Requires npm run build; never deploys or changes services.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import * as C from '@nba-performance-explorer/contracts';

const origin = 'http://127.0.0.1:4393';
const output = 'docs/release/evidence';
const checks = [];
let child;
let browser;
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const ended = once(child, 'exit');
  child.kill();
  await ended;
  child = undefined;
}
async function start(offline = false) {
  // Abort if this port belongs to another service. Never replace an existing listener.
  try {
    await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(500) });
    throw new Error('Release smoke port 4393 is already occupied.');
  } catch (error) {
    if (error.message === 'Release smoke port 4393 is already occupied.') throw error;
  }
  const args = offline
    ? [
        '--import',
        `data:text/javascript,${encodeURIComponent("globalThis.fetch = async () => { throw new TypeError('Controlled upstream outage'); };")}`,
      ]
    : [];
  child = spawn(process.execPath, [...args, 'backend/dist/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '4393',
      NBA_DATA_PROVIDER: 'nba-stats',
      NBA_ALLOW_FIXTURE_IN_PRODUCTION: 'false',
      NBA_STATS_TIMEOUT_MS: '10000',
      NBA_STATS_DIAGNOSTICS: 'false',
      WIKI_ARCHIVE_MODE: 'live',
      FRONTEND_DIST: resolve('frontend/dist'),
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null)
      throw new Error('Production process exited before health.');
    try {
      const r = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (r.ok) return;
    } catch {
      /* Waiting only for local startup, never retrying an upstream operation. */
    }
    await delay(250);
  }
  throw new Error('Local production startup timed out.');
}
async function check(name, run) {
  try {
    const detail = await run();
    checks.push({ name, ok: true, detail: detail ?? null });
  } catch (error) {
    // Only own assertion summaries are recorded, not response bodies or runtime env values.
    checks.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 350) : 'Failed',
    });
  }
}
async function json(path, schema, status = 200) {
  const r = await fetch(`${origin}${path}`, {
    signal: AbortSignal.timeout(20000),
    headers: { Origin: 'https://example.invalid' },
  });
  assert.equal(r.status, status, `Unexpected status for ${path}`);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal(r.headers.get('x-powered-by'), null);
  return schema.parse(await r.json());
}
try {
  await mkdir(output, { recursive: true });
  const { parsePlayerProviderConfig } =
    await import('../backend/dist/config/player-provider-config.js');
  await check('production fixture safeguards', () => {
    assert.throws(() => parsePlayerProviderConfig({ NODE_ENV: 'production' }));
    assert.throws(() =>
      parsePlayerProviderConfig({
        NODE_ENV: 'production',
        NBA_DATA_PROVIDER: 'fixture',
        NBA_ALLOW_FIXTURE_IN_PRODUCTION: 'false',
      }),
    );
  });
  await start();
  await check('production health', () => json('/api/health', C.HealthResponseSchema));
  await check('live provider selected', async () => {
    const data = await json('/api/data-sources/status', C.CapabilityResponseSchema);
    assert.equal(data.playerSource, 'nba-stats');
    return { playerSource: data.playerSource };
  });
  for (const [name, path, schema] of [
    ['live player search', '/api/players?search=LeBron', C.PlayerSearchResponseSchema],
    ['live player profile', '/api/players/2544', C.PlayerProfileResponseSchema],
    ['live career seasons', '/api/players/2544/seasons', C.PlayerSeasonsResponseSchema],
    [
      'live game log',
      '/api/players/2544/seasons/2023-24/games',
      C.PlayerGameLogResponseSchema,
    ],
    [
      'current scoreboard schedule',
      `/api/league/games?date=${new Date().toISOString().slice(0, 10)}`,
      C.LeagueGamesResponseSchema,
    ],
    [
      'historical standings',
      '/api/league/standings?season=1997-98',
      C.LeagueStandingsResponseSchema,
    ],
    [
      'historical season navigation',
      '/api/history/seasons/1999-00',
      C.HistoryResponseSchema,
    ],
  ])
    await check(name, async () => {
      const data = await json(path, schema);
      return {
        contractValid: true,
        rows:
          data.players?.length ??
          data.games?.length ??
          data.seasons?.length ??
          data.rows?.length ??
          null,
        source: data.provenance?.source ?? null,
      };
    });
  await check('unknown API stays a structured 404', () =>
    json('/api/release-no-such-route', C.ApiErrorResponseSchema, 404),
  );
  await check('SPA refresh and built assets', async () => {
    for (const path of [
      '/',
      '/players/2544',
      '/teams',
      '/compare',
      '/history',
      '/games',
      '/my-nba',
      '/.env',
    ]) {
      const r = await fetch(`${origin}${path}`);
      assert.equal(r.status, 200);
      const html = await r.text();
      assert.ok(html.toLowerCase().includes('<!doctype html>'));
      assert.ok(!html.includes('NBA_DATA_PROVIDER='));
      if (path === '/') {
        for (const asset of [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
          (m) => m[1],
        )) {
          const a = await fetch(`${origin}${asset}`);
          assert.equal(a.status, 200);
          assert.ok(!(a.headers.get('content-type') ?? '').includes('text/html'));
        }
      }
    }
  });
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ])
    await check(`production browser ${width}`, async () => {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: 'reduce',
      });
      const errors = [];
      const consoleErrors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      await page.goto(origin);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.homehero__line').count(), 2);
      assert.ok(
        await page
          .locator('.homehero__photo img')
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      );
      await page.screenshot({ path: `${output}/production-home-${width}.png` });
      await page.locator('.mast__search').click();
      const searchDialog = page.getByRole('dialog', { name: 'Search', exact: true });
      await searchDialog.waitFor();
      await page.keyboard.press('Escape');
      // Wait for modal exit/focus restoration before interacting with the page beneath it.
      await searchDialog.waitFor({ state: 'hidden' });
      assert.equal(
        await page
          .locator('.mast__search')
          .evaluate((el) => el === document.activeElement),
        true,
      );
      const input = page.getByRole('combobox', { name: 'Search NBA players' });
      await input.fill('LeBron');
      await page.getByRole('option', { name: /LeBron James/ }).waitFor();
      await input.press('ArrowDown');
      await page.screenshot({ path: `${output}/production-search-${width}.png` });
      await input.press('Enter');
      await page.waitForURL('**/players/2544');
      assert.deepEqual(errors, []);
      assert.deepEqual(consoleErrors, []);
      await page.close();
      return { pageErrors: errors, consoleErrors, livePlayerKeyboardNavigation: true };
    });
  await browser.close();
  browser = undefined;
  await stop();
  await start(true);
  await check('controlled outage stays unavailable, without fixtures', async () => {
    const data = await json(
      '/api/players?search=LeBron',
      C.ApiErrorResponseSchema,
      503,
    );
    assert.equal(data.error.code, 'PROVIDER_UNAVAILABLE');
    assert.ok(!/https?:|stack|fixture/i.test(data.error.message));
    return { status: 503, code: data.error.code, simulatedOutage: true };
  });
} finally {
  if (browser) await browser.close();
  await stop();
  const report = {
    checkedAt: new Date().toISOString(),
    localProductionOnly: true,
    configuration: {
      nodeEnv: 'production',
      provider: 'nba-stats',
      fixturesAllowed: false,
      wikiMode: 'live',
      timeoutMs: 10000,
    },
    deployed: false,
    checks,
  };
  await writeFile(
    `${output}/RELEASE_33_SMOKE.json`,
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
}
if (checks.some((c) => !c.ok)) process.exitCode = 1;
