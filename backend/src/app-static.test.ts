import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';

let distDir: string;
const originalFrontendDist = process.env.FRONTEND_DIST;

beforeEach(() => {
  distDir = mkdtempSync(join(tmpdir(), 'nba-frontend-'));
  writeFileSync(
    join(distDir, 'index.html'),
    '<!doctype html><title>NBA Performance Explorer</title><div id="root"></div>',
  );
  mkdirSync(join(distDir, 'assets'));
  writeFileSync(join(distDir, 'assets', 'app.js'), 'console.log("app");');
});

afterEach(() => {
  if (originalFrontendDist === undefined) {
    delete process.env.FRONTEND_DIST;
  } else {
    process.env.FRONTEND_DIST = originalFrontendDist;
  }
  rmSync(distDir, { recursive: true, force: true });
});

describe('frontend static serving', () => {
  it('serves index.html at the root when FRONTEND_DIST is set', async () => {
    process.env.FRONTEND_DIST = distDir;

    const response = await request(createApp()).get('/').expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('NBA Performance Explorer');
  });

  it('serves built static assets', async () => {
    process.env.FRONTEND_DIST = distDir;

    const response = await request(createApp()).get('/assets/app.js').expect(200);

    expect(response.text).toContain('console.log');
  });

  it('returns index.html for an unknown client route (SPA fallback)', async () => {
    process.env.FRONTEND_DIST = distDir;

    const response = await request(createApp()).get('/players/2544').expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('NBA Performance Explorer');
  });

  it('does not intercept API routes', async () => {
    process.env.FRONTEND_DIST = distDir;
    const app = createApp();

    await request(app).get('/api/health').expect(200);

    // An unknown API route still returns the structured 404, never the SPA index.html.
    const notFound = await request(app).get('/api/unknown').expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
  });

  it('leaves the app API-only when FRONTEND_DIST is unset', async () => {
    delete process.env.FRONTEND_DIST;

    const notFound = await request(createApp()).get('/').expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
  });

  it('throws at startup when FRONTEND_DIST points to a missing build', () => {
    process.env.FRONTEND_DIST = join(distDir, 'does-not-exist');

    expect(() => createApp()).toThrow(/FRONTEND_DIST/);
  });
});
