import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { LeagueLineupsResponseSchema } from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive } from './league-archive.js';
import { NbaLiveClient } from './league-live.js';
import { LeagueService } from './league-service.js';

const service = new LeagueService(new LeagueArchive());
const BOS = 1610612738;
const RATING_HEADERS = [
  'GP',
  'MIN',
  'POSS',
  'OFF_RATING',
  'DEF_RATING',
  'NET_RATING',
  'PACE',
];
/** NBA.com's lineup table, in its resultSets format: two units above 50 minutes, one below. */
const lineupsFixture = {
  resultSets: [
    {
      name: 'Lineups',
      headers: ['GROUP_ID', 'GROUP_NAME', ...RATING_HEADERS],
      rowSet: [
        [
          '-1-2-3-4-5-',
          'A. One - B. Two - C. Three - D. Four - E. Five',
          12,
          96,
          188,
          126.6,
          92.9,
          33.7,
          96.3,
        ],
        [
          '-1-2-3-4-6-',
          'A. One - B. Two - C. Three - D. Four - F. Six',
          37,
          623,
          1317,
          120.3,
          109.4,
          11,
          101.3,
        ],
        [
          '-1-2-3-4-7-',
          'A. One - B. Two - C. Three - D. Four - G. Seven',
          3,
          12,
          25,
          150,
          80,
          70,
          99,
        ],
      ],
    },
  ],
};
const onOffRow = (id: number, name: string, min: number, net: number | null) => [
  id,
  name,
  60,
  min,
  min * 2,
  110,
  net === null ? null : 110 - net,
  net,
  99,
];
const onOffHeaders = ['VS_PLAYER_ID', 'VS_PLAYER_NAME', ...RATING_HEADERS];
const onOffFixture = {
  resultSets: [
    { name: 'OverallTeamPlayerOnOffDetails', headers: [], rowSet: [] },
    {
      name: 'PlayersOnCourtTeamPlayerOnOffDetails',
      headers: onOffHeaders,
      rowSet: [
        onOffRow(1, 'One, A.', 2000, 11.2),
        onOffRow(2, 'Two, B.', 2500, 8.7),
        onOffRow(3, 'Three, C.', 900, null),
      ],
    },
    {
      name: 'PlayersOffCourtTeamPlayerOnOffDetails',
      headers: onOffHeaders,
      rowSet: [
        onOffRow(1, 'One, A.', 1900, 12.4),
        onOffRow(2, 'Two, B.', 1400, 16.7),
        onOffRow(3, 'Three, C.', 3000, 9),
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
    const body = url.includes('/leaguedashlineups?')
      ? lineupsFixture
      : url.includes('/teamplayeronoffdetails?')
        ? onOffFixture
        : null;
    if (!body) return new Response('<html>Access Denied</html>', { status: 403 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { live: new NbaLiveClient({ timeoutMs: 2000, fetchImpl }), calls };
}

describe('NBA.com lineups', () => {
  it('lists units at the minutes minimum with NBA.com’s own ratings, and on/off splits', async () => {
    const { live, calls } = liveClient();
    const app = createApp(undefined, { leagueService: service, leagueLive: live });
    const res = await request(app)
      .get('/api/league/lineups')
      .query({ season: '2023-24', team: `nba:${BOS}` })
      .expect(200);
    const body = LeagueLineupsResponseSchema.parse(res.body);
    expect(body.team.abbreviation).toBe('BOS');
    expect(body.minMinutes).toBe(50);
    // All three are counted; the 12-minute unit is below the minimum and is not listed.
    expect(body.totalLineups).toBe(3);
    expect(body.lineups.map((l) => l.ratings.minutes)).toEqual([623, 96]);
    expect(body.lineups[0]!.ratings).toEqual({
      minutes: 623,
      possessions: 1317,
      offRating: 120.3,
      defRating: 109.4,
      netRating: 11,
    });
    expect(body.lineups[0]!.players.map((p) => p.playerId)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '6',
    ]);
    expect(body.onOff.map((p) => p.playerId)).toEqual(['2', '1', '3']);
    expect(body.onOff[0]!.netDifference).toBe(-8);
    expect(body.onOff[1]!.netDifference).toBe(-1.2);
    // An unpublished rating stays unknown; the difference is not computed from a zero.
    expect(body.onOff[2]!.on.netRating).toBeNull();
    expect(body.onOff[2]!.netDifference).toBeNull();
    expect(body.provenance.mode).toBe('live');
    expect(calls.every((u) => u.startsWith('https://stats.nba.com/stats/'))).toBe(true);
    expect(
      calls.some(
        (u) => u.includes('TeamID=1610612738') && u.includes('Season=2023-24'),
      ),
    ).toBe(true);

    // A second request is served from the cache.
    const again = await request(app)
      .get('/api/league/lineups')
      .query({ season: '2023-24', team: `nba:${BOS}`, minMinutes: '0' })
      .expect(200);
    expect(again.body.lineups).toHaveLength(3);
    expect(again.body.provenance.mode).toBe('cached');
    expect(calls).toHaveLength(2);
  });

  it('refuses seasons before NBA.com published lineups, teams not in the season and bad input', async () => {
    const { live, calls } = liveClient();
    const app = createApp(undefined, { leagueService: service, leagueLive: live });
    const early = await request(app)
      .get('/api/league/lineups')
      .query({ season: '2005-06', team: `nba:${BOS}` })
      .expect(404);
    expect(early.body.error.code).toBe('LEAGUE_LINEUPS_NOT_PUBLISHED');
    // A well-formed team ID that played no 2007-08 games is refused before NBA.com is asked.
    const absent = await request(app)
      .get('/api/league/lineups')
      .query({ season: '2007-08', team: 'nba:1610612999' })
      .expect(404);
    expect(absent.body.error.code).toBe('LEAGUE_TEAM_NOT_IN_SEASON');
    await request(app)
      .get('/api/league/lineups')
      .query({ season: '2023-24', team: `nba:${BOS}`, minMinutes: '-5' })
      .expect(400);
    await request(app)
      .get(`/api/league/lineups?season=2023-24&team=nba:${BOS}&team=nba:${BOS}`)
      .expect(400);
    expect(calls).toHaveLength(0);
  });

  it('says so when NBA.com cannot be reached or is not configured', async () => {
    const { live } = liveClient(false);
    const offline = await request(
      createApp(undefined, { leagueService: service, leagueLive: live }),
    )
      .get('/api/league/lineups')
      .query({ season: '2023-24', team: `nba:${BOS}` })
      .expect(404);
    expect(offline.body.error.code).toBe('LEAGUE_LINEUPS_UNAVAILABLE');
    const disabled = await request(createApp(undefined, { leagueService: service }))
      .get('/api/league/lineups')
      .query({ season: '2023-24', team: `nba:${BOS}` })
      .expect(404);
    expect(disabled.body.error.code).toBe('LEAGUE_LIVE_DISABLED');
  });
});
