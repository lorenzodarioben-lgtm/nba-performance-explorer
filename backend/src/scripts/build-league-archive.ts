// Opt-in league archive build from NBA.com Stats. Never invoked by startup, tests or CI.
//
//   npx tsx backend/src/scripts/build-league-archive.ts --seasons 2023-24,2024-25 [--write]
//   npx tsx backend/src/scripts/build-league-archive.ts --from 1996-97 --to 2025-26 --write
//
// Per season it makes up to nine serial requests (team and player game logs for the regular
// season and playoffs, standings, team ratings and NBA.com's own player season totals), with a
// pause between requests and no parallelism. Raw responses are cached on disk (`--cache`, default
// in the OS temp folder) so a rerun does not refetch. Without --write it only prints the checks.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import {
  LINE_FIELDS,
  LeagueIndexSchema,
  LeagueSeasonGamesSchema,
  LeagueSeasonSummarySchema,
  type LeagueScope,
  type LeagueSeasonGames,
  type LeagueSeasonSummary,
  type Line,
  type ScopeGames,
  type ScopeSummary,
  type TeamRating,
} from '../features/league/league-data.js';

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
if (argv.includes('--help')) {
  console.log(
    'Flags: --seasons a,b | --from 1996-97 --to 2025-26, --write, --cache <dir>, --delay <ms>.',
  );
  process.exit(0);
}
const label = (start: number) =>
  `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
const seasons: string[] = flag('--seasons')
  ? flag('--seasons')!.split(',')
  : (() => {
      const from = Number(flag('--from')?.slice(0, 4));
      const to = Number(flag('--to')?.slice(0, 4));
      if (!from || !to || to < from) throw new Error('Use --seasons or --from/--to.');
      return Array.from({ length: to - from + 1 }, (_, i) => label(from + i));
    })();
for (const s of seasons)
  if (!/^\d{4}-\d{2}$/.test(s) || label(Number(s.slice(0, 4))) !== s)
    throw new Error(`Bad season ${s}`);
const write = argv.includes('--write');
const cacheDir = resolve(flag('--cache') ?? join(tmpdir(), 'nba-league-archive-cache'));
const delayMs = Number(flag('--delay') ?? 1500);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const dataDir = resolve(root, 'backend/src/features/league/data');
mkdirSync(cacheDir, { recursive: true });

const client = createNbaStatsHttpClient({ timeoutMs: 45_000 });
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
let lastRequest = 0;

interface ResultSet {
  headers: string[];
  rows: unknown[][];
}
interface Fetched {
  sets: Record<string, ResultSet>;
  request: LeagueSeasonSummary['source']['requests'][number];
}
async function fetchCached(endpoint: string, params: Record<string, string>) {
  const key = sha256(endpoint + JSON.stringify(params)).slice(0, 24);
  const cacheFile = join(cacheDir, `${endpoint}-${key}.json`);
  let body: { retrievedAt: string; json: unknown };
  if (existsSync(cacheFile)) body = JSON.parse(readFileSync(cacheFile, 'utf8'));
  else {
    const wait = lastRequest + delayMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    let json: unknown;
    for (let attempt = 1; ; attempt++) {
      try {
        json = await client.fetchEndpoint(endpoint, params);
        break;
      } catch (error) {
        // One slow retry for a transient timeout; a second failure stops the build.
        if (attempt >= 2) throw error;
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
    lastRequest = Date.now();
    body = { retrievedAt: new Date().toISOString(), json };
    writeFileSync(cacheFile, JSON.stringify(body));
  }
  return body;
}
async function fetchStats(
  endpoint: string,
  params: Record<string, string>,
): Promise<Fetched> {
  const body = await fetchCached(endpoint, params);
  const raw = body.json as {
    resultSets?: { name: string; headers: string[]; rowSet: unknown[][] }[];
  };
  if (!Array.isArray(raw.resultSets)) throw new Error(`${endpoint}: no resultSets`);
  const sets: Record<string, ResultSet> = {};
  for (const s of raw.resultSets) sets[s.name] = { headers: s.headers, rows: s.rowSet };
  const first = raw.resultSets[0];
  return {
    sets,
    request: {
      endpoint,
      params,
      retrievedAt: body.retrievedAt,
      rows: first?.rowSet.length ?? 0,
      sha256: sha256(JSON.stringify(raw.resultSets)),
    },
  };
}
const objects = (set: ResultSet | undefined) =>
  (set?.rows ?? []).map((row) =>
    Object.fromEntries(set!.headers.map((h, i) => [h, row[i]])),
  ) as Record<string, unknown>[];

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const SOURCE_FIELD: Record<(typeof LINE_FIELDS)[number], string> = {
  min: 'MIN',
  fgm: 'FGM',
  fga: 'FGA',
  fg3m: 'FG3M',
  fg3a: 'FG3A',
  ftm: 'FTM',
  fta: 'FTA',
  oreb: 'OREB',
  dreb: 'DREB',
  reb: 'REB',
  ast: 'AST',
  stl: 'STL',
  blk: 'BLK',
  tov: 'TOV',
  pf: 'PF',
  pts: 'PTS',
  pm: 'PLUS_MINUS',
};
const lineOf = (row: Record<string, unknown>): Line =>
  LINE_FIELDS.map((f) => num(row[SOURCE_FIELD[f]]));
/** Sums lines field by field; a field is null when any contributing line lacks it. */
const sumLines = (lines: Line[]): Line =>
  LINE_FIELDS.map((_, i) =>
    lines.length && lines.every((l) => l[i] !== null)
      ? Math.round(lines.reduce((t, l) => t + (l[i] as number), 0) * 1000) / 1000
      : null,
  );
const isoDate = (v: unknown) => {
  const d = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Bad date ${String(v)}`);
  return d;
};
const BOX_CHECK = ['pts', 'fgm', 'fga', 'ftm', 'fta'] as const;

