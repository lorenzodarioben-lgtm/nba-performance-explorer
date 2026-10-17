import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  RecordedTeamRankingsQuerySchema,
  type VerifiedRecordedGame,
} from '@nba-performance-explorer/contracts';
import { summarizeRecordedTeam, rankRecordedTeams } from './recorded-team-rankings.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';
const p = new RecordedArchiveProvider();
const original = p.dataset.snapshots.find((s) => s.team.abbreviation === 'LAL')!;
const opponent = p.dataset.snapshots.find((s) => s.team.abbreviation === 'BOS')!.team;
function fixture() {
  const source = {
    ...original,
    results: original.results.slice(0, 12).map((g, i) => ({
      ...g,
      sourceId: `00223${String(i + 1).padStart(5, '0')}`,
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      teamScore: i < 9 ? 90 : 110,
      opponentScore: 100,
      result: i < 9 ? ('L' as const) : ('W' as const),
      location: i % 2 ? ('away' as const) : ('home' as const),
      opponent,
    })),
  };
  const games: VerifiedRecordedGame[] = source.results.map((g) => ({
    id: `nba:${g.sourceId}`,
    date: g.date,
    home: g.location === 'home' ? source.team : opponent,
    away: g.location === 'home' ? opponent : source.team,
    homeScore: g.location === 'home' ? g.teamScore : g.opponentScore,
    awayScore: g.location === 'home' ? g.opponentScore : g.teamScore,
    recapUrl: g.recapUrl,
    sources: [source.attribution, source.attribution],
  }));
  return { source, games };
}
describe('recorded historical team ranks and split coverage', () => {
  it('reconciles hand-calculated W/L, points, venue records, last ten and terminal streak', () => {
    const f = fixture(),
      r = summarizeRecordedTeam(f.source, f.games);
    expect(r).toMatchObject({
      observedGames: 12,
      wins: 3,
      losses: 9,
      winPercentage: 0.25,
      pointsPerGame: 95,
      opponentPointsPerGame: 100,
      finalMarginPerGame: -5,
      conference: 'West',
      home: { games: 6, wins: 1, losses: 5 },
      away: { games: 6, wins: 2, losses: 4 },
      lastTen: { complete: true, observedGames: 10, wins: 3, losses: 7 },
      streak: { kind: 'W', length: 3 },
    });
    expect(r.completeSeason).toBe(false);
  });
  it('withholds incomplete final-ten/streak boundaries and ambiguous calendar order', () => {
    const f = fixture();
    expect(summarizeRecordedTeam(f.source, f.games.slice(0, -1))).toMatchObject({
      lastTen: { complete: false, observedGames: 9, wins: null, losses: null },
      streak: { kind: null, length: null },
    });
    expect(
      summarizeRecordedTeam(
        f.source,
        f.games.filter((_, i) => i !== 8),
      ).streak.kind,
    ).toBeNull();
    expect(summarizeRecordedTeam(f.source, f.games.slice(1)).streak).toMatchObject({
      kind: 'W',
      length: 3,
    });
    const ambiguous = {
      ...f.source,
      results: f.source.results.map((g, i) =>
        i === 11 ? { ...g, date: f.source.results[10]!.date } : g,
      ),
    };
    expect(summarizeRecordedTeam(ambiguous, f.games).lastTen.wins).toBeNull();
    expect(summarizeRecordedTeam(f.source, [])).toMatchObject({
      pointsPerGame: null,
      winPercentage: null,
      streak: { kind: null, length: null },
    });
  });
  it('uses genuine paired samples, conference evidence and qualifier-before-search numeric ranks', () => {
    const q = RecordedTeamRankingsQuerySchema.parse({}),
      r = p.teamRankings(q);
    expect(r.rows).toHaveLength(30);
    expect(r.reconciledGames).toBe(1219);
    expect(r.quarantinedGameIds).toHaveLength(11);
    expect(r.rows.reduce((s, t) => s + t.observedGames, 0)).toBe(2438);
    for (const t of r.rows) {
      expect(t.home.games + t.away.games).toBe(t.observedGames);
      expect(t.observedGames + t.missingGameIds.length).toBe(82);
    }
    const lal = r.rows.find((t) => t.team.abbreviation === 'LAL')!;
    expect(lal).toMatchObject({
      observedGames: 82,
      wins: 47,
      losses: 35,
      completeSeason: true,
    });
    const searched = p.teamRankings({ ...q, search: 'LAL' });
    expect(searched.rows[0]?.rank).toBe(lal.rank);
    expect(searched.rankingPopulation).toBe(30);
    expect(p.teamRankings({ ...q, conference: 'East' }).rankingPopulation).toBe(15);
    expect(
      p
        .teamRankings({ ...q, completeOnly: 'true' })
        .rows.every((t) => t.completeSeason),
    ).toBe(true);
    const base = summarizeRecordedTeam(fixture().source, fixture().games),
      tied = rankRecordedTeams(
        [
          { ...base, winPercentage: 0.5 },
          { ...base, team: opponent, conference: 'East', winPercentage: 0.5 },
        ],
        q,
      );
    expect(tied.rows.map((t) => t.rank)).toEqual([1, 1]);
    const asc = p.teamRankings({ ...q, metric: 'opponentPointsPerGame', order: 'asc' });
    expect(asc.rows[0]!.value).toBe(Math.min(...asc.rows.map((t) => t.value)));
  });
  it('validates inputs and source absence without pretending the ranking is official', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    for (const qs of [
      'minGames=0',
      'minGames=83',
      'conference=North',
      'metric=netRating',
      'completeOnly=1',
      'season=2025-26',
      'metric=pointsPerGame&metric=winPercentage',
    ])
      expect((await request(app).get('/api/recorded/team-rankings?' + qs)).status).toBe(
        400,
      );
    const r = await request(app).get('/api/recorded/team-rankings');
    expect(r.status).toBe(200);
    expect(r.body.officialStandings).toBe(false);
    expect((await request(createApp()).get('/api/recorded/team-rankings')).status).toBe(
      503,
    );
    expect((await request(app).post('/api/recorded/team-rankings')).status).toBe(405);
  });
});
