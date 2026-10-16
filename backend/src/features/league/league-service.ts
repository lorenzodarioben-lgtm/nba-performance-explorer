// Season-level league research over the committed NBA.com Stats archive: season capabilities,
// standings and player leaders. Every rate names its inputs; unavailable modes say why.
import {
  LeagueLeadersResponseSchema,
  LeagueSeasonsResponseSchema,
  LeagueStandingsResponseSchema,
  type LeagueLeaderMetric,
  type LeagueLeadersQuery,
  type LeagueLeadersResponse,
  type LeagueProvenance,
  type LeagueRateMode,
  type LeagueScope,
  type LeagueSeasonInfo,
  type LeagueStandingsResponse,
  type LeagueTeamRef,
} from '@nba-performance-explorer/contracts';
import { LeagueArchive, value } from './league-archive.js';
import {
  LINE_FIELDS,
  type Line,
  type LeagueSeasonSummary,
  type LineField,
} from './league-data.js';

export class LeagueRequestError extends Error {
  constructor(
    readonly status: 404 | 422,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Box scores that fail to add up may be at most this share of a season for player research. */
const MAX_INCOMPLETE_BOX_SHARE = 0.005;
const PAGE_SIZE = 25;

export function sumLines(lines: Line[]): Line {
  return LINE_FIELDS.map((_, i) =>
    lines.length && lines.every((l) => l[i] !== null)
      ? Math.round(lines.reduce((t, l) => t + (l[i] as number), 0) * 1000) / 1000
      : null,
  );
}

export function capabilities(s: LeagueSeasonSummary) {
  const reg = s.scopes['regular-season'];
  return {
    teamResults: !s.statusNotes.some((n) => n.startsWith('Derived W-L differs')),
    playerStats:
      reg.incompleteBoxGames.length / Math.max(1, reg.gameCount) <=
      MAX_INCOMPLETE_BOX_SHARE,
    teamRatings: s.teamRatings !== null,
    playerPossessions: reg.playerPossessions !== null,
    publishedStandings: s.standings !== null,
  };
}

const retrievedAt = (s: LeagueSeasonSummary) =>
  s.source.requests
    .map((r) => r.retrievedAt)
    .sort()
    .at(-1) ?? s.builtAt;

export function snapshotProvenance(
  s: LeagueSeasonSummary,
  coverage: string,
  warnings: string[] = [],
): LeagueProvenance {
  return {
    source: 'nba-stats',
    mode: 'committed-snapshot',
    servedAt: new Date().toISOString(),
    retrievedAt: retrievedAt(s),
    sourceUpdatedAt: null,
    coverage: coverage.slice(0, 600),
    warnings: warnings.map((w) => w.slice(0, 600)).slice(0, 20),
  };
}

export const teamRef = (s: LeagueSeasonSummary, teamId: number): LeagueTeamRef => {
  const t = s.teams.find((x) => x.teamId === teamId);
  return {
    id: `nba:${teamId}`,
    abbreviation: t?.abbreviation ?? 'UNK',
    name: t?.name ?? `Team ${teamId}`,
  };
};

interface MetricDef {
  label: string;
  kind: 'count' | 'percent' | 'games';
  field?: LineField;
  definition: string;
}
const METRICS: Record<LeagueLeaderMetric, MetricDef> = {
  points: {
    label: 'Points',
    kind: 'count',
    field: 'pts',
    definition: 'Points scored.',
  },
  rebounds: {
    label: 'Rebounds',
    kind: 'count',
    field: 'reb',
    definition: 'Total rebounds.',
  },
  assists: { label: 'Assists', kind: 'count', field: 'ast', definition: 'Assists.' },
  steals: { label: 'Steals', kind: 'count', field: 'stl', definition: 'Steals.' },
  blocks: {
    label: 'Blocks',
    kind: 'count',
    field: 'blk',
    definition: 'Blocked shots.',
  },
  threesMade: {
    label: '3-pointers made',
    kind: 'count',
    field: 'fg3m',
    definition: 'Three-point field goals made.',
  },
  offensiveRebounds: {
    label: 'Offensive rebounds',
    kind: 'count',
    field: 'oreb',
    definition: 'Offensive rebounds.',
  },
  defensiveRebounds: {
    label: 'Defensive rebounds',
    kind: 'count',
    field: 'dreb',
    definition: 'Defensive rebounds.',
  },
  turnovers: {
    label: 'Turnovers',
    kind: 'count',
    field: 'tov',
    definition: 'Turnovers committed.',
  },
  minutes: {
    label: 'Minutes',
    kind: 'count',
    field: 'min',
    definition: 'Minutes played, summed from box scores.',
  },
  plusMinus: {
    label: 'Plus-minus',
    kind: 'count',
    field: 'pm',
    definition: 'Team point margin while on the floor, summed from box scores.',
  },
  gamesPlayed: {
    label: 'Games played',
    kind: 'games',
    definition: 'Games with a box-score line.',
  },
  fieldGoalPercentage: {
    label: 'FG%',
    kind: 'percent',
    definition: 'Field goals made ÷ field goals attempted, from season totals.',
  },
  threePointPercentage: {
    label: '3P%',
    kind: 'percent',
    definition: 'Three-pointers made ÷ three-pointers attempted, from season totals.',
  },
  freeThrowPercentage: {
    label: 'FT%',
    kind: 'percent',
    definition: 'Free throws made ÷ free throws attempted, from season totals.',
  },
  trueShootingPercentage: {
    label: 'TS%',
    kind: 'percent',
    definition: 'Points ÷ (2 × (FGA + 0.44 × FTA)), from season totals.',
  },
  effectiveFieldGoalPercentage: {
    label: 'eFG%',
    kind: 'percent',
    definition: '(FGM + 0.5 × 3PM) ÷ FGA, from season totals.',
  },
};

/** Percentage: value, inputs, and the attempts the qualification applies to. */
function percentage(metric: LeagueLeaderMetric, t: Line) {
  const v = (f: LineField) => value(t, f);
  switch (metric) {
    case 'fieldGoalPercentage':
      return ratio(v('fgm'), v('fga'), 'FGM', 'FGA');
    case 'threePointPercentage':
      return ratio(v('fg3m'), v('fg3a'), '3PM', '3PA');
    case 'freeThrowPercentage':
      return ratio(v('ftm'), v('fta'), 'FTM', 'FTA');
    case 'effectiveFieldGoalPercentage': {
      const fgm = v('fgm'),
        fg3m = v('fg3m'),
        fga = v('fga');
      if (fgm === null || fg3m === null || fga === null || fga === 0) return null;
      return {
        value: (fgm + 0.5 * fg3m) / fga,
        attempts: fga,
        inputs: [
          { label: 'FGM', value: fgm },
          { label: '3PM', value: fg3m },
          { label: 'FGA', value: fga },
        ],
      };
    }
    case 'trueShootingPercentage': {
      const pts = v('pts'),
        fga = v('fga'),
        fta = v('fta');
      if (pts === null || fga === null || fta === null || fga + fta === 0) return null;
      return {
        value: pts / (2 * (fga + 0.44 * fta)),
        attempts: fga,
        inputs: [
          { label: 'PTS', value: pts },
          { label: 'FGA', value: fga },
          { label: 'FTA', value: fta },
        ],
      };
    }
    default:
      return null;
  }
}
function ratio(made: number | null, att: number | null, ml: string, al: string) {
  if (made === null || att === null || att === 0) return null;
  return {
    value: made / att,
    attempts: att,
    inputs: [
      { label: ml, value: made },
      { label: al, value: att },
    ],
  };
}

/** Default attempt minimums for an 82-game schedule, scaled to the scope's length. */
const ATTEMPT_BASE: Partial<
  Record<LeagueLeaderMetric, { regular: number; playoffs: number }>
> = {
  fieldGoalPercentage: { regular: 300, playoffs: 40 },
  threePointPercentage: { regular: 82, playoffs: 15 },
  freeThrowPercentage: { regular: 125, playoffs: 20 },
  trueShootingPercentage: { regular: 300, playoffs: 40 },
  effectiveFieldGoalPercentage: { regular: 300, playoffs: 40 },
};

/** States the qualification actually applied and where each threshold came from. */
function qualificationText(o: {
  minGames: number;
  minAttempts: number | null;
  chosenGames: boolean;
  chosenAttempts: boolean;
  percent: boolean;
  playoffs: boolean;
}) {
  const games = o.minGames
    ? `At least ${o.minGames} games${o.chosenGames ? ' (chosen here)' : o.playoffs ? ' (this app’s default for playoff rates)' : ' (this app’s default: 70% of the most games any team played)'}`
    : o.percent
      ? 'No games minimum'
      : 'No games minimum for season totals';
  const attempts =
    o.minAttempts === null
      ? ''
      : `; at least ${o.minAttempts} attempts${o.chosenAttempts ? ' (chosen here)' : o.playoffs ? ' (this app’s playoff default)' : ' (this app’s default, scaled to the schedule length)'}`;
  return `${games}${attempts}. Not the NBA’s official qualification rule.`.slice(
    0,
    400,
  );
}

export function midrankPercentiles(values: number[]): number[] {
  const n = values.length;
  return values.map((x) => {
    const lower = values.filter((y) => y < x).length;
    const equal = values.filter((y) => y === x).length;
    return (100 * (lower + 0.5 * equal)) / n;
  });
}

export class LeagueService {
  constructor(readonly archive: LeagueArchive = new LeagueArchive()) {}

  seasonInfo(season: string): LeagueSeasonInfo {
    const s = this.archive.summary(season);
    const reg = s.scopes['regular-season'];
    return {
      season,
      status: s.status,
      notes: s.statusNotes.map((n) => n.slice(0, 400)),
      teams: s.teams.length,
      regularSeasonGames: reg.gameCount,
      playoffGames: s.scopes.playoffs?.gameCount ?? 0,
      incompleteBoxScores:
        reg.incompleteBoxGames.length +
        (s.scopes.playoffs?.incompleteBoxGames.length ?? 0),
      quarantinedGames:
        reg.quarantined.length + (s.scopes.playoffs?.quarantined.length ?? 0),
      firstDate: reg.firstDate,
      lastDate: s.scopes.playoffs?.lastDate ?? reg.lastDate,
      retrievedAt: retrievedAt(s),
      capabilities: capabilities(s),
    };
  }

  seasons() {
    const seasons = this.archive.seasons.map((s) => this.seasonInfo(s));
    const latest = this.archive.summary(this.archive.seasons.at(-1)!);
    return LeagueSeasonsResponseSchema.parse({
      seasons,
      provenance: snapshotProvenance(
        latest,
        `${seasons.length} NBA seasons (${seasons[0]?.season} to ${seasons.at(-1)?.season}) from NBA.com Stats team and player game logs, standings and season tables, built by backend/src/scripts/build-league-archive.ts.`,
      ),
    });
  }

  private resolve(season: string | undefined, need: 'any' | 'player') {
    if (season) {
      if (!this.archive.has(season))
        throw new LeagueRequestError(
          404,
          'LEAGUE_SEASON_NOT_ARCHIVED',
          `Season ${season} is not in the league archive.`,
        );
      if (need === 'player' && !capabilities(this.archive.summary(season)).playerStats)
        throw new LeagueRequestError(
          422,
          'LEAGUE_PLAYER_STATS_INCOMPLETE',
          `More than 0.5% of ${season} box scores do not add up to the team totals, so player totals for that season would be understated. Team results remain available.`,
        );
      return season;
    }
    const pick = [...this.archive.seasons]
      .reverse()
      .find((s) => need === 'any' || capabilities(this.archive.summary(s)).playerStats);
    return pick!;
  }

  standings(seasonArg?: string): LeagueStandingsResponse {
    const season = this.resolve(seasonArg, 'any');
    const s = this.archive.summary(season);
    const reg = s.scopes['regular-season'];
    const derived = new Map(reg.teams.map((t) => [t.teamId, t]));
    const warnings = [...s.statusNotes];
    let conferences: LeagueStandingsResponse['conferences'];
    let agreement: LeagueStandingsResponse['resultsAgreement'] = null;
    if (s.standings) {
      agreement = {
        teams: s.standings.length,
        agreeing: s.standings.filter((p) => {
          const d = derived.get(p.teamId);
          return d && d.w === p.wins && d.l === p.losses;
        }).length,
      };
      conferences = (['East', 'West'] as const).map((conference) => {
        const rows = s
          .standings!.filter((p) => p.conference === conference)
          .sort(
            (a, b) =>
              (a.playoffRank ?? 99) - (b.playoffRank ?? 99) ||
              b.wins / Math.max(1, b.wins + b.losses) -
                a.wins / Math.max(1, a.wins + a.losses),
          );
        const leader = rows[0];
        return {
          conference,
          rows: rows.map((p, i) => ({
            rank: p.playoffRank ?? i + 1,
            team: teamRef(s, p.teamId),
            wins: p.wins,
            losses: p.losses,
            winPercentage: p.wins / Math.max(1, p.wins + p.losses),
            gamesBehind:
              p.conferenceGamesBack ??
              (leader ? (leader.wins - p.wins + (p.losses - leader.losses)) / 2 : 0),
            division: p.division || null,
            home: p.home || null,
            road: p.road || null,
            lastTen: p.lastTen,
            streak: p.streak,
            clinch: p.clinch?.replace(/^-\s*/, '') || null,
          })),
        };
      });
    } else {
      // No published table: rank every team league-wide from paired results. Conference
      // membership is not in the game logs, so none is shown.
      const rows = [...reg.teams].sort((a, b) => b.w / b.gp - a.w / a.gp || b.w - a.w);
      const leader = rows[0]!;
      conferences = [
        {
          conference: 'League',
          rows: rows.map((t, i) => ({
            rank: i + 1,
            team: teamRef(s, t.teamId),
            wins: t.w,
            losses: t.l,
            winPercentage: t.w / Math.max(1, t.gp),
            gamesBehind: (leader.w - t.w + (t.l - leader.l)) / 2,
            division: null,
            home: null,
            road: null,
            lastTen: null,
            streak: null,
            clinch: null,
          })),
        },
      ];
    }
    return LeagueStandingsResponseSchema.parse({
      season,
      basis: s.standings ? 'published' : 'derived',
      conferences,
      resultsAgreement: agreement,
      provenance: snapshotProvenance(
        s,
        s.standings
          ? `NBA.com's published ${season} standings table, compared team by team with ${reg.gameCount} paired regular-season results.`
          : `${season} records ranked here from ${reg.gameCount} paired regular-season results; NBA.com publishes no standings table for this season, so conferences, divisions and tiebreakers are not shown.`,
        warnings,
      ),
    });
  }

  /** Every qualified player ranked (no paging), with the population and the available modes. */
  rank(q: LeagueLeadersQuery) {
    const season = this.resolve(q.season, 'player');
    const s = this.archive.summary(season);
    const scope: LeagueScope = q.scope;
    const sc = s.scopes[scope];
    if (!sc)
      throw new LeagueRequestError(
        404,
        'LEAGUE_SCOPE_EMPTY',
        `No ${scope} games are archived for ${season}.`,
      );
    if (
      scope === 'playoffs' &&
      sc.incompleteBoxGames.length / Math.max(1, sc.gameCount) >
        MAX_INCOMPLETE_BOX_SHARE
    )
      throw new LeagueRequestError(
        422,
        'LEAGUE_PLAYER_STATS_INCOMPLETE',
        `Too many ${season} playoff box scores are incomplete for player totals.`,
      );
    const def = METRICS[q.metric];
    const teamId = q.team ? Number(q.team.slice(4)) : null;
    if (teamId !== null && !s.teams.some((t) => t.teamId === teamId))
      throw new LeagueRequestError(
        404,
        'LEAGUE_TEAM_NOT_IN_SEASON',
        `That team did not play in ${season}.`,
      );
    const possessions = new Map(sc.playerPossessions ?? []);
    const modeReason = (mode: LeagueRateMode): string | null => {
      if (def.kind === 'percent')
        return mode === 'totals'
          ? null
          : 'A percentage is computed once from season makes and attempts.';
      if (def.kind === 'games')
        return mode === 'totals' ? null : 'Games played is a count.';
      if (q.metric === 'minutes' && (mode === 'per-36' || mode === 'per-100'))
        return 'Minutes cannot be expressed per minute or per possession.';
      if (mode === 'per-100') {
        if (!sc.playerPossessions)
          return `NBA.com publishes no player possession counts for ${season}.`;
        if (teamId !== null)
          return 'NBA.com possession counts cover a player’s whole season, not one team stint.';
      }
      return null;
    };
    const modes = (['totals', 'per-game', 'per-36', 'per-100'] as const).map(
      (mode) => ({
        mode,
        available: modeReason(mode) === null,
        reason: modeReason(mode),
      }),
    );
    const unavailable = modeReason(q.mode);
    if (unavailable)
      throw new LeagueRequestError(422, 'LEAGUE_MODE_UNAVAILABLE', unavailable);

    const maxTeamGames = Math.max(...sc.teams.map((t) => t.gp));
    const rateMode = q.mode !== 'totals';
    const minGames =
      q.minGames ??
      (def.kind === 'percent' || !rateMode
        ? 0
        : scope === 'playoffs'
          ? 4
          : Math.ceil(0.7 * maxTeamGames));
    const base = ATTEMPT_BASE[q.metric];
    const minAttempts =
      def.kind === 'percent'
        ? (q.minAttempts ??
          (scope === 'playoffs'
            ? base!.playoffs
            : Math.round((base!.regular * maxTeamGames) / 82)))
        : null;

    // One row per player: the whole season (all stints combined) or the chosen team's stint.
    const byPlayer = new Map<
      number,
      { gp: number; lines: Line[]; teams: { id: number; first: string }[] }
    >();
    for (const st of sc.players) {
      if (teamId !== null && st.teamId !== teamId) continue;
      const row = byPlayer.get(st.playerId) ?? { gp: 0, lines: [], teams: [] };
      row.gp += st.gp;
      row.lines.push(st.totals);
      row.teams.push({ id: st.teamId, first: st.firstGame });
      byPlayer.set(st.playerId, row);
    }
    const counts = {
      players: byPlayer.size,
      qualified: 0,
      belowGames: 0,
      belowAttempts: 0,
      missingInputs: 0,
    };
    const candidates: {
      playerId: number;
      gp: number;
      total: Line;
      teams: number[];
      value: number;
      inputs: { label: string; value: number }[];
    }[] = [];
    for (const [playerId, r] of byPlayer) {
      const total = sumLines(r.lines);
      const teams = r.teams
        .sort((a, b) => a.first.localeCompare(b.first))
        .map((t) => t.id);
      let v: number;
      let inputs: { label: string; value: number }[] = [];
      if (def.kind === 'games') {
        v = r.gp;
        inputs = [{ label: 'GP', value: r.gp }];
      } else if (def.kind === 'percent') {
        const p = percentage(q.metric, total);
        if (!p) {
          counts.missingInputs++;
          continue;
        }
        if (r.gp < minGames) {
          counts.belowGames++;
          continue;
        }
        if (p.attempts < minAttempts!) {
          counts.belowAttempts++;
          continue;
        }
        v = p.value;
        inputs = p.inputs;
      } else {
        const sum = value(total, def.field!);
        const mins = value(total, 'min');
        if (sum === null) {
          counts.missingInputs++;
          continue;
        }
        if (q.mode === 'totals') v = sum;
        else if (q.mode === 'per-game') v = sum / r.gp;
        else if (q.mode === 'per-36') {
          if (mins === null || mins <= 0) {
            counts.missingInputs++;
            continue;
          }
          v = (sum / mins) * 36;
        } else {
          const poss = possessions.get(playerId);
          if (!poss) {
            counts.missingInputs++;
            continue;
          }
          v = (sum / poss) * 100;
          inputs = [{ label: 'POSS', value: poss }];
        }
        inputs = [
          { label: def.label, value: sum },
          ...(q.mode === 'per-36' && mins !== null
            ? [{ label: 'MIN', value: mins }]
            : []),
          ...inputs,
        ];
        if (r.gp < minGames) {
          counts.belowGames++;
          continue;
        }
      }
      candidates.push({ playerId, gp: r.gp, total, teams, value: v, inputs });
    }
    counts.qualified = candidates.length;
    const pct = midrankPercentiles(candidates.map((c) => c.value));
    const ranked = candidates
      .map((c, i) => ({ ...c, percentile: pct[i]! }))
      .sort(
        (a, b) =>
          b.value - a.value ||
          this.name(s, a.playerId).localeCompare(this.name(s, b.playerId)),
      );
    const rows = ranked.map((c) => ({
      rank: ranked.findIndex((x) => x.value === c.value) + 1,
      playerId: String(c.playerId),
      name: this.name(s, c.playerId),
      teams: c.teams.map((t) => teamRef(s, t)),
      gamesPlayed: c.gp,
      minutes: value(c.total, 'min'),
      value: Math.round(c.value * 10000) / 10000,
      inputs: c.inputs.map((x) => ({
        label: x.label,
        value: Math.round(x.value * 1000) / 1000,
      })),
      percentile: Math.round(c.percentile * 100) / 100,
    }));
    return {
      season,
      s,
      scope,
      sc,
      def,
      teamId,
      minGames,
      minAttempts,
      counts,
      modes,
      rows,
    };
  }

  leaders(q: LeagueLeadersQuery): LeagueLeadersResponse {
    const {
      season,
      s,
      scope,
      sc,
      def,
      teamId,
      minGames,
      minAttempts,
      counts,
      modes,
      rows,
    } = this.rank(q);
    const page = rows.slice((q.page - 1) * PAGE_SIZE, q.page * PAGE_SIZE);
    const modeText =
      def.kind !== 'count'
        ? ''
        : q.mode === 'totals'
          ? ' Season total.'
          : q.mode === 'per-game'
            ? ' Total ÷ games played.'
            : q.mode === 'per-36'
              ? ' Total ÷ minutes × 36.'
              : ' Total ÷ NBA.com possession count × 100.';
    const warnings = [...s.statusNotes];
    if (sc.incompleteBoxGames.length)
      warnings.push(
        `${sc.incompleteBoxGames.length} ${scope} box scores in ${season} do not add up to the team totals; player totals from those games may be understated.`,
      );
    return LeagueLeadersResponseSchema.parse({
      query: {
        season,
        scope,
        metric: q.metric,
        mode: q.mode,
        team: q.team ?? null,
        minGames,
        minAttempts,
        page: q.page,
      },
      definition: `${def.definition}${modeText}`.slice(0, 400),
      qualification: qualificationText({
        minGames,
        minAttempts,
        chosenGames: q.minGames !== undefined,
        chosenAttempts: q.minAttempts !== undefined,
        percent: def.kind === 'percent',
        playoffs: scope === 'playoffs',
      }),
      rows: page,
      total: rows.length,
      population: counts,
      modes,
      provenance: snapshotProvenance(
        s,
        `${season} ${scope === 'playoffs' ? 'playoffs' : 'regular season'}: ${counts.players} players with box-score lines${teamId !== null ? ` for ${teamRef(s, teamId).name}` : ''}, summed from NBA.com game logs. Ranks and percentiles are among the ${counts.qualified} qualified players.`,
        warnings,
      ),
    });
  }

  private readonly names = new WeakMap<LeagueSeasonSummary, Map<number, string>>();
  name(s: LeagueSeasonSummary, playerId: number) {
    let map = this.names.get(s);
    if (!map) {
      map = new Map(s.players.map((p) => [p.playerId, p.name]));
      this.names.set(s, map);
    }
    return map.get(playerId) ?? `Player ${playerId}`;
  }
}