/** Game IDs whose two team rows both read "@": played at a neutral site. */
export function neutralCandidates(teamRows: Record<string, unknown>[]) {
  const byGame = new Map<string, Record<string, unknown>[]>();
  for (const r of teamRows)
    byGame.set(String(r.GAME_ID), [...(byGame.get(String(r.GAME_ID)) ?? []), r]);
  return [...byGame]
    .filter(
      ([, rows]) =>
        rows.length === 2 && rows.every((r) => / @ /.test(String(r.MATCHUP))),
    )
    .map(([id]) => id);
}

function buildScope(
  teamRows: Record<string, unknown>[],
  playerRows: Record<string, unknown>[],
  /** Designated home team of each neutral-site game, from NBA.com's box score. */
  neutralHome: Map<string, number>,
): {
  summary: Omit<ScopeSummary, 'sourceTotalsCheck' | 'playerPossessions'>;
  games: ScopeGames;
} {
  const byGame = new Map<string, Record<string, unknown>[]>();
  for (const r of teamRows) {
    const id = String(r.GAME_ID);
    byGame.set(id, [...(byGame.get(id) ?? []), r]);
  }
  const playersByTeamGame = new Map<string, Record<string, unknown>[]>();
  for (const r of playerRows) {
    const k = `${String(r.GAME_ID)}|${String(r.TEAM_ID)}`;
    playersByTeamGame.set(k, [...(playersByTeamGame.get(k) ?? []), r]);
  }
  const quarantined: ScopeSummary['quarantined'] = [];
  const incomplete: string[] = [];
  const games: ScopeGames['games'] = [];
  const teamLines: ScopeGames['teamLines'] = [];
  const playerLines: ScopeGames['playerLines'] = [];
  const valid = new Set<string>();
  for (const [gameId, rows] of [...byGame].sort(([a], [b]) => a.localeCompare(b))) {
    const designated = neutralHome.get(gameId);
    const neutral = designated !== undefined;
    const home = neutral
      ? rows.filter((r) => Number(r.TEAM_ID) === designated)
      : rows.filter((r) => / vs\. /.test(String(r.MATCHUP)));
    const away = neutral
      ? rows.filter((r) => Number(r.TEAM_ID) !== designated)
      : rows.filter((r) => / @ /.test(String(r.MATCHUP)));
    const reason =
      rows.length !== 2
        ? `${rows.length} team rows`
        : home.length !== 1 || away.length !== 1
          ? 'no single home and away row'
          : home[0]!.TEAM_ID === away[0]!.TEAM_ID
            ? 'same team twice'
            : isoDate(home[0]!.GAME_DATE) !== isoDate(away[0]!.GAME_DATE)
              ? 'dates differ'
              : num(home[0]!.PTS) === null || num(away[0]!.PTS) === null
                ? 'missing score'
                : num(home[0]!.PTS) === num(away[0]!.PTS)
                  ? num(home[0]!.PTS) === 0
                    ? 'listed without a score (not played)'
                    : 'tied final score'
                  : (home[0]!.WL === 'W') !== num(home[0]!.PTS)! > num(away[0]!.PTS)! ||
                      home[0]!.WL === away[0]!.WL
                    ? 'result does not match the scores'
                    : null;
    if (reason) {
      quarantined.push({
        gameId,
        reason,
        date: rows[0] ? isoDate(rows[0].GAME_DATE) : null,
        teamIds: [...new Set(rows.map((r) => Number(r.TEAM_ID)))].slice(0, 2),
      });
      continue;
    }
    const h = home[0]!,
      a = away[0]!;
    valid.add(gameId);
    games.push([
      gameId,
      isoDate(h.GAME_DATE),
      Number(h.TEAM_ID),
      Number(a.TEAM_ID),
      num(h.PTS)!,
      num(a.PTS)!,
      neutral ? 1 : 0,
    ]);
    let complete = true;
    for (const t of [h, a]) {
      const tl = lineOf(t);
      teamLines.push([gameId, Number(t.TEAM_ID), ...tl]);
      const pls = playersByTeamGame.get(`${gameId}|${String(t.TEAM_ID)}`) ?? [];
      for (const p of pls)
        playerLines.push([
          gameId,
          Number(p.PLAYER_ID),
          Number(p.TEAM_ID),
          ...lineOf(p),
        ]);
      const sum = sumLines(pls.map(lineOf));
      for (const f of BOX_CHECK) {
        const i = LINE_FIELDS.indexOf(f);
        if (tl[i] !== null && (sum[i] === null || Math.abs(sum[i]! - tl[i]!) > 0.001))
          complete = false;
      }
    }
    if (!complete) incomplete.push(gameId);
  }
  // Player lines whose game was quarantined are dropped with it.
  const teamIds = [...new Set(games.flatMap((g) => [g.at(2), g.at(3)] as number[]))];
  const teams = teamIds.map((teamId) => {
    const own = teamLines.filter((l) => l[1] === teamId);
    const theirGames = new Set(own.map((l) => l[0]));
    const opp = teamLines.filter((l) => theirGames.has(l[0]) && l[1] !== teamId);
    const won = games.filter(
      (g) => (g[2] === teamId && g[4] > g[5]) || (g[3] === teamId && g[5] > g[4]),
    ).length;
    return {
      teamId,
      gp: own.length,
      w: won,
      l: own.length - won,
      totals: sumLines(own.map((l) => l.slice(2) as Line)),
      opponent: sumLines(opp.map((l) => l.slice(2) as Line)),
    };
  });
  const dateOf = new Map(games.map((g) => [g[0], g[1]]));
  const stintKey = (l: ScopeGames['playerLines'][number]) => `${l[1]}|${l[2]}`;
  const stints = new Map<string, ScopeGames['playerLines']>();
  for (const l of playerLines)
    stints.set(stintKey(l), [...(stints.get(stintKey(l)) ?? []), l]);
  const players = [...stints.values()].map((ls) => {
    const dates = ls.map((l) => dateOf.get(l[0])!).sort();
    return {
      playerId: ls[0]![1],
      teamId: ls[0]![2],
      gp: ls.length,
      totals: sumLines(ls.map((l) => l.slice(3) as Line)),
      firstGame: dates[0]!,
      lastGame: dates.at(-1)!,
    };
  });
  const dates = games.map((g) => g[1]).sort();
  return {
    summary: {
      gameCount: games.length,
      quarantined,
      incompleteBoxGames: incomplete,
      teams,
      players,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    },
    games: { games, teamLines, playerLines },
  };
}

