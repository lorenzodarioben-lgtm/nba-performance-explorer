// League environment by season (from the archive's exact team totals and minutes) and the
// league-relative player index: a player's per-36 rate ÷ the league's per-36 rate that season,
// × 100; for shooting, TS% ÷ league TS% × 100.
import {
  LeagueEraPlayersResponseSchema,
  LeagueErasResponseSchema,
  type LeagueEnvironment,
  type LeagueEraPlayersResponse,
  type LeagueErasResponse,
} from '@nba-performance-explorer/contracts';
import { value } from './league-archive.js';
import type { Line, LineField } from './league-data.js';
import {
  snapshotProvenance,
  sumLines,
  teamRef,
  type LeagueService,
} from './league-service.js';

export const ERA_MODEL =
  'League-relative index: for points, rebounds, assists, steals, blocks and 3-pointers, a player’s rate per 36 minutes divided by the league’s rate per 36 player-minutes in the same regular season, × 100; for shooting, the player’s true shooting % divided by the league’s, × 100. 100 is exactly the league rate that season. League rates come from every team’s summed box scores and minutes, so differences in pace and scoring level between eras cancel out. Regular season only.';
export const ERA_CAVEATS = [
  'Covers 1983–84 to the latest archived season only: earlier seasons are outside the archive, and NBA.com’s team-by-year table records too few fields before then to build a league rate.',
  'It does not adjust for teammates, role, opponents, rules, roster size, expansion or how minutes are shared, so it describes a season against its league; it does not rank players across eras.',
  'A per-minute index favours low-minute seasons with high rates; the career summary uses only seasons above the minutes minimum, weighted by minutes.',
  'A category the league did not record in a season has no index for that season.',
];

const ratio = (a: number | null, b: number | null) =>
  a === null || b === null || b === 0 ? null : a / b;
const round = (v: number | null, d = 4) =>
  v === null ? null : Math.round(v * 10 ** d) / 10 ** d;

export class LeagueEras {
  private envCache: LeagueEnvironment[] | null = null;
  constructor(private readonly league: LeagueService) {}

  environment(): LeagueEnvironment[] {
    if (this.envCache) return this.envCache;
    const archive = this.league.archive;
    this.envCache = archive.seasons.map((season) => {
      const s = archive.summary(season);
      const reg = s.scopes['regular-season'];
      const t = sumLines(reg.teams.map((x) => x.totals));
      const v = (f: LineField) => value(t, f);
      const games = reg.teams.reduce((n, x) => n + x.gp, 0);
      const per = (f: LineField) => (v(f) === null ? null : v(f)! / games);
      const minutes = v('min');
      const per36 = (f: LineField) =>
        v(f) === null || !minutes ? null : (v(f)! / minutes) * 36;
      const ratings = s.teamRatings?.['regular-season'] ?? null;
      const poss = ratings?.reduce((n, r) => n + r.possessions, 0) ?? 0;
      const weighted = (k: 'pace' | 'offRating') =>
        ratings && poss
          ? ratings.reduce((n, r) => n + r[k] * r.possessions, 0) / poss
          : null;
      const fga = v('fga'),
        fta = v('fta'),
        pts = v('pts');
      return {
        season,
        teams: reg.teams.length,
        teamGames: games,
        points: round(per('pts'), 2)!,
        fieldGoalAttempts: round(per('fga'), 2),
        threePointAttempts: round(per('fg3a'), 2),
        freeThrowAttempts: round(per('fta'), 2),
        rebounds: round(per('reb'), 2),
        assists: round(per('ast'), 2),
        turnovers: round(per('tov'), 2),
        fieldGoalPct: round(ratio(v('fgm'), fga)),
        threePointPct: round(ratio(v('fg3m'), v('fg3a'))),
        freeThrowPct: round(ratio(v('ftm'), fta)),
        effectiveFieldGoalPct: round(
          v('fgm') === null || v('fg3m') === null
            ? null
            : ratio(v('fgm')! + 0.5 * v('fg3m')!, fga),
        ),
        trueShootingPct: round(
          pts === null || fga === null || fta === null
            ? null
            : pts / (2 * (fga + 0.44 * fta)),
        ),
        threePointRate: round(ratio(v('fg3a'), fga)),
        freeThrowRate: round(ratio(fta, fga)),
        pace: round(weighted('pace'), 2),
        offensiveRating: round(weighted('offRating'), 2),
        per36: {
          points: round(per36('pts'))!,
          rebounds: round(per36('reb')),
          assists: round(per36('ast')),
          steals: round(per36('stl')),
          blocks: round(per36('blk')),
          threesMade: round(per36('fg3m')),
        },
      };
    });
    return this.envCache;
  }

