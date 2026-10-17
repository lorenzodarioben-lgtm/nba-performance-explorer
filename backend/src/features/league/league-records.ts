// Record book, record progression and season team rankings over the league archive. Records
// count only seasons (and scopes) whose box scores add up; every other season is listed as
// excluded with its reason, so no record claims to cover games it has not seen.
import {
  LeagueRecordsResponseSchema,
  LeagueTeamRankingsResponseSchema,
  type LeagueRecordCategory,
  type LeagueRecordsQuery,
  type LeagueRecordsResponse,
  type LeagueScope,
  type LeagueTeamMetric,
  type LeagueTeamRankingsResponse,
} from '@nba-performance-explorer/contracts';
import { value } from './league-archive.js';
import type { Line, LineField } from './league-data.js';
import {
  LeagueRequestError,
  snapshotProvenance,
  sumLines,
  teamRef,
  type LeagueService,
} from './league-service.js';
import { shooting } from './league-teams.js';

const CATEGORY: Record<LeagueRecordCategory, { field: LineField; label: string }> = {
  points: { field: 'pts', label: 'Points' },
  rebounds: { field: 'reb', label: 'Rebounds' },
  assists: { field: 'ast', label: 'Assists' },
  steals: { field: 'stl', label: 'Steals' },
  blocks: { field: 'blk', label: 'Blocks' },
  threesMade: { field: 'fg3m', label: '3-pointers made' },
  fieldGoalsMade: { field: 'fgm', label: 'Field goals made' },
  freeThrowsMade: { field: 'ftm', label: 'Free throws made' },
  offensiveRebounds: { field: 'oreb', label: 'Offensive rebounds' },
};
const MAX_INCOMPLETE = 0.005;
const TOP = 10;

interface Entry {
  value: number;
  playerId: number;
  season: string;
  teams: number[];
  game: {
    id: string;
    date: string;
    opponent: number;
    home: boolean;
    won: boolean;
  } | null;
  gamesPlayed: number | null;
}

/** The top ten and every entry tied with the tenth. */
function topWithTies(entries: Entry[]) {
  const sorted = [...entries].sort(
    (a, b) =>
      b.value - a.value ||
      (a.game?.date ?? a.season).localeCompare(b.game?.date ?? b.season),
  );
  const cutoff = sorted[TOP - 1]?.value;
  return cutoff === undefined
    ? sorted
    : sorted.filter((e) => e.value >= cutoff).slice(0, 60);
}

type Progression = (Entry & { kind: 'first' | 'new' | 'tie' })[];
type GameScan = Record<
  LeagueRecordCategory,
  { all: Entry[]; progression: Progression }
>;
// Single-game records read every player line of every covered season. One pass computes all
// categories, and the result is shared by every LeagueRecords over the same archive.
const gameScans = new WeakMap<object, Map<LeagueScope, GameScan>>();
const warming = new WeakMap<object, Map<LeagueScope, Promise<void>>>();

export class LeagueRecords {
  private readonly cache = new Map<string, LeagueRecordsResponse>();
  constructor(private readonly league: LeagueService) {}

