import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { LeagueService } from './league-service.js';
import { LeagueRecords } from './league-records.js';
import { LeagueHonours } from './league-honours.js';
import {
  DerivedLeagueCache,
  derivedRecordQueries,
  loadDerivedLeagueCache,
} from './league-derived-cache.js';

const service = new LeagueService();
const fingerprint = 'a'.repeat(64);
const record = new LeagueRecords(service).records({
  scope: 'regular-season',
  kind: 'season',
  category: 'points',
  mode: 'totals',
});
const honours = new LeagueHonours(service).honours();
// Contract-valid fixture copies exercise query coverage and routing. The production build
// separately compares all 72 real serialized results with the unchanged original calculators.
const payload = () => ({
  version: 1,
  inputFingerprint: fingerprint,
  honours,
  records: derivedRecordQueries.map((query) => ({ ...record, query })),
});
const temporary: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  for (const dir of temporary.splice(0)) {
    if (
      dirname(resolve(dir)) !== resolve(tmpdir()) ||
      !basename(dir).startsWith('nba-derived-cache-')
    )
      throw new Error('Refusing cleanup outside the test temporary directory.');
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('built league research cache', () => {
  it('serves records and honours without invoking the expensive archive scans', async () => {
    const cache = new DerivedLeagueCache(payload(), fingerprint);
    vi.spyOn(LeagueRecords.prototype, 'recordsWhenReady').mockRejectedValue(
      new Error('scan must not run'),
    );
    vi.spyOn(LeagueHonours.prototype, 'honours').mockImplementation(() => {
      throw new Error('scan must not run');
    });
    const app = createApp(undefined, {
      leagueService: service,
      leagueDerivedCache: cache,
    });
    const records = await request(app).get(
      '/api/league/records?category=steals&scope=playoffs',
    );
    expect(records.status).toBe(200);
    expect(records.body.query).toMatchObject({ category: 'steals', scope: 'playoffs' });
    expect((await request(app).get('/api/league/honours')).status).toBe(200);
    expect(LeagueRecords.prototype.recordsWhenReady).not.toHaveBeenCalled();
    expect(LeagueHonours.prototype.honours).not.toHaveBeenCalled();
  });

  it('refreshes servedAt while preserving source retrieval dates and results', () => {
    const input = payload();
    const cache = new DerivedLeagueCache(input, fingerprint);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const result = cache.records(derivedRecordQueries[0]!);
    expect(result.provenance.servedAt).toBe('2030-01-01T00:00:00.000Z');
    expect(result.records).toEqual(record.records);
    expect(result.provenance.retrievedAt).toBe(record.provenance.retrievedAt);
  });

  it('rejects stale inputs, missing query variants and duplicate variants', () => {
    const input = payload();
    expect(() => new DerivedLeagueCache(input, 'b'.repeat(64))).toThrow(
      'source and algorithms',
    );
    expect(
      () =>
        new DerivedLeagueCache(
          { ...input, records: input.records.slice(1) },
          fingerprint,
        ),
    ).toThrow();
    const duplicate = [...input.records];
    duplicate[1] = duplicate[0]!;
    expect(
      () => new DerivedLeagueCache({ ...input, records: duplicate }, fingerprint),
    ).toThrow('every supported record query');
  });

  it('rejects corrupted serialized bytes before accepting any cached result', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nba-derived-cache-'));
    temporary.push(dir);
    const file = pathToFileURL(join(dir, 'derived.json'));
    const bytes = JSON.stringify(payload());
    writeFileSync(file, bytes);
    writeFileSync(
      new URL(`${file.href}.sha256`),
      createHash('sha256').update(bytes).digest('hex'),
    );
    expect(
      loadDerivedLeagueCache(file, fingerprint)?.honours().champions.length,
    ).toBeGreaterThan(0);
    writeFileSync(file, bytes + ' ');
    expect(() => loadDerivedLeagueCache(file, fingerprint)).toThrow('recorded digest');
  });

  it('keeps query validation on cached routes', async () => {
    const app = createApp(undefined, {
      leagueService: service,
      leagueDerivedCache: new DerivedLeagueCache(payload(), fingerprint),
    });
    expect(
      (await request(app).get('/api/league/records?category=unsupported')).status,
    ).toBe(400);
    expect((await request(app).get('/api/league/honours?anything=1')).status).toBe(400);
  });
});