const PLAYER_STATS_PARAMS = (season: string, seasonType: string) => ({
  College: '',
  Conference: '',
  Country: '',
  DateFrom: '',
  DateTo: '',
  Division: '',
  DraftPick: '',
  DraftYear: '',
  GameScope: '',
  GameSegment: '',
  Height: '',
  LastNGames: '0',
  LeagueID: '00',
  Location: '',
  MeasureType: 'Base',
  Month: '0',
  OpponentTeamID: '0',
  Outcome: '',
  PORound: '0',
  PaceAdjust: 'N',
  PerMode: 'Totals',
  Period: '0',
  PlayerExperience: '',
  PlayerPosition: '',
  PlusMinus: 'N',
  Rank: 'N',
  Season: season,
  SeasonSegment: '',
  SeasonType: seasonType,
  ShotClockRange: '',
  StarterBench: '',
  TeamID: '0',
  TwoWay: '0',
  VsConference: '',
  VsDivision: '',
  Weight: '',
});
const TEAM_ADVANCED_PARAMS = (season: string, seasonType: string) => ({
  Conference: '',
  DateFrom: '',
  DateTo: '',
  Division: '',
  GameScope: '',
  GameSegment: '',
  Height: '',
  LastNGames: '0',
  LeagueID: '00',
  Location: '',
  MeasureType: 'Advanced',
  Month: '0',
  OpponentTeamID: '0',
  Outcome: '',
  PORound: '0',
  PaceAdjust: 'N',
  PerMode: 'Totals',
  Period: '0',
  PlayerExperience: '',
  PlayerPosition: '',
  PlusMinus: 'N',
  Rank: 'N',
  Season: season,
  SeasonSegment: '',
  SeasonType: seasonType,
  ShotClockRange: '',
  StarterBench: '',
  TeamID: '0',
  TwoWay: '0',
  VsConference: '',
  VsDivision: '',
});
const SEASON_TYPE: Record<LeagueScope, string> = {
  'regular-season': 'Regular Season',
  playoffs: 'Playoffs',
};

