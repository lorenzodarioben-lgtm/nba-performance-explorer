import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  LeagueGameDetailResponseSchema,
  LeagueGamesResponseSchema,
  LeaguePlayByPlayResponseSchema,
  LeagueSnapshotResponseSchema,
  LeagueStatusResponseSchema,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive } from './league-archive.js';
import { LeagueGames, leagueStatus } from './league-games.js';
import { NbaLiveClient } from './league-live.js';
import { LeagueService } from './league-service.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('./test-fixtures/game-0022401229.json', import.meta.url),
    'utf8',
  ),
) as { box: unknown; pbp: unknown };
const service = new LeagueService(new LeagueArchive());

const team = (
  teamId: number,
  teamTricode: string,
  teamCity: string,
  teamName: string,
  score = 0,
) => ({
  teamId,
  teamTricode,
  teamCity,
  teamName,
  wins: 1,
  losses: 0,
  score,
});
/** A small schedule in NBA.com's format: one game in each state the source reports. */
const schedule = {
  meta: { version: 1 },
  leagueSchedule: {
    seasonYear: '2026-27',
    gameDates: [
      {
        games: [
          {
            gameId: '0012600001',
            gameStatus: 3,
            gameStatusText: 'Final/OT',
            gameDateEst: '2026-10-05T00:00:00Z',
            gameDateTimeUTC: '2026-10-05T23:00:00Z',
            postponedStatus: 'N',
            gameLabel: 'Preseason',
            gameSubLabel: '',
            isNeutral: false,
            homeTeam: team(1610612738, 'BOS', 'Boston', 'Celtics', 110),
            awayTeam: team(1610612752, 'NYK', 'New York', 'Knicks', 108),
          },
          {
            gameId: '0022600001',
            gameStatus: 1,
            gameStatusText: '7:30 pm ET',
            gameDateEst: '2026-10-20T00:00:00Z',
            gameDateTimeUTC: '2026-10-20T23:30:00Z',
            postponedStatus: 'N',
            gameLabel: '',
            gameSubLabel: '',
            isNeutral: false,
            homeTeam: team(1610612738, 'BOS', 'Boston', 'Celtics'),
            awayTeam: team(1610612755, 'PHI', 'Philadelphia', '76ers'),
          },
          {
            gameId: '0022600002',
            gameStatus: 1,
            gameStatusText: 'TBD',
            gameDateEst: '2026-10-20T00:00:00Z',
            gameDateTimeUTC: '2026-10-20T00:00:00Z',
            postponedStatus: 'N',
            gameLabel: '',
            gameSubLabel: '',
            isNeutral: false,
            homeTeam: team(1610612747, 'LAL', 'Los Angeles', 'Lakers'),
            awayTeam: team(1610612744, 'GSW', 'Golden State', 'Warriors'),
          },
          {
            gameId: '0022600003',
            gameStatus: 1,
            gameStatusText: 'PPD',
            gameDateEst: '2026-10-20T00:00:00Z',
            gameDateTimeUTC: '2026-10-21T00:00:00Z',
            postponedStatus: 'Y',
            gameLabel: '',
            gameSubLabel: '',
            isNeutral: false,
            homeTeam: team(1610612743, 'DEN', 'Denver', 'Nuggets'),
            awayTeam: team(1610612750, 'MIN', 'Minnesota', 'Timberwolves'),
          },
          {
            gameId: '0022600004',
            gameStatus: 1,
            gameStatusText: '8:00 pm ET',
            gameDateEst: '2026-10-20T00:00:00Z',
            gameDateTimeUTC: '2026-10-21T00:00:00Z',
            postponedStatus: 'N',
            gameLabel: 'NBA Mexico City Game',
            gameSubLabel: '',
            isNeutral: true,
            homeTeam: team(1610612742, 'DAL', 'Dallas', 'Mavericks'),
            awayTeam: team(1610612765, 'DET', 'Detroit', 'Pistons'),
          },
        ],
      },
    ],
  },
};
/** Today's scoreboard: the 7:30 game is under way. */
const scoreboard = {
  meta: { version: 1 },
  scoreboard: {
    gameDate: '2026-10-20',
    games: [
      {
        ...schedule.leagueSchedule.gameDates[0]!.games[1]!,
        gameStatus: 2,
        gameStatusText: 'Q3 4:31',
        period: 3,
        gameClock: 'PT04M31.00S',
        homeTeam: team(1610612738, 'BOS', 'Boston', 'Celtics', 71),
        awayTeam: team(1610612755, 'PHI', 'Philadelphia', '76ers', 66),
      },
    ],
  },
};
/** NBA.com's standings table before any regular-season game: every team 0-0. */
const standingsFixture = {
  resultSets: [
    {
      name: 'Standings',
      headers: [
        'TeamID',
        'TeamCity',
        'TeamName',
        'Conference',
        'PlayoffRank',
        'Division',
        'WINS',
        'LOSSES',
        'HOME',
        'ROAD',
        'L10',
        'strCurrentStreak',
        'ConferenceGamesBack',
        'ClinchIndicator',
      ],
      rowSet: [
        [
          1610612752,
          'New York',
          'Knicks',
          'East',
          1,
          'Atlantic',
          0,
          0,
          '0-0',
          '0-0',
          '0-0',
          '',
          0,
          '',
        ],
        [
          1610612737,
          'Atlanta',
          'Hawks',
          'East',
          2,
          'Southeast',
          0,
          0,
          '0-0',
          '0-0',
          '0-0',
          '',
          0,
          '',
        ],
        [
          1610612760,
          'Oklahoma City',
          'Thunder',
          'West',
          1,
          'Northwest',
          0,
          0,
          '0-0',
          '0-0',
          '0-0',
          '',
          0,
          '',
        ],
      ],
    },
  ],
};
function liveClient(online = true) {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);
    if (!online) throw new TypeError('offline');
    const body = url.endsWith('scheduleLeagueV2.json')
      ? schedule
      : url.endsWith('todaysScoreboard_00.json')
        ? scoreboard
        : url.endsWith('boxscore_0022401229.json')
          ? fixture.box
          : url.endsWith('playbyplay_0022401229.json')
            ? fixture.pbp
            : url.includes('leaguestandingsv3')
              ? standingsFixture
              : null;
    if (!body) return new Response('<html>Access Denied</html>', { status: 403 });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'content-type': 'binary/octet-stream',
        'last-modified': 'Thu, 15 Oct 2026 20:51:44 GMT',
      },
    });
  }) as typeof fetch;
  return { live: new NbaLiveClient({ timeoutMs: 2000, fetchImpl }), calls };
}