  eras(): LeagueErasResponse {
    const archive = this.league.archive;
    return LeagueErasResponseSchema.parse({
      seasons: this.environment(),
      model: ERA_MODEL,
      caveats: ERA_CAVEATS,
      provenance: snapshotProvenance(
        archive.summary(archive.seasons.at(-1)!),
        `League averages for ${archive.seasons.length} regular seasons from every team’s summed NBA.com box scores; pace and offensive rating are NBA.com’s own (1996–97 on), weighted by possessions.`,
      ),
    });
  }

  players(ids: string[], minMinutes: number): LeagueEraPlayersResponse {
    const archive = this.league.archive;
    const env = new Map(this.environment().map((e) => [e.season, e]));
    const players: LeagueEraPlayersResponse['players'] = [];
    const missing: string[] = [];
    const FIELDS: [keyof LeagueEnvironment['per36'], LineField][] = [
      ['points', 'pts'],
      ['rebounds', 'reb'],
      ['assists', 'ast'],
      ['steals', 'stl'],
      ['blocks', 'blk'],
      ['threesMade', 'fg3m'],
    ];
    for (const id of ids) {
      const pid = Number(id);
      const seasons = archive.seasons.filter((s) =>
        archive
          .summary(s)
          .scopes['regular-season'].players.some((p) => p.playerId === pid),
      );
      if (!seasons.length) {
        missing.push(id);
        continue;
      }
      let name = '';
      const rows: LeagueEraPlayersResponse['players'][number]['seasons'] = [];
      for (const season of seasons) {
        const s = archive.summary(season);
        name = this.league.name(s, pid);
        const stints = s.scopes['regular-season'].players
          .filter((p) => p.playerId === pid)
          .sort((a, b) => a.firstGame.localeCompare(b.firstGame));
        const t: Line = sumLines(stints.map((p) => p.totals));
        const gp = stints.reduce((n, p) => n + p.gp, 0);
        const min = value(t, 'min');
        const e = env.get(season)!;
        const raw = Object.fromEntries(
          FIELDS.map(([k, f]) => [
            k,
            round(value(t, f) === null ? null : value(t, f)! / gp, 2),
          ]),
        );
        const index = Object.fromEntries(
          FIELDS.map(([k, f]) => {
            const mine =
              value(t, f) === null || !min ? null : (value(t, f)! / min) * 36;
            return [
              k,
              round(
                ratio(mine, e.per36[k]) === null
                  ? null
                  : ratio(mine, e.per36[k])! * 100,
                1,
              ),
            ];
          }),
        );
        const fga = value(t, 'fga'),
          fta = value(t, 'fta'),
          pts = value(t, 'pts');
        const ts =
          pts === null || fga === null || fta === null || fga + fta === 0
            ? null
            : pts / (2 * (fga + 0.44 * fta));
        rows.push({
          season,
          teams: stints.map((p) => teamRef(s, p.teamId).abbreviation),
          gamesPlayed: gp,
          minutes: min,
          raw: {
            ...raw,
            trueShooting: round(ts),
          } as LeagueEraPlayersResponse['players'][number]['seasons'][number]['raw'],
          index: {
            ...index,
            trueShooting: round(
              ts === null || !e.trueShootingPct ? null : (ts / e.trueShootingPct) * 100,
              1,
            ),
          } as LeagueEraPlayersResponse['players'][number]['seasons'][number]['index'],
          inSummary: (min ?? 0) >= minMinutes,
        });
      }
      const inSum = rows.filter((r) => r.inSummary);
      const totalMin = inSum.reduce((n, r) => n + (r.minutes ?? 0), 0);
      const mean = (pick: (r: (typeof rows)[number]) => number | null) => {
        const usable = inSum.filter((r) => pick(r) !== null && r.minutes);
        const m = usable.reduce((n, r) => n + r.minutes!, 0);
        return m
          ? round(usable.reduce((n, r) => n + pick(r)! * r.minutes!, 0) / m, 2)
          : null;
      };
      const keys = [
        'points',
        'rebounds',
        'assists',
        'steals',
        'blocks',
        'threesMade',
        'trueShooting',
      ] as const;
      players.push({
        playerId: id,
        name,
        mayPredateArchive: seasons[0] === archive.seasons[0],
        seasons: rows,
        summary: {
          seasons: inSum.length,
          minutes: totalMin,
          raw: Object.fromEntries(
            keys.map((k) => [k, mean((r) => r.raw[k])]),
          ) as LeagueEraPlayersResponse['players'][number]['summary']['raw'],
          index: Object.fromEntries(
            keys.map((k) => [k, mean((r) => r.index[k])]),
          ) as LeagueEraPlayersResponse['players'][number]['summary']['index'],
        },
      });
    }
    return LeagueEraPlayersResponseSchema.parse({
      minMinutes,
      players,
      missing,
      model: ERA_MODEL,
      provenance: snapshotProvenance(
        archive.summary(archive.seasons.at(-1)!),
        `${players.length} players’ archived regular seasons, against each season’s league rates. ${ERA_CAVEATS[1]}`,
      ),
    });
  }
}