/** Compares NBA.com's season totals with the sum of every archived box line per player. */
function sourceTotalsCheck(
  summary: Omit<ScopeSummary, 'sourceTotalsCheck' | 'playerPossessions'>,
  rows: Record<string, unknown>[],
): ScopeSummary['sourceTotalsCheck'] {
  if (!rows.length) return null;
  const combined = new Map<number, { gp: number; lines: Line[] }>();
  for (const s of summary.players) {
    const c = combined.get(s.playerId) ?? { gp: 0, lines: [] };
    c.gp += s.gp;
    c.lines.push(s.totals);
    combined.set(s.playerId, c);
  }
  const mismatches: string[] = [];
  let matched = 0,
    restatements = 0;
  for (const r of rows) {
    const id = Number(r.PLAYER_ID);
    const ours = combined.get(id);
    const theirs = lineOf(r);
    const sum = ours ? sumLines(ours.lines) : null;
    const diffs: string[] = [];
    let major = false;
    if (!ours) {
      diffs.push('absent from game logs');
      major = true;
    } else {
      if (ours.gp !== num(r.GP)) {
        diffs.push(`GP ${ours.gp}/${String(r.GP)}`);
        major = true;
      }
      for (const f of [
        'pts',
        'reb',
        'ast',
        'stl',
        'blk',
        'fgm',
        'fga',
        'fg3m',
        'ftm',
        'fta',
        'tov',
      ] as const) {
        const i = LINE_FIELDS.indexOf(f);
        if (theirs[i] !== null && sum![i] !== theirs[i]) {
          diffs.push(`${f} ${sum![i]}/${theirs[i]}`);
          if (
            sum![i] === null ||
            Math.abs(sum![i]! - theirs[i]!) > (f === 'pts' ? 3 : 2)
          )
            major = true;
        }
      }
      const mi = LINE_FIELDS.indexOf('min');
      // Season minutes are published with decimals; game-log minutes are rounded per game.
      if (
        theirs[mi] !== null &&
        sum![mi] !== null &&
        Math.abs(sum![mi]! - theirs[mi]!) > ours.gp * 0.5 + 1
      ) {
        diffs.push(`min ${sum![mi]}/${theirs[mi]}`);
        major = true;
      }
    }
    if (diffs.length) {
      if (!major) restatements++;
      if (mismatches.length < 80)
        mismatches.push(
          `${major ? 'MAJOR' : 'restated'} ${id} ${String(r.PLAYER_NAME)}: ${diffs.join(', ')}`.slice(
            0,
            200,
          ),
        );
    } else matched++;
  }
  return { compared: rows.length, matched, restatements, mismatches };
}