describe('games by date', () => {
  it('lists archived finals with neutral sites and overtime, and the game that was never played', async () => {
    const { live } = liveClient(false);
    const games = new LeagueGames(service, live);
    const day = LeagueGamesResponseSchema.parse(
      await games.games('2024-12-14', undefined),
    );
    const semi = day.games.find((g) => g.id === 'nba:0022401229')!;
    expect(semi).toMatchObject({
      status: 'final',
      neutralSite: true,
      overtimePeriods: 0,
      source: 'archive',
    });
    expect(semi.home.team.abbreviation).toBe('MIL');
    expect(day.coverage).toMatch(/live NBA.com schedule could not be reached/);
    const canceled = (await games.games('2013-04-16', undefined)).games.find(
      (g) => g.id === 'nba:0021201214',
    )!;
    expect(canceled).toMatchObject({
      status: 'canceled',
      home: { score: null },
      away: { score: null },
    });
    expect(canceled.note).toMatch(/never played/);
    // Overtime comes from team minutes (240 plus 25 for each extra period).
    const ot = (await games.games('2024-01-26', undefined)).games.filter(
      (g) => (g.overtimePeriods ?? 0) > 0,
    );
    expect(ot.every((g) => g.status === 'final')).toBe(true);
  });

  it('reports the live schedule’s own states, with period and clock only for live games', async () => {
    const { live } = liveClient();
    const games = new LeagueGames(service, live);
    const day = LeagueGamesResponseSchema.parse(
      await games.games('2026-10-20', undefined),
    );
    const byId = new Map(day.games.map((g) => [g.id, g]));
    expect(byId.get('nba:0022600001')).toMatchObject({
      status: 'live',
      period: 3,
      clock: '4:31',
      source: 'scoreboard',
      home: { score: 71 },
    });
    expect(byId.get('nba:0022600002')).toMatchObject({
      status: 'scheduled',
      startTimeTbd: true,
      startTimeUtc: null,
      home: { score: null },
    });
    expect(byId.get('nba:0022600003')).toMatchObject({
      status: 'postponed',
      period: null,
      clock: null,
      home: { score: null },
    });
    expect(byId.get('nba:0022600004')).toMatchObject({
      neutralSite: true,
      label: 'NBA Mexico City Game',
    });
    expect(day.provenance.mode).toBe('live');
    expect(day.provenance.sourceUpdatedAt).toBe('2026-10-15T20:51:44.000Z');
    // A final from the schedule carries its overtime from the status text.
    const pre = (await games.games('2026-10-05', undefined)).games[0]!;
    expect(pre).toMatchObject({
      status: 'final',
      overtimePeriods: 1,
      type: 'preseason',
      home: { score: 110 },
    });
  });
});

