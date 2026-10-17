import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { StudyLineupQuerySchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import {
  createLineupStudyProvider,
  type LineupStudyProvider,
  LineupStudyProvider as Provider,
} from './lineup-study-provider.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
let provider: LineupStudyProvider;
describe('author-derived shared-time lineup research', () => {
  beforeAll(async () => {
    provider = await createLineupStudyProvider();
  });
  it('validates genuine source/hash/clock aggregates and preserves the missing-period quarantine', () => {
    expect(provider.data.lineups).toHaveLength(13867);
    expect(provider.data.games).toHaveLength(1229);
    expect(provider.people.size).toBe(540);
    expect(provider.data.quarantinedGames[0]).toMatchObject({
      id: 'nba:0021700421',
      reportedPeriods: [1, 2, 3, 4, 5, 7],
    });
    expect(
      provider.data.lineups.every(
        (g) =>
          g.members.length === 5 &&
          new Set(g.members).size === 5 &&
          !g.games.includes('nba:0021700421'),
      ),
    ).toBe(true);
    expect(provider.data.lineups.reduce((s, g) => s + g.seconds, 0)).toBe(
      2 * provider.data.games.reduce((s, g) => s + g.durationSeconds, 0),
    );
    expect(provider.data.lineups.reduce((s, g) => s + g.plusMinus, 0)).toBe(0);
  });
  it('looks up actual five-source-member groups and signed joint quantities without fabricated NBA IDs/ratings', () => {
    const q = StudyLineupQuerySchema.parse({
        members: 'br:curryst01',
        minMinutes: '30',
      }),
      d = provider.list(q);
    expect(d.rows.length).toBeGreaterThan(0);
    expect(
      d.rows.every(
        (r) =>
          r.members.some((p) => p.id === 'br:curryst01') && r.minutesTogether >= 30,
      ),
    ).toBe(true);
    for (const r of d.rows) {
      expect(r.plusMinusPer48).toBe((r.plusMinus * 2880) / r.secondsTogether);
      expect(r.games).toHaveLength(r.observedGames);
      expect(
        r.members.every(
          (p) => p.nbaPlayerId === null && p.sourceUrl.includes(p.id.slice(3)),
        ),
      ).toBe(true);
      expect(r.netRating).toBeNull();
      expect(r.possessions).toBeNull();
    }
    const top = provider.list(StudyLineupQuerySchema.parse({ pageSize: '1' })).rows[0]!;
    expect(top.id).toBe('study:MIN_2017_001');
    expect(top.secondsTogether).toBe(67892);
    expect(top.plusMinus).toBe(165);
  });
  it('retains comparison raw counts below common qualifier while withholding normalized rates and preserves signed sort', () => {
    const d = provider.list(
      StudyLineupQuerySchema.parse({
        pageSize: '2',
        sort: 'plusMinus',
        order: 'asc',
        minMinutes: '0',
      }),
    );
    expect(d.rows[0]!.plusMinus).toBeLessThanOrEqual(d.rows[1]!.plusMinus);
    const ids = d.rows.map((r) => r.id),
      compare = provider.list(
        StudyLineupQuerySchema.parse({ compare: ids.join(','), minMinutes: '2000' }),
      );
    expect(compare.comparison).toHaveLength(2);
    expect(
      compare.comparison.every(
        (r) => !r.qualified && r.plusMinusPer48 === null && r.secondsTogether > 0,
      ),
    ).toBe(true);
  });
  it('rejects corrupt member identities and strict unsupported/missing source routes without fixtures', async () => {
    const input = structuredClone(provider.data);
    input.lineups[0]!.members[1] = input.lineups[0]!.members[0]!;
    expect(() => new Provider(input, awaitTeams)).toThrow();
    const app = createApp(undefined, { lineupStudyProvider: provider });
    for (const q of [
      'season=2023-24',
      'scope=playoffs',
      'members=2544',
      'members=br:curryst01,br:curryst01',
      'sort=netRating',
      'minMinutes=2001',
      'compare=study:MIN_2017_001,study:MIN_2017_001',
    ])
      expect((await request(app).get('/api/research-lineups?' + q)).status).toBe(400);
    expect(
      (await request(app).get('/api/research-lineups?members=br:fakeab01')).status,
    ).toBe(404);
    expect(
      (
        await request(app).get(
          '/api/research-lineups?compare=study:PHI_2017_276,study:MIN_2017_001',
        )
      ).status,
    ).toBe(404);
    expect((await request(createApp()).get('/api/research-lineups')).status).toBe(503);
    expect((await request(app).post('/api/research-lineups')).status).toBe(405);
    expect(
      (await request(app).get('/api/research-lineups/directory')).body.people,
    ).toHaveLength(540);
  });
});
const awaitTeams = await staticTeamDirectoryProvider.listTeams();