async function buildSeason(season: string) {
  const requests: LeagueSeasonSummary['source']['requests'] = [];
  const take = (f: Fetched) => (requests.push(f.request), f);
  const scopes = {} as Record<
    LeagueScope,
    { summary: ScopeSummary; games: ScopeGames } | null
  >;
  const playerMeta = new Map<number, { name: string; age: number | null }>();
  const teamMeta = new Map<number, { abbreviation: string; name: string }>();
  const notes: string[] = [];
  const ratings: Record<LeagueScope, TeamRating[] | null> = {
    'regular-season': null,
    playoffs: null,
  };
  for (const scope of ['regular-season', 'playoffs'] as const) {
    const log = (who: 'T' | 'P') =>
      fetchStats('leaguegamelog', {
        Counter: '0',
        Direction: 'ASC',
        LeagueID: '00',
        PlayerOrTeam: who,
        Season: season,
        SeasonType: SEASON_TYPE[scope],
        Sorter: 'DATE',
      }).then(take);
    const teamRows = objects((await log('T')).sets.LeagueGameLog);
    if (!teamRows.length) {
      scopes[scope] = null;
      if (scope === 'regular-season')
        throw new Error(`${season}: no regular-season games`);
      continue;
    }
    const playerRows = objects((await log('P')).sets.LeagueGameLog);
    for (const r of teamRows)
      teamMeta.set(Number(r.TEAM_ID), {
        abbreviation: String(r.TEAM_ABBREVIATION),
        name: String(r.TEAM_NAME),
      });
    for (const r of playerRows)
      if (!playerMeta.has(Number(r.PLAYER_ID)))
        playerMeta.set(Number(r.PLAYER_ID), {
          name: String(r.PLAYER_NAME).trim(),
          age: null,
        });
    // Neutral-site games list both teams as visitors; NBA.com's box score names the
    // designated home team.
    const neutralHome = new Map<string, number>();
    for (const gameId of neutralCandidates(teamRows)) {
      const params = {
        EndPeriod: '0',
        EndRange: '0',
        GameID: gameId,
        RangeType: '0',
        StartPeriod: '0',
        StartRange: '0',
      };
      const body = await fetchCached('boxscoretraditionalv3', params);
      const box = (body.json as { boxScoreTraditional?: { homeTeamId?: unknown } })
        .boxScoreTraditional;
      if (typeof box?.homeTeamId !== 'number')
        throw new Error(`${gameId}: the box score names no home team`);
      neutralHome.set(gameId, box.homeTeamId);
      requests.push({
        endpoint: 'boxscoretraditionalv3',
        params,
        retrievedAt: body.retrievedAt,
        rows: 1,
        sha256: sha256(JSON.stringify(box)),
      });
    }
    const built = buildScope(teamRows, playerRows, neutralHome);
    const seasonStats = objects(
      take(
        await fetchStats(
          'leaguedashplayerstats',
          PLAYER_STATS_PARAMS(season, SEASON_TYPE[scope]),
        ),
      ).sets.LeagueDashPlayerStats,
    );
    for (const r of seasonStats) {
      const m = playerMeta.get(Number(r.PLAYER_ID));
      if (m && scope === 'regular-season') m.age = num(r.AGE);
    }
    // NBA.com's own possession counts (published from 1996-97); never estimated here.
    const advancedPlayers = seasonStats.length
      ? objects(
          take(
            await fetchStats('leaguedashplayerstats', {
              ...PLAYER_STATS_PARAMS(season, SEASON_TYPE[scope]),
              MeasureType: 'Advanced',
            }),
          ).sets.LeagueDashPlayerStats,
        )
      : [];
    const possessions = advancedPlayers
      .map((r) => [Number(r.PLAYER_ID), num(r.POSS)] as const)
      .filter((p): p is readonly [number, number] => p[1] !== null && p[1] >= 0)
      .map(([id, poss]) => [id, poss] as [number, number]);
    scopes[scope] = {
      summary: {
        ...built.summary,
        sourceTotalsCheck: sourceTotalsCheck(built.summary, seasonStats),
        playerPossessions: possessions.length ? possessions : null,
      },
      games: built.games,
    };
    const adv = objects(
      take(
        await fetchStats(
          'leaguedashteamstats',
          TEAM_ADVANCED_PARAMS(season, SEASON_TYPE[scope]),
        ),
      ).sets.LeagueDashTeamStats,
    );
    ratings[scope] = adv.length
      ? adv.map((r) => ({
          teamId: Number(r.TEAM_ID),
          gp: num(r.GP) ?? 0,
          minutes: num(r.MIN) ?? 0,
          offRating: num(r.OFF_RATING)!,
          defRating: num(r.DEF_RATING)!,
          netRating: num(r.NET_RATING)!,
          pace: num(r.PACE)!,
          possessions: num(r.POSS)!,
        }))
      : null;
  }
  const standingRows = objects(
    take(
      await fetchStats('leaguestandingsv3', {
        LeagueID: '00',
        Season: season,
        SeasonType: 'Regular Season',
      }),
    ).sets.Standings,
  );
  const standings = standingRows.length
    ? standingRows.map((r) => ({
        teamId: Number(r.TeamID),
        conference: String(r.Conference) as 'East' | 'West',
        division: String(r.Division),
        playoffRank: num(r.PlayoffRank),
        divisionRank: num(r.DivisionRank),
        wins: num(r.WINS)!,
        losses: num(r.LOSSES)!,
        home: String(r.HOME ?? ''),
        road: String(r.ROAD ?? ''),
        lastTen: r.L10 ? String(r.L10).trim() : null,
        streak: r.strCurrentStreak ? String(r.strCurrentStreak).trim() : null,
        conferenceGamesBack: num(r.ConferenceGamesBack),
        clinch: r.ClinchIndicator ? String(r.ClinchIndicator).trim() || null : null,
      }))
    : null;

  // Season gate. Every condition that fails is recorded; the season is complete only if none do.
  const reg = scopes['regular-season']!.summary;
  if (reg.quarantined.length)
    notes.push(`${reg.quarantined.length} regular-season games quarantined.`);
  const incompleteShare = reg.incompleteBoxGames.length / Math.max(1, reg.gameCount);
  if (incompleteShare > 0.005)
    notes.push(
      `${reg.incompleteBoxGames.length} of ${reg.gameCount} regular-season box scores do not add up to the team totals.`,
    );
  if (standings) {
    const off = standings.filter((s) => {
      const t = reg.teams.find((x) => x.teamId === s.teamId);
      return !t || t.w !== s.wins || t.l !== s.losses;
    });
    if (off.length)
      notes.push(
        `Derived W-L differs from published standings for ${off.length} teams.`,
      );
  } else
    notes.push(
      'NBA.com publishes no standings table for this season; W-L derived from paired games only.',
    );
  const check = reg.sourceTotalsCheck;
  if (check?.restatements)
    notes.push(
      `${check.restatements} of ${check.compared} players' NBA.com season totals differ from their summed box lines by at most 2 in a category (3 points) with the same games played: a correction published in one NBA.com feed only. Box lines are kept as published.`,
    );
  const major = check ? check.compared - check.matched - check.restatements : 0;
  if (major)
    notes.push(
      `${major} of ${check!.compared} players' NBA.com season totals differ materially from their summed box lines.`,
    );
  if (!check)
    notes.push(
      'NBA.com publishes no player season totals for this season; totals come from box lines only.',
    );
  const failed =
    reg.quarantined.length > 0 ||
    incompleteShare > 0.005 ||
    notes.some((n) => n.startsWith('Derived W-L differs')) ||
    major > 0;
  const status = failed ? 'partial' : 'complete';

  const summary: LeagueSeasonSummary = LeagueSeasonSummarySchema.parse({
    kind: 'nba-stats-league-season',
    version: 1,
    season,
    builtAt: new Date().toISOString(),
    status,
    statusNotes: notes,
    source: { name: 'NBA.com Stats', requests },
    teams: [...teamMeta]
      .map(([teamId, t]) => ({ teamId, ...t }))
      .sort((a, b) => a.teamId - b.teamId),
    players: [...playerMeta]
      .map(([playerId, p]) => ({ playerId, name: p.name, age: p.age }))
      .sort((a, b) => a.playerId - b.playerId),
    scopes: {
      'regular-season': scopes['regular-season']!.summary,
      playoffs: scopes.playoffs?.summary ?? null,
    },
    standings,
    teamRatings: ratings['regular-season']
      ? { 'regular-season': ratings['regular-season'], playoffs: ratings.playoffs }
      : null,
  });
  const games: LeagueSeasonGames = LeagueSeasonGamesSchema.parse({
    kind: 'nba-stats-league-games',
    version: 1,
    season,
    scopes: {
      'regular-season': scopes['regular-season']!.games,
      playoffs: scopes.playoffs?.games ?? null,
    },
  });
  return { summary, games };
}