describe('game detail and play-by-play', () => {
  it('adds NBA.com starters, line score and venue to the archived box lines', async () => {
    const { live } = liveClient();
    const detail = LeagueGameDetailResponseSchema.parse(
      await new LeagueGames(service, live).detail('nba:0022401229'),
    );
    expect(detail.box!.source).toBe('archive');
    expect(detail.box!.teams.every((t) => t.addsUp)).toBe(true);
    expect(
      detail.box!.teams.flatMap((t) => t.players).filter((p) => p.starter),
    ).toHaveLength(10);
    expect(detail.lineScore!.periods).toHaveLength(4);
    expect(detail.venue).toMatchObject({ arena: 'T-Mobile Arena', city: 'Las Vegas' });
    const points = detail.highs.find((h) => h.key === 'pts')!;
    const all = detail
      .box!.teams.flatMap((t) => t.players)
      .map((p) => p.stats.pts ?? 0);
    expect(points.value).toBe(Math.max(...all));
  });

  it('keeps the archived box score when NBA.com cannot be reached', async () => {
    const { live } = liveClient(false);
    const detail = await new LeagueGames(service, live).detail('nba:0022401229');
    expect(detail.box!.teams[0]!.players.length).toBeGreaterThan(5);
    expect(detail.notes.join(' ')).toMatch(/could not be reached/);
    expect(detail.provenance.mode).toBe('committed-snapshot');
  });

  it('derives the scoring flow from ordered events and agrees with NBA.com’s own counts', async () => {
    const { live } = liveClient();
    const pbp = LeaguePlayByPlayResponseSchema.parse(
      await new LeagueGames(service, live).playByPlay('nba:0022401229'),
    );
    expect(pbp.complete).toBe(true);
    expect(pbp.analysis).toMatchObject({ leadChanges: 12, timesTied: 5 });
    expect(pbp.analysis.largestLead.home.points).toBe(10);
    expect(pbp.analysis.largestLead.away.points).toBe(6);
    expect(pbp.sourceCounts).toMatchObject({
      leadChanges: 12,
      timesTied: 5,
      biggestLeadHome: 10,
      biggestLeadAway: 6,
    });
    expect(pbp.checks.join(' ')).toMatch(/match NBA.com’s own counts/);
    const ends = pbp.analysis.periodScores.reduce(
      (t, p) => ({ home: t.home + p.home, away: t.away + p.away }),
      { home: 0, away: 0 },
    );
    expect(ends).toEqual({ home: 110, away: 102 });
  });

  it('says why play-by-play is missing instead of inventing it', async () => {
    const { live } = liveClient();
    const games = new LeagueGames(service, live);
    await expect(games.playByPlay('nba:0022600003')).rejects.toThrow(
      /has not been played/,
    );
    // An old archived game whose events NBA.com does not serve here.
    await expect(games.playByPlay('nba:0021700001')).rejects.toThrow(
      /could not be reached or is not published/,
    );
  });
});

