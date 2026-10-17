// A team's five-player lineups and on/off splits from NBA.com (2007-08 on). Every rating is
// NBA.com's own, calculated from its play-by-play; this app only selects, sorts and labels.
import {
  LeagueLineupsResponseSchema,
  type LeagueLineupsResponse,
} from '@nba-performance-explorer/contracts';
import type { LiveResult, NbaLiveClient } from './league-live.js';
import { LeagueRequestError, teamRef, type LeagueService } from './league-service.js';

const FIRST_LINEUP_SEASON = 2007;
type Row = Record<string, unknown>;
const rowsOf = (value: unknown, name?: string) => {
  const sets =
    (
      value as {
        resultSets?: { name: string; headers: string[]; rowSet: unknown[][] }[];
      }
    ).resultSets ?? [];
  const set = name ? sets.find((s) => s.name === name) : sets[0];
  return (set?.rowSet ?? []).map((r) =>
    Object.fromEntries(set!.headers.map((h, i) => [h, r[i]])),
  ) as Row[];
};
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ratings = (r: Row) => ({
  minutes: num(r.MIN) ?? 0,
  possessions: num(r.POSS) ?? 0,
  offRating: num(r.OFF_RATING),
  defRating: num(r.DEF_RATING),
  netRating: num(r.NET_RATING),
});

export class LeagueLineups {
  constructor(
    private readonly league: LeagueService,
    private readonly live: NbaLiveClient | undefined,
  ) {}

  async lineups(
    season: string,
    teamIdText: string,
    minMinutes: number,
  ): Promise<LeagueLineupsResponse> {
    const teamId = Number(teamIdText.slice(4));
    if (Number(season.slice(0, 4)) < FIRST_LINEUP_SEASON)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LINEUPS_NOT_PUBLISHED',
        'NBA.com publishes lineup and on/off data from 2007–08 on.',
      );
    if (!this.live)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LIVE_DISABLED',
        'Lineups need NBA.com, which this server does not contact.',
      );
    const archive = this.league.archive;
    const s = archive.has(season) ? archive.summary(season) : null;
    if (s && !s.teams.some((t) => t.teamId === teamId))
      throw new LeagueRequestError(
        404,
        'LEAGUE_TEAM_NOT_IN_SEASON',
        `That team did not play in ${season}.`,
      );
    let lineups: LiveResult<unknown>, onOff: LiveResult<unknown>;
    try {
      [lineups, onOff] = await Promise.all([
        this.live.lineups(season, teamId),
        this.live.onOff(season, teamId),
      ]);
    } catch {
      throw new LeagueRequestError(
        404,
        'LEAGUE_LINEUPS_UNAVAILABLE',
        `NBA.com’s ${season} lineup data could not be reached.`,
      );
    }
    const all = rowsOf(lineups.value, 'Lineups');
    if (!all.length)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LINEUPS_NOT_PUBLISHED',
        `NBA.com publishes no ${season} lineups for this team.`,
      );
    const name = (id: number, fallback: string) =>
      s ? this.league.name(s, id) : fallback;
    const listed = all
      .filter((r) => (num(r.MIN) ?? 0) >= minMinutes)
      .sort((a, b) => (num(b.MIN) ?? 0) - (num(a.MIN) ?? 0))
      .slice(0, 60)
      .map((r) => {
        const id = String(r.GROUP_ID ?? '');
        const ids = id.split('-').filter(Boolean);
        const names = String(r.GROUP_NAME ?? '').split(' - ');
        return {
          id,
          players: ids.map((pid, i) => ({
            playerId: pid,
            name: name(Number(pid), (names[i] ?? `Player ${pid}`).slice(0, 80)),
          })),
          gamesPlayed: num(r.GP) ?? 0,
          pace: num(r.PACE),
          ratings: ratings(r),
        };
      })
      .filter((l) => l.players.length === 5);
    const on = rowsOf(onOff.value, 'PlayersOnCourtTeamPlayerOnOffDetails');
    const off = new Map(
      rowsOf(onOff.value, 'PlayersOffCourtTeamPlayerOnOffDetails').map((r) => [
        Number(r.VS_PLAYER_ID),
        r,
      ]),
    );
    const onOffRows = on
      .map((r) => {
        const id = Number(r.VS_PLAYER_ID);
        const offRow = off.get(id);
        if (!offRow) return null;
        const a = ratings(r),
          b = ratings(offRow);
        return {
          playerId: String(id),
          name: name(id, String(r.VS_PLAYER_NAME ?? `Player ${id}`).slice(0, 80)),
          on: a,
          off: b,
          netDifference:
            a.netRating === null || b.netRating === null
              ? null
              : Math.round((a.netRating - b.netRating) * 10) / 10,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.on.minutes - a.on.minutes);
    const team = s
      ? teamRef(s, teamId)
      : { id: teamIdText, abbreviation: 'UNK', name: `Team ${teamId}` };
    const stamp = [lineups, onOff].sort((x, y) =>
      x.retrievedAt.localeCompare(y.retrievedAt),
    )[0]!;
    return LeagueLineupsResponseSchema.parse({
      season,
      team,
      minMinutes,
      totalLineups: all.length,
      lineups: listed,
      onOff: onOffRows,
      definitions: [
        'NBA.com calculates lineup and on/off figures from its play-by-play; this page shows them as published.',
        'Offensive and defensive rating: points scored and allowed per 100 possessions while that group (or player) was on the floor; net rating is the difference.',
        'Possessions and minutes are NBA.com’s counts for the time on the floor together. Small samples swing widely: compare minutes before ratings.',
        'On/off: the team with the player on the floor against the team with the player off it, in the same season.',
      ],
      provenance: {
        source: 'nba-stats',
        mode: stamp.cached ? 'cached' : 'live',
        servedAt: new Date().toISOString(),
        retrievedAt: stamp.retrievedAt,
        sourceUpdatedAt: null,
        coverage: `${team.name}, ${season} regular season: ${all.length} five-player lineups and ${onOffRows.length} players’ on/off splits from NBA.com Stats.`,
        warnings: [],
      },
    });
  }
}