const index = existsSync(join(dataDir, 'index.json'))
  ? LeagueIndexSchema.parse(
      JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')),
    )
  : {
      kind: 'nba-stats-league-index' as const,
      version: 1 as const,
      builtAt: '',
      seasons: [],
    };
for (const season of seasons) {
  const { summary, games } = await buildSeason(season);
  const reg = summary.scopes['regular-season'];
  const po = summary.scopes.playoffs;
  console.log(
    `${season} ${summary.status.toUpperCase()} games ${reg.gameCount}${po ? `+${po.gameCount}po` : ''}, teams ${reg.teams.length}, stints ${reg.players.length}, ` +
      `incomplete boxes ${reg.incompleteBoxGames.length}${po ? `/${po.incompleteBoxGames.length}po` : ''}, quarantined ${reg.quarantined.length}, ` +
      `source totals ${reg.sourceTotalsCheck ? `${reg.sourceTotalsCheck.matched}/${reg.sourceTotalsCheck.compared}` : 'n/a'}` +
      (summary.statusNotes.length ? `\n   ${summary.statusNotes.join('\n   ')}` : '') +
      (reg.sourceTotalsCheck?.mismatches.length
        ? `\n   ${reg.sourceTotalsCheck.mismatches.slice(0, argv.includes('--verbose') ? 80 : 3).join('\n   ')}`
        : ''),
  );
  if (write) {
    mkdirSync(dataDir, { recursive: true });
    const sBytes = gzipSync(JSON.stringify(summary), { level: 9 });
    const gBytes = gzipSync(JSON.stringify(games), { level: 9 });
    writeFileSync(join(dataDir, `${season}.summary.json.gz`), sBytes);
    writeFileSync(join(dataDir, `${season}.games.json.gz`), gBytes);
    const entry = {
      season,
      status: summary.status,
      summarySha256: createHash('sha256').update(sBytes).digest('hex'),
      gamesSha256: createHash('sha256').update(gBytes).digest('hex'),
    };
    index.seasons = [...index.seasons.filter((s) => s.season !== season), entry].sort(
      (a, b) => a.season.localeCompare(b.season),
    );
    index.builtAt = new Date().toISOString();
    writeFileSync(
      join(dataDir, 'index.json'),
      JSON.stringify(LeagueIndexSchema.parse(index), null, 1) + '\n',
    );
    console.log(
      `   wrote ${(sBytes.length / 1024).toFixed(0)} KB + ${(gBytes.length / 1024).toFixed(0)} KB`,
    );
  }
}