describe('daily performers and current standings', () => {
  it('lists the day’s leading box-score marks from archived lines, ties included', async () => {
    const { live } = liveClient(false);
    const day = await new LeagueGames(service, live).games('2024-12-14', undefined);
    const points = day.performers.find((p) => p.key === 'pts')!;
    const lines = service.archive
      .playerLines('2024-25', 'regular-season')
      .filter((l) => l.date === '2024-12-14');
    const best = Math.max(...lines.map((l) => l.line[15] ?? 0));
    expect(points.rows[0]!.value).toBe(best);
    expect(points.rows.length).toBeGreaterThanOrEqual(3);
    const third = points.rows[2]!.value;
    expect(points.rows.every((r) => r.value >= third)).toBe(true);
  });

  it('serves NBA.com’s live table for the current season and hides placeholder ranks before games', async () => {
    const { live } = liveClient();
    const table = await new LeagueGames(service, live).currentStandings();
    expect(table.season).toBe('2026-27');
    expect(table.provenance.mode).toBe('live');
    expect(table.conferences[0]!.rows.map((r) => r.team.name)).toEqual([
      'Atlanta Hawks',
      'New York Knicks',
    ]);
    expect(table.provenance.warnings.join(' ')).toMatch(/listed alphabetically/);
    const { live: offline } = liveClient(false);
    await expect(new LeagueGames(service, offline).currentStandings()).rejects.toThrow(
      /could not be reached/,
    );
  });
});

describe('source status and the API', () => {
  it('reports current, unavailable and not-contacted states from real outcomes', async () => {
    const online = liveClient();
    const status = LeagueStatusResponseSchema.parse(
      await leagueStatus(service, online.live),
    );
    const byId = new Map(status.sources.map((s) => [s.id, s]));
    expect(byId.get('league-archive')!.state).toBe('archived');
    expect(byId.get('schedule')!.state).toBe('current');
    expect(byId.get('boxscore')!.state).toBe('not-contacted');
    const offline = liveClient(false);
    const down = await leagueStatus(service, offline.live);
    expect(down.sources.find((s) => s.id === 'scoreboard')!.state).toBe('unavailable');
  });

  it('serves the snapshot with an explicit season, as-of date and schedule phase', async () => {
    const { live } = liveClient();
    const snap = LeagueSnapshotResponseSchema.parse(
      await new LeagueGames(service, live).snapshot(),
    );
    expect(snap.season).toBe(service.archive.seasons.at(-1));
    expect(snap.asOf).toBe(
      service.archive.summary(snap.season).scopes['regular-season'].lastDate,
    );
    expect(snap.current).toMatchObject({
      season: '2026-27',
      regularSeasonStart: '2026-10-20',
    });
    expect(snap.upcoming.every((g) => g.status === 'scheduled')).toBe(true);
  });

  it('validates the game routes', async () => {
    const { live } = liveClient(false);
    const app = createApp(undefined, { leagueService: service, leagueLive: live });
    expect((await request(app).get('/api/league/games?date=2024-12-14')).status).toBe(
      200,
    );
    expect((await request(app).get('/api/league/games?date=14-12-2024')).status).toBe(
      400,
    );
    expect((await request(app).get('/api/league/games/0022401229')).status).toBe(400);
    expect((await request(app).get('/api/league/games/nba:0029999999')).status).toBe(
      404,
    );
    expect((await request(app).get('/api/league/calendar?month=2024-13')).status).toBe(
      400,
    );
    expect((await request(app).get('/api/league/calendar?month=2024-12')).status).toBe(
      200,
    );
    expect((await request(app).get('/api/league/status?x=1')).status).toBe(400);
  });
});
