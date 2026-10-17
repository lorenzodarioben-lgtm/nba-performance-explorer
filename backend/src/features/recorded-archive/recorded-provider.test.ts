import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { ArchiveRankingQuerySchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider, rankRecordedDataset } from './recorded-provider.js';
const provider = new RecordedArchiveProvider();
describe('genuine licensed recorded archive', () => {
  it('retains30 source revisions/82 games each and explicit incomplete participant coverage', () => {
    expect(provider.dataset.kind).toBe('genuine-recorded-wikipedia-data');
    expect(provider.dataset.snapshots).toHaveLength(30);
    expect(
      provider.dataset.snapshots.every(
        (s) => s.results.length === 82 && s.attribution.license === 'CC BY-SA 4.0',
      ),
    ).toBe(true);
    const result = provider.rank(ArchiveRankingQuerySchema.parse({}));
    expect(result.sourceRows).toBe(639);
    expect(result.sourceTeams).toBe(29);
    expect(result.unknownScopeRows).toBe(18);
    expect(result.missingIdentityRows).toBe(17);
    expect(result.rows[0]).toMatchObject({
      playerId: '203954',
      gamesPlayed: 39,
      value: 34.7,
    });
  });
  it('qualifies before ranking and preserves the ranking population through search/team/page filters', () => {
    const base = ArchiveRankingQuerySchema.parse({ minGames: '60' }),
      all = provider.rank(base),
      filtered = provider.rank({ ...base, search: 'Stephen Curry' });
    expect(all.rows.some((r) => r.playerId === '203954')).toBe(false);
    expect(all.rows[0]?.playerId).toBe('1629029');
    const curry = all.rows.find((r) => r.playerId === '201939')!;
    expect(curry).toBeTruthy();
    expect(filtered.rows[0]).toEqual(curry);
    expect(filtered.qualifiedPopulation).toBe(all.qualifiedPopulation);
    const second = provider.rank({ ...base, page: 2 });
    expect(
      second.rows.some((r) => all.rows.some((a) => a.playerId === r.playerId)),
    ).toBe(false);
  });
  it('combines supported trade metrics from raw counts and never reverse-engineers rounded values', () => {
    const d = structuredClone(provider.dataset);
    for (const t of d.snapshots) t.statistics['regular-season'] = [];
    const row = {
      ...provider.dataset.snapshots[0]!.statistics['regular-season'][0]!,
      nbaPlayerId: '1',
      name: 'Synthetic trade arithmetic fixture',
      gamesPlayed: 20,
      pointsPerGame: 5.1,
      rawTotals: {
        minutes: 200,
        points: 100,
        rebounds: 20,
        assists: 20,
        steals: 2,
        blocks: 2,
      },
    };
    d.snapshots[0]!.statistics['regular-season'] = [row];
    d.snapshots[1]!.statistics['regular-season'] = [
      {
        ...row,
        gamesPlayed: 10,
        pointsPerGame: 30,
        rawTotals: { ...row.rawTotals, points: 300 },
      },
    ];
    const q = ArchiveRankingQuerySchema.parse({ minGames: '1' });
    const combined = rankRecordedDataset(d, q);
    expect(combined.rows[0]?.value).toBe(400 / 30);
    expect(combined.rows[0]?.gamesPlayed).toBe(30);
    d.snapshots[1]!.statistics['regular-season'][0]!.rawTotals = null;
    expect(rankRecordedDataset(d, q).rows).toEqual([]);
    expect(rankRecordedDataset(d, q).missingMetricPlayers).toBe(1);
  });
  it('retains tied competition ranks and midrank percentiles', () => {
    const d = structuredClone(provider.dataset);
    for (const t of d.snapshots) t.statistics['regular-season'] = [];
    const first = provider.dataset.snapshots[0]!.statistics['regular-season'][0]!;
    d.snapshots[0]!.statistics['regular-season'] = [
      { ...first, nbaPlayerId: '1', pointsPerGame: 10, gamesPlayed: 20 },
      { ...first, nbaPlayerId: '2', pointsPerGame: 10, gamesPlayed: 20 },
      { ...first, nbaPlayerId: '3', pointsPerGame: 5, gamesPlayed: 20 },
    ];
    const rows = rankRecordedDataset(d, ArchiveRankingQuerySchema.parse({})).rows;
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(rows[0]?.percentile).toBeCloseTo((100 * 2) / 3, 10);
    expect(rows[2]?.percentile).toBeCloseTo((100 * 0.5) / 3, 10);
  });
  it('quarantines conflicting/unpaired games and returns maxima only from source-agreed rows', () => {
    const records = provider.records({ metric: 'combinedPoints' });
    expect(records.reconciledGames).toBe(1219);
    expect(records.conflictingGameIds).toHaveLength(9);
    expect(records.unpairedGameIds).toHaveLength(2);
    expect(records.games.length).toBeGreaterThan(0);
    for (const g of records.games) {
      expect(g.homeScore + g.awayScore).toBe(records.value);
      expect(records.conflictingGameIds).not.toContain(g.id);
      expect(g.sources).toHaveLength(2);
    }
    const team = provider.records({ metric: 'teamPoints', team: 'nba:1610612747' });
    expect(
      team.games.every(
        (g) => g.home.id === 'nba:1610612747' || g.away.id === 'nba:1610612747',
      ),
    ).toBe(true);
  });
  it('validates safe scope/query controls and disables recorded sources explicitly by default', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: provider });
    for (const path of [
      '/api/recorded/leaders?metric=trueShooting',
      '/api/recorded/leaders?minGames=0',
      '/api/recorded/leaders?season=2025-26',
      '/api/recorded/records?metric=largestLead',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    expect((await request(app).get('/api/recorded/leaders?team=nba:999')).status).toBe(
      404,
    );
    const r = await request(app).get('/api/recorded/leaders?search=Curry');
    expect(r.status).toBe(200);
    expect(r.body.provenance.source).toBe('wikipedia');
    expect(r.body.rows[0].playerId).toBe('201939');
    expect((await request(createApp()).get('/api/recorded/leaders')).status).toBe(503);
    expect((await request(app).post('/api/recorded/records')).status).toBe(405);
  });
});
