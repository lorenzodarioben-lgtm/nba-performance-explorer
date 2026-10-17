import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { CoverageResponseSchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from '../recorded-archive/recorded-provider.js';
import { createShotArchiveProvider } from '../shot-archive/shot-provider.js';
import { createLineupStudyProvider } from '../lineup-study/lineup-study-provider.js';
import { archiveSnapshot } from '../wiki-archive/archive-provider.js';
import { buildCoverage } from './coverage.js';

const recorded = new RecordedArchiveProvider();
const shots = await createShotArchiveProvider();
const lineups = await createLineupStudyProvider();
const full = () =>
  buildCoverage({ recorded, shots, lineups, playerSource: 'nba-stats', archiveMode: 'live' });
const byId = (id: string) => full().datasets.find((d) => d.id === id)!;
const count = (id: string, label: string) =>
  byId(id).counts.find((c) => c.label === label)!.value;

describe('data coverage explorer', () => {
  it('measures the recorded season from the same data and reconciliation the tools use', () => {
    const d = byId('recorded-2023-24');
    expect(d.completeness).toBe('partial-scope');
    expect(count('recorded-2023-24', 'Teams')).toBe(30);
    expect(count('recorded-2023-24', 'Schedule rows')).toBe(30 * 82);
    // The documented reconciliation: 1,219 agreed finals and 11 quarantined of 1,230 games.
    expect(count('recorded-2023-24', 'Games agreed by both teams')).toBe(1219);
    expect(count('recorded-2023-24', 'Games quarantined')).toBe(11);
    const regular = recorded.dataset.snapshots.flatMap((s) => s.statistics['regular-season']);
    expect(count('recorded-2023-24', 'Regular-season player rows')).toBe(regular.length);
    const fg = d.fields.find((f) => f.field === 'fieldGoalPercentage')!;
    expect(fg).toMatchObject({
      total: regular.length,
      available: regular.filter((r) => r.fieldGoalPercentage !== null).length,
    });
    // Percentages are genuinely missing for some rows (traded players, no attempts).
    expect(fg.available).toBeLessThan(fg.total);
    expect(d.retrievedFrom! <= d.retrievedTo!).toBe(true);
    const raw = d.fields.find((f) => f.field === 'rawTotals')!;
    const rawTeams = recorded.dataset.snapshots.filter((s) =>
      s.statistics['regular-season'].some((r) => r.rawTotals !== null),
    ).length;
    expect(raw.note).toBe(
      `Published by ${rawTeams} of 30 team pages (those with totals tables); used to combine a traded player's rows only when every team page has them.`,
    );
    expect(d.source.version).toMatch(/^30 page revisions, \d+–\d+$/);
  });

  it('reports the committed playoff, league, shot and lineup copies with their real provenance', () => {
    const playoffs = byId('playoffs-2024');
    expect(playoffs).toMatchObject({ completeness: 'complete-scope', scope: 'playoffs' });
    expect(count('playoffs-2024', 'Games')).toBe(archiveSnapshot().playoffs.games.length);
    expect(count('playoffs-2024', 'Series')).toBe(15);
    expect(playoffs.source.version).toBe(
      `revision ${archiveSnapshot().playoffs.page.revision}`,
    );
    expect(playoffs.retrievedFrom).toBe(archiveSnapshot().playoffs.page.retrievedAt);
    expect(count('shots-2018', 'Field-goal attempts')).toBe(shots.shots.length);
    expect(byId('shots-2018').sourceUpdatedAt).toBe('2018-06-06T22:04:48.633Z');
    expect(count('lineups-2017-18', 'Five-player units')).toBe(lineups.data.lineups.length);
    expect(byId('lineups-2017-18').unavailable).toContain('Possessions');
    expect(count('league-2023-24', 'Standings rows')).toBe(30);
  });

  it('describes live sources from this server’s configuration and omits disabled datasets', () => {
    const bundled = buildCoverage({
      recorded: undefined,
      shots: undefined,
      lineups: undefined,
      playerSource: 'fixture',
      archiveMode: 'bundled',
    });
    expect(bundled.datasets.map((d) => d.id)).toEqual(['league-2023-24', 'playoffs-2024']);
    expect(Object.fromEntries(bundled.liveSources.map((s) => [s.id, s.mode]))).toEqual({
      'nba-stats': 'fixtures',
      wikipedia: 'not-contacted',
      wikidata: 'on-request',
    });
    expect(
      Object.fromEntries(full().liveSources.map((s) => [s.id, s.mode])),
    ).toMatchObject({ 'nba-stats': 'on-request', wikipedia: 'fallback-to-committed' });
  });

  it('serves a contract-valid summary and rejects parameters and other methods', async () => {
    const app = createApp(undefined, {
      recordedArchiveProvider: recorded,
      shotArchiveProvider: shots,
      lineupStudyProvider: lineups,
      archiveMode: 'bundled',
    });
    const ok = await request(app).get('/api/coverage');
    expect(ok.status).toBe(200);
    expect(CoverageResponseSchema.parse(ok.body).datasets).toHaveLength(5);
    expect((await request(app).get('/api/coverage?season=1946-47')).status).toBe(400);
    expect((await request(app).post('/api/coverage')).status).toBe(405);
  });
});