  /** One season at a time, so a background warm-up can yield between seasons. */
  private *scanGames(scope: LeagueScope): Generator<void, GameScan> {
    const archive = this.league.archive;
    const cats = Object.keys(CATEGORY) as LeagueRecordCategory[];
    const scan = Object.fromEntries(
      cats.map((c) => [c, { all: [] as Entry[], progression: [] as Progression }]),
    ) as GameScan;
    const best = new Map<LeagueRecordCategory, number>();
    for (const season of this.coverage(scope).included) {
      const lines = archive
        .playerLines(season, scope)
        .sort(
          (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
        );
      for (const c of cats) {
        const field = CATEGORY[c].field;
        const entries: Entry[] = [];
        for (const l of lines) {
          const v = value(l.line, field);
          if (v === null) continue;
          entries.push({
            value: v,
            playerId: l.playerId,
            season,
            teams: [l.teamId],
            game: {
              id: l.gameId,
              date: l.date,
              opponent: l.opponentId,
              home: l.home,
              won: l.won,
            },
            gamesPlayed: null,
          });
        }
        if (!entries.length) continue;
        const r = scan[c];
        const b = best.get(c);
        if (b === undefined) {
          // The archive's first covered season sets the opening mark (all its ties included).
          const top = Math.max(...entries.map((e) => e.value));
          for (const e of entries.filter((x) => x.value === top))
            r.progression.push({ ...e, kind: 'first' });
          best.set(c, top);
        } else {
          let mark = b;
          for (const e of entries) {
            if (e.value > mark) {
              r.progression.push({ ...e, kind: 'new' });
              mark = e.value;
            } else if (e.value === mark) r.progression.push({ ...e, kind: 'tie' });
          }
          best.set(c, mark);
        }
        // Keep only what can still reach the top ten.
        r.all = topWithTies([...r.all, ...entries]);
      }
      yield;
    }
    return scan;
  }

  private gameScan(scope: LeagueScope): GameScan {
    const archive = this.league.archive;
    const byScope = gameScans.get(archive) ?? new Map<LeagueScope, GameScan>();
    gameScans.set(archive, byScope);
    let scan = byScope.get(scope);
    if (!scan) {
      const it = this.scanGames(scope);
      let step = it.next();
      while (!step.done) step = it.next();
      scan = step.value;
      byScope.set(scope, scan);
    }
    return scan;
  }

  /** Computes the regular-season game records in the background, yielding between seasons. */
  warm(scope: LeagueScope = 'regular-season'): Promise<void> {
    const archive = this.league.archive;
    const byScope = gameScans.get(archive) ?? new Map<LeagueScope, GameScan>();
    gameScans.set(archive, byScope);
    if (byScope.has(scope)) return Promise.resolve();
    const pending = warming.get(archive) ?? new Map<LeagueScope, Promise<void>>();
    warming.set(archive, pending);
    const running = pending.get(scope);
    if (running) return running;
    const run = (async () => {
      const it = this.scanGames(scope);
      let step = it.next();
      while (!step.done) {
        await new Promise((resolve) => setImmediate(resolve));
        if (byScope.has(scope)) return;
        step = it.next();
      }
      byScope.set(scope, step.value);
    })().finally(() => pending.delete(scope));
    pending.set(scope, run);
    return run;
  }

  /** Like records(), but waits for a warm-up already under way instead of repeating its work. */
  async recordsWhenReady(q: LeagueRecordsQuery): Promise<LeagueRecordsResponse> {
    const running = warming.get(this.league.archive)?.get(q.scope);
    if (q.kind === 'game' && running) await running;
    return this.records(q);
  }

  private coverage(scope: LeagueScope) {
    const included: string[] = [];
    const excluded: { season: string; reason: string }[] = [];
    for (const season of this.league.archive.seasons) {
      const sc = this.league.archive.summary(season).scopes[scope];
      if (!sc) {
        excluded.push({ season, reason: 'No games of this kind archived.' });
        continue;
      }
      const share = sc.incompleteBoxGames.length / Math.max(1, sc.gameCount);
      if (share > MAX_INCOMPLETE)
        excluded.push({
          season,
          reason: `${sc.incompleteBoxGames.length} of ${sc.gameCount} box scores do not add up to the team totals.`,
        });
      else included.push(season);
    }
    return { included, excluded };
  }

  records(q: LeagueRecordsQuery): LeagueRecordsResponse {
    const key = JSON.stringify(q);
    const hit = this.cache.get(key);
    if (hit)
      return {
        ...hit,
        provenance: { ...hit.provenance, servedAt: new Date().toISOString() },
      };
    const cat = CATEGORY[q.category];
    const { included, excluded } = this.coverage(q.scope);
    const archive = this.league.archive;
    const all: Entry[] = [];
    const progression: (Entry & { kind: 'first' | 'new' | 'tie' })[] = [];
    let best: number | null = null;
    for (const season of included) {
      if (q.kind === 'game') {
        continue;
      } else {
        const sc = archive.summary(season).scopes[q.scope]!;
        const maxGames = Math.max(...sc.teams.map((t) => t.gp));
        const minGames =
          q.mode === 'per-game'
            ? q.scope === 'playoffs'
              ? 4
              : Math.ceil(0.7 * maxGames)
            : 0;
        const byPlayer = new Map<
          number,
          { gp: number; lines: Line[]; teams: { id: number; first: string }[] }
        >();
        for (const st of sc.players) {
          const r = byPlayer.get(st.playerId) ?? { gp: 0, lines: [], teams: [] };
          r.gp += st.gp;
          r.lines.push(st.totals);
          r.teams.push({ id: st.teamId, first: st.firstGame });
          byPlayer.set(st.playerId, r);
        }
        const seasonEntries: Entry[] = [];
        for (const [playerId, r] of byPlayer) {
          const total = value(sumLines(r.lines), cat.field);
          if (total === null || r.gp < minGames) continue;
          seasonEntries.push({
            value:
              q.mode === 'per-game' ? Math.round((total / r.gp) * 100) / 100 : total,
            playerId,
            season,
            teams: r.teams
              .sort((a, b) => a.first.localeCompare(b.first))
              .map((t) => t.id),
            game: null,
            gamesPlayed: r.gp,
          });
        }
        all.push(...seasonEntries);
        // Progression of the single-season record: the season's best, compared with the record so far.
        const top = Math.max(...seasonEntries.map((e) => e.value));
        for (const e of seasonEntries.filter((x) => x.value === top)) {
          if (best === null || e.value > best)
            progression.push({ ...e, kind: best === null ? 'first' : 'new' });
          else if (e.value === best) progression.push({ ...e, kind: 'tie' });
        }
        if (best === null || top > best) best = top;
      }
    }
    if (q.kind === 'game') {
      const scan = this.gameScan(q.scope)[q.category];
      all.push(...scan.all);
      progression.push(...scan.progression);
    }
    const top = topWithTies(all);
    const rankOf = (v: number) => top.findIndex((e) => e.value === v) + 1;
    const toRow = (e: Entry, rank: number) => {
      const s = archive.summary(e.season);
      return {
        rank,
        value: e.value,
        playerId: String(e.playerId),
        name: this.league.name(s, e.playerId),
        season: e.season,
        teams: e.teams.map((t) => teamRef(s, t)),
        game: e.game
          ? {
              id: e.game.id,
              date: e.game.date,
              opponent: teamRef(s, e.game.opponent),
              home: e.game.home,
              won: e.game.won,
            }
          : null,
        gamesPlayed: e.gamesPlayed,
      };
    };
    const latest = archive.summary(archive.seasons.at(-1)!);
    const scopeText = q.scope === 'playoffs' ? 'playoff' : 'regular-season';
    const response = LeagueRecordsResponseSchema.parse({
      query: q,
      definition: (q.kind === 'game'
        ? `Most ${cat.label.toLowerCase()} by one player in a ${scopeText} game.`
        : q.mode === 'per-game'
          ? `Highest ${cat.label.toLowerCase()} per game over a ${scopeText === 'playoff' ? 'playoff run (at least 4 games)' : 'regular season (at least 70% of the most games any team played)'}; this app's qualification, not the NBA's.`
          : `Most ${cat.label.toLowerCase()} in one ${scopeText === 'playoff' ? 'playoff run' : 'regular season'}, all teams combined.`
      ).slice(0, 400),
      coverage: { included, excluded },
      records: top.map((e) => toRow(e, rankOf(e.value))),
      progression: progression
        .slice(-200)
        .map((e) => ({ ...toRow(e, 1), kind: e.kind })),
      provenance: snapshotProvenance(
        latest,
        `Within this archive only: ${included.length} seasons (${included[0]} to ${included.at(-1)}) whose ${scopeText} box scores add up to the team totals. Not all-time NBA records: seasons before ${archive.seasons[0]} and the ${excluded.length} excluded seasons are not covered.`,
      ),
    });
    this.cache.set(key, response);
    return response;
  }

  teamRankings(
    seasonArg: string | undefined,
    scope: LeagueScope,
    metric: LeagueTeamMetric,
  ): LeagueTeamRankingsResponse {
    const archive = this.league.archive;
    const season = seasonArg ?? archive.seasons.at(-1)!;
    if (!archive.has(season))
      throw new LeagueRequestError(
        404,
        'LEAGUE_SEASON_NOT_ARCHIVED',
        `Season ${season} is not in the league archive.`,
      );
    const s = archive.summary(season);
    const sc = s.scopes[scope];
    if (!sc)
      throw new LeagueRequestError(
        404,
        'LEAGUE_SCOPE_EMPTY',
        `No ${scope} games are archived for ${season}.`,
      );
    const ratings = s.teamRatings?.[scope] ?? null;
    const lower =
      metric === 'opponentPointsPerGame' ||
      metric === 'defensiveRating' ||
      metric === 'turnoversPerGame';
    const RATING: Partial<
      Record<LeagueTeamMetric, 'offRating' | 'defRating' | 'netRating' | 'pace'>
    > = {
      offensiveRating: 'offRating',
      defensiveRating: 'defRating',
      netRating: 'netRating',
      pace: 'pace',
    };
    const DEF: Record<LeagueTeamMetric, string> = {
      winPercentage: 'Wins ÷ games.',
      pointsPerGame: 'Points scored ÷ games.',
      opponentPointsPerGame: 'Points allowed ÷ games.',
      pointDifferential: '(Points scored − points allowed) ÷ games.',
      offensiveRating: 'NBA.com: points scored per 100 possessions.',
      defensiveRating: 'NBA.com: points allowed per 100 possessions.',
      netRating: 'NBA.com: offensive minus defensive rating.',
      pace: 'NBA.com: possessions per 48 minutes.',
      fieldGoalPercentage: 'Field goals made ÷ attempted, from season totals.',
      threePointPercentage: '3-pointers made ÷ attempted, from season totals.',
      freeThrowPercentage: 'Free throws made ÷ attempted, from season totals.',
      trueShootingPercentage: 'Points ÷ (2 × (FGA + 0.44 × FTA)), from season totals.',
      reboundsPerGame: 'Rebounds ÷ games.',
      assistsPerGame: 'Assists ÷ games.',
      turnoversPerGame: 'Turnovers ÷ games.',
    };
    let unavailable: string | null = null;
    const rows = sc.teams
      .map((t) => {
        const per = (f: LineField, line: Line = t.totals) => {
          const v = value(line, f);
          return v === null ? null : v / t.gp;
        };
        const sh = shooting(t.totals);
        const rating = RATING[metric]
          ? (ratings?.find((r) => r.teamId === t.teamId)?.[RATING[metric]!] ?? null)
          : undefined;
        const v: number | null =
          rating !== undefined
            ? rating
            : metric === 'winPercentage'
              ? t.w / t.gp
              : metric === 'pointsPerGame'
                ? per('pts')
                : metric === 'opponentPointsPerGame'
                  ? per('pts', t.opponent)
                  : metric === 'pointDifferential'
                    ? per('pts') === null || per('pts', t.opponent) === null
                      ? null
                      : per('pts')! - per('pts', t.opponent)!
                    : metric === 'fieldGoalPercentage'
                      ? sh.fieldGoal
                      : metric === 'threePointPercentage'
                        ? sh.threePoint
                        : metric === 'freeThrowPercentage'
                          ? sh.freeThrow
                          : metric === 'trueShootingPercentage'
                            ? sh.trueShooting
                            : metric === 'reboundsPerGame'
                              ? per('reb')
                              : metric === 'assistsPerGame'
                                ? per('ast')
                                : per('tov');
        return { t, v };
      })
      .filter((x): x is { t: (typeof sc.teams)[number]; v: number } => x.v !== null);
    if (RATING[metric] && !ratings)
      unavailable = `NBA.com publishes no team ratings or pace for ${season} ${scope === 'playoffs' ? 'playoffs' : 'regular season'} (they start in 1996–97), and this app does not estimate possessions.`;
    else if (!rows.length)
      unavailable = `The source did not record the inputs for this measure in ${season}.`;
    const sorted = rows.sort((a, b) => (lower ? a.v - b.v : b.v - a.v));
    return LeagueTeamRankingsResponseSchema.parse({
      query: { season, scope, metric },
      definition: DEF[metric],
      direction: lower ? 'lower-is-better' : 'higher-is-better',
      rows: sorted.map(({ t, v }) => ({
        rank: sorted.findIndex((x) => x.v === v) + 1,
        team: teamRef(s, t.teamId),
        gamesPlayed: t.gp,
        wins: t.w,
        losses: t.l,
        value: Math.round(v * 10000) / 10000,
      })),
      unavailable,
      provenance: snapshotProvenance(
        s,
        `${season} ${scope === 'playoffs' ? 'playoffs' : 'regular season'}: ${sc.teams.length} teams, totals summed from NBA.com team game logs; ratings and pace are NBA.com's own.`,
        s.statusNotes,
      ),
    });
  }
}
