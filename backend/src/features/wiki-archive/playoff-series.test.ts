import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  ArchiveGameSchema,
  PlayoffBracketResponseSchema,
  type ArchiveGame,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from '../recorded-archive/recorded-provider.js';
import { recordedConferences } from '../recorded-archive/recorded-team-rankings.js';
import { buildPlayoffBracket } from './playoff-series.js';

const teams = new RecordedArchiveProvider().dataset.snapshots.map((s) => s.team);
const team = (abbreviation: string) =>
  teams.find((t) => t.abbreviation === abbreviation)!;
const east = recordedConferences.teams
  .filter((t) => t.conference === 'East')
  .map((t) => teams.find((x) => x.id === t.id)!)
  .slice(0, 8);
const west = recordedConferences.teams
  .filter((t) => t.conference === 'West')
  .map((t) => teams.find((x) => x.id === t.id)!)
  .slice(0, 8);

let day = 0;
/** One recorded final; `winner` wins 101–99 at home unless `away` says otherwise. */
function game(
  round: number,
  series: number,
  number: number,
  winner: ArchiveGame['home'],
  loser: ArchiveGame['home'],
  options: { winnerAway?: boolean; overtime?: boolean; idRound?: number } = {},
): ArchiveGame {
  day++;
  const date = new Date(Date.UTC(2024, 3, 20) + day * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const sourceId = `004230${0}${options.idRound ?? round}${series}${number}`;
  const home = options.winnerAway ? loser : winner;
  const away = options.winnerAway ? winner : loser;
  const homeScore = options.winnerAway ? 99 : 101;
  const awayScore = options.winnerAway ? 101 : 99;
  const quarters = Array.from({ length: options.overtime ? 5 : 4 }, (_, i) => ({
    period: i + 1,
    away:
      i === 0 ? awayScore - (options.overtime ? 40 : 30) : options.overtime ? 10 : 10,
    home:
      i === 0 ? homeScore - (options.overtime ? 40 : 30) : options.overtime ? 10 : 10,
  }));
  return ArchiveGameSchema.parse({
    id: `nba:${sourceId}`,
    sourceId,
    season: '2023-24',
    scope: 'playoffs',
    date,
    status: 'final',
    away,
    home,
    awayScore,
    homeScore,
    tipoffUtc: null,
    reportedTime: null,
    venue: null,
    quarters,
    leaders: [
      { teamId: away.id, points: null, rebounds: null, assists: null },
      { teamId: home.id, points: null, rebounds: null, assists: null },
    ],
    recapUrl: `https://www.nba.com/game/${sourceId}`,
  });
}
/** A best-of-seven the first team wins `4-losses`, the loser's wins coming first. */
function series(
  round: number,
  index: number,
  a: ArchiveGame['home'],
  b: ArchiveGame['home'],
  losses = 0,
) {
  const out: ArchiveGame[] = [];
  for (let i = 0; i < losses; i++) out.push(game(round, index, out.length + 1, b, a));
  for (let i = 0; i < 4; i++)
    out.push(
      game(round, index, out.length + 1, a, b, {
        winnerAway: i === 1,
        overtime: i === 2 && index === 0,
      }),
    );
  return out;
}
/** A full bracket in which the first-listed team of every pairing advances. */
function bracket() {
  day = 0;
  const games: ArchiveGame[] = [];
  for (const [conf, list] of [
    ['East', east],
    ['West', west],
  ] as const) {
    const offset = conf === 'East' ? 0 : 4;
    for (let i = 0; i < 4; i++)
      games.push(...series(1, i + offset, list[i]!, list[7 - i]!, i % 3));
    for (let i = 0; i < 2; i++)
      games.push(...series(2, i + offset / 2, list[i]!, list[3 - i]!, 1));
    games.push(...series(3, conf === 'East' ? 0 : 1, list[0]!, list[1]!, 2));
  }
  games.push(...series(4, 0, east[0]!, west[0]!, 1));
  return games;
}

describe('playoff series and bracket derivation', () => {
  it('builds a complete four-round bracket with feeders, champion and series facts', () => {
    const result = buildPlayoffBracket(bracket());
    expect(result.issues).toEqual([]);
    expect(result.complete).toBe(true);
    expect(result.champion?.id).toBe(east[0]!.id);
    expect(result.series.map((s) => s.round)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4,
    ]);
    const finals = result.series.at(-1)!;
    expect(finals.conference).toBeNull();
    expect(finals.status).toBe('decided');
    expect(finals.games.map((g) => g.after)).toHaveLength(5);
    expect(finals.feeders).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^r3-/),
        expect.stringMatching(/^r3-/),
      ]),
    );
    const sweep = result.series.find((s) => s.round === 1 && s.games.length === 4)!;
    expect(Math.max(...sweep.wins)).toBe(4);
    expect(Math.min(...sweep.wins)).toBe(0);
    expect(sweep.sourceIdRoundAgrees).toBe(true);
    // Points are summed per team across the series; one game in four was won on the road.
    expect(sweep.totalPoints.reduce((s, p) => s + p, 0)).toBe(4 * 200);
    expect(sweep.homeWins).toBe(3);
    expect(result.series.reduce((s, x) => s + x.overtimeGames, 0)).toBe(4);
  });

  it('names no winner for a series the recorded games do not finish', () => {
    const games = bracket().filter((g) => g.id !== bracket().at(-1)!.id);
    const result = buildPlayoffBracket(games);
    const finals = result.series.find((s) => s.round === 4)!;
    expect(finals).toMatchObject({ status: 'incomplete', winner: null });
    expect(finals.wins.slice().sort()).toEqual([1, 3]);
    expect(result.complete).toBe(false);
    expect(result.champion).toBeNull();
    expect(result.issues.join(' ')).toMatch(/do not end with a team's fourth win/);
  });

  it('refuses a winner when games continue after a fourth win', () => {
    const games = series(1, 0, east[0]!, east[7]!);
    games.push(game(1, 0, 5, east[7]!, east[0]!));
    const [only] = buildPlayoffBracket(games).series;
    expect(only).toMatchObject({
      status: 'incomplete',
      winner: null,
      wins: [expect.any(Number), expect.any(Number)],
    });
  });

  it('flags game IDs whose round digit disagrees with the derived round', () => {
    day = 0;
    const games = series(1, 0, east[0]!, east[7]!).map((g, i) =>
      i === 0 ? game(1, 0, 1, east[0]!, east[7]!, { idRound: 2 }) : g,
    );
    const result = buildPlayoffBracket(games);
    expect(result.series[0]!.sourceIdRoundAgrees).toBe(false);
    expect(result.issues.join(' ')).toMatch(/encode a different round/);
  });

  it('reports a first-round meeting between conferences', () => {
    const result = buildPlayoffBracket(series(1, 0, team('BOS'), team('DEN')));
    expect(result.series[0]!.conference).toBeNull();
    expect(result.issues.join(' ')).toMatch(/between conferences is unexpected/);
  });

  it('serves the bracket from the archive provider and validates the query', async () => {
    const games = bracket();
    const app = createApp(undefined, {
      archiveProvider: {
        source: 'fixture',
        getLeague: () => Promise.reject(new Error('unused')),
        getGames: () =>
          Promise.resolve({
            games,
            page: {
              title: '2024 NBA playoffs',
              html: '',
              revision: 1,
              retrievedAt: '2026-10-13T21:00:00.000Z',
            },
          }),
      },
    });
    const ok = await request(app).get('/api/games/bracket');
    expect(ok.status).toBe(200);
    const body = PlayoffBracketResponseSchema.parse(ok.body);
    expect(body).toMatchObject({ complete: true, recordedGames: games.length });
    expect(body.provenance.warnings.join(' ')).toMatch(/DEMO FIXTURES/);
    expect((await request(app).get('/api/games/bracket?season=2022-23')).status).toBe(
      400,
    );
    expect((await request(app).get('/api/games/bracket?round=1')).status).toBe(400);
    expect((await request(app).post('/api/games/bracket')).status).toBe(405);
    expect((await request(createApp()).get('/api/games/bracket')).status).toBe(503);
  });
});
