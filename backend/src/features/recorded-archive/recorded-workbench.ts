import type {
  ArchiveRankingResponse,
  RecordedTeamSeasonResponse,
  WorkbenchMetricDefinition,
  WorkbenchQuery,
  WorkbenchRow,
  WorkbenchSummary,
} from '@nba-performance-explorer/contracts';

// Pure statistics for the research workbench. Every function takes the explicit cohort it is
// given and nothing else; empty or constant inputs return nulls rather than invented numbers.

export const PLAYER_DEFAULT_MIN_GAMES = 20;
export const TEAM_DEFAULT_MIN_GAMES = 5;
export const HISTOGRAM_BINS = 12;

/** Linear-interpolation quantile (the common "type 7" definition) of sorted values. */
export function quantile(sorted: readonly number[], p: number): number | null {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

export function summarize(values: readonly number[]): WorkbenchSummary {
  const n = values.length;
  if (!n)
    return {
      n,
      mean: null,
      sd: null,
      min: null,
      q1: null,
      median: null,
      q3: null,
      max: null,
    };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  // Population SD: the cohort is the whole population being described, not a sample of it.
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return {
    n,
    mean,
    sd,
    min: sorted[0]!,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted.at(-1)!,
  };
}

/** Equal-width bins over [min, max]; the last bin includes its upper edge. */
export function histogram(values: readonly number[], bins = HISTOGRAM_BINS) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ from: min, to: max, count: values.length }];
  const width = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    from: min + i * width,
    to: i === bins - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values)
    out[Math.min(bins - 1, Math.floor((v - min) / width))]!.count++;
  return out;
}

/** Pearson correlation and the least-squares line of y on x; null when either axis is constant. */
export function relationship(pairs: readonly (readonly [number, number])[]) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let sxx = 0,
    syy = 0,
    sxy = 0;
  for (const [x, y] of pairs) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const slope = sxx ? sxy / sxx : null;
  return {
    n,
    pearson: sxx && syy ? Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy))) : null,
    slope,
    intercept: slope === null ? null : my - slope * mx,
  };
}

/** Competition ranks (1, 1, 3) and mid-rank percentiles within the cohort. */
export function rankAndPercentile(values: readonly number[], order: 'desc' | 'asc') {
  return values.map((v) => {
    const better = values.filter((w) => (order === 'desc' ? w > v : w < v)).length;
    const lower = values.filter((w) => w < v).length;
    const tied = values.filter((w) => w === v).length;
    return {
      rank: better + 1,
      percentile: (100 * (lower + tied * 0.5)) / values.length,
    };
  });
}

export function zScores(values: readonly number[]) {
  const s = summarize(values);
  return values.map((v) => (s.sd ? (v - s.mean!) / s.sd : 0));
}

// ------------------------------------------------------------------ metric definitions

const PLAYER_DEFINITIONS: Record<string, Omit<WorkbenchMetricDefinition, 'key'>> = {
  gamesPlayed: {
    label: 'Games played',
    unit: 'games',
    definition:
      'Games played as listed on the team pages; traded players summed across teams.',
  },
  minutesPerGame: {
    label: 'Minutes per game',
    unit: 'per-game',
    definition:
      'Published minutes per game; traded players combined only from raw totals.',
  },
  pointsPerGame: {
    label: 'Points per game',
    unit: 'per-game',
    definition:
      'Published points per game; traded players combined only from raw totals.',
  },
  reboundsPerGame: {
    label: 'Rebounds per game',
    unit: 'per-game',
    definition:
      'Published rebounds per game; traded players combined only from raw totals.',
  },
  assistsPerGame: {
    label: 'Assists per game',
    unit: 'per-game',
    definition:
      'Published assists per game; traded players combined only from raw totals.',
  },
  stealsPerGame: {
    label: 'Steals per game',
    unit: 'per-game',
    definition: 'Published steals per game; event counts, not a defensive rating.',
  },
  blocksPerGame: {
    label: 'Blocks per game',
    unit: 'per-game',
    definition: 'Published blocks per game; event counts, not a defensive rating.',
  },
  fieldGoalPercentage: {
    label: 'Field-goal %',
    unit: 'percent',
    definition:
      'Published FG%; unavailable for traded players (no combined attempts in the source).',
  },
  threePointPercentage: {
    label: 'Three-point %',
    unit: 'percent',
    definition:
      'Published 3P%; unavailable for traded players and where the source lists none.',
  },
  freeThrowPercentage: {
    label: 'Free-throw %',
    unit: 'percent',
    definition:
      'Published FT%; unavailable for traded players and where the source lists none.',
  },
  points: {
    label: 'Total points',
    unit: 'count',
    definition:
      'Raw season points from source totals; never rebuilt from rounded averages.',
  },
  rebounds: {
    label: 'Total rebounds',
    unit: 'count',
    definition: 'Raw season rebounds from source totals.',
  },
  assists: {
    label: 'Total assists',
    unit: 'count',
    definition: 'Raw season assists from source totals.',
  },
  steals: {
    label: 'Total steals',
    unit: 'count',
    definition: 'Raw season steals from source totals.',
  },
  blocks: {
    label: 'Total blocks',
    unit: 'count',
    definition: 'Raw season blocks from source totals.',
  },
};
const TEAM_DEFINITIONS: Record<string, Omit<WorkbenchMetricDefinition, 'key'>> = {
  winPercentage: {
    label: 'Win %',
    unit: 'percent',
    definition: 'Wins / verified games (finals both team pages agree on).',
  },
  pointsFor: {
    label: 'Points scored per game',
    unit: 'points',
    definition: 'Mean final team score over verified games.',
  },
  pointsAgainst: {
    label: 'Points allowed per game',
    unit: 'points',
    definition:
      'Mean final opponent score over verified games; not a defensive rating.',
  },
  marginPerGame: {
    label: 'Margin per game',
    unit: 'points',
    definition:
      'Mean final margin over verified games; not net rating (no possessions).',
  },
  homeWinPercentage: {
    label: 'Home win %',
    unit: 'percent',
    definition: 'Win % in verified home games.',
  },
  awayWinPercentage: {
    label: 'Away win %',
    unit: 'percent',
    definition: 'Win % in verified away games.',
  },
  vsWinningWinPercentage: {
    label: 'Win % vs winning teams',
    unit: 'percent',
    definition: 'Win % against opponents above .500 in their own verified games.',
  },
  vsLosingWinPercentage: {
    label: 'Win % vs losing teams',
    unit: 'percent',
    definition: 'Win % against opponents below .500 in their own verified games.',
  },
  closeWinPercentage: {
    label: 'Close-game win %',
    unit: 'percent',
    definition: 'Win % in games decided by 5 or fewer points, overtime included.',
  },
  decisiveWinPercentage: {
    label: 'Decisive-game win %',
    unit: 'percent',
    definition: 'Win % in games decided by 15 or more points.',
  },
  backToBackWinPercentage: {
    label: 'Back-to-back win %',
    unit: 'percent',
    definition: 'Win % in the second game of back-to-backs (0 rest days).',
  },
  longestWinStreak: {
    label: 'Longest win streak',
    unit: 'games',
    definition: 'Longest run of wins; never bridged across an unverified game.',
  },
  longestLosingStreak: {
    label: 'Longest losing streak',
    unit: 'games',
    definition: 'Longest run of losses; never bridged across an unverified game.',
  },
};

export function definition(
  entity: 'players' | 'teams',
  key: string,
): WorkbenchMetricDefinition {
  const table = entity === 'players' ? PLAYER_DEFINITIONS : TEAM_DEFINITIONS;
  return { key, ...table[key]! };
}

// ------------------------------------------------------------------ entity values

export interface EntityValue {
  id: string;
  label: string;
  teams: string[];
  href: string;
  sample: number;
  value: number | null;
}

/** Player values for one metric from the ranking's qualified rows (identity, GP, metric rules). */
export function playerValues(
  rows: readonly ArchiveRankingResponse['rows'][number][],
): EntityValue[] {
  return rows.map((r) => ({
    id: r.playerId,
    label: r.name,
    teams: r.teams.map((t) => t.abbreviation),
    href: `/players/${r.playerId}/archive`,
    sample: r.gamesPlayed,
    value: r.value,
  }));
}

const SPLIT_FOR: Record<string, string> = {
  homeWinPercentage: 'home',
  awayWinPercentage: 'away',
  vsWinningWinPercentage: 'vs-winning',
  vsLosingWinPercentage: 'vs-losing',
  closeWinPercentage: 'close',
  decisiveWinPercentage: 'decisive',
  backToBackWinPercentage: 'back-to-back',
};

/** One team's value for a metric and the number of verified games behind it. */
export function teamValue(
  season: Pick<
    RecordedTeamSeasonResponse,
    'team' | 'splits' | 'longestWinStreak' | 'longestLosingStreak' | 'chronologyKnown'
  >,
  metric: string,
): EntityValue {
  const all = season.splits.find((s) => s.key === 'all')!;
  const base = {
    id: season.team.id,
    label: season.team.name,
    teams: [season.team.abbreviation],
    href: `/teams/${season.team.id}/season`,
  };
  const split = SPLIT_FOR[metric];
  if (split) {
    const s = season.splits.find((x) => x.key === split);
    return { ...base, sample: s?.games ?? 0, value: s?.winPercentage ?? null };
  }
  if (metric === 'longestWinStreak' || metric === 'longestLosingStreak') {
    const streak =
      metric === 'longestWinStreak'
        ? season.longestWinStreak
        : season.longestLosingStreak;
    return {
      ...base,
      sample: all.games,
      value: season.chronologyKnown ? (streak?.length ?? 0) : null,
    };
  }
  const value =
    metric === 'winPercentage'
      ? all.winPercentage
      : metric === 'pointsFor'
        ? all.pointsFor
        : metric === 'pointsAgainst'
          ? all.pointsAgainst
          : all.marginPerGame;
  return { ...base, sample: all.games, value };
}

/**
 * Builds the workbench rows for a cohort: entities with an x value at or above the sample
 * minimum (and a y value when one is requested), ranked and standardised within that cohort.
 */
export function buildWorkbench(
  q: Pick<WorkbenchQuery, 'order' | 'view'>,
  minGames: number,
  xs: readonly EntityValue[],
  ys: readonly EntityValue[] | null,
) {
  const excluded = new Map<string, number>();
  const exclude = (reason: string) =>
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
  const yById = ys ? new Map(ys.map((e) => [e.id, e])) : null;
  const kept: (EntityValue & { y: number | null })[] = [];
  for (const e of xs) {
    if (e.value === null) {
      exclude('No value for this metric in the source');
      continue;
    }
    if (e.sample < minGames) {
      exclude(`Fewer than ${minGames} games behind the value`);
      continue;
    }
    const y = yById ? (yById.get(e.id)?.value ?? null) : null;
    if (yById && y === null) {
      exclude('No value for the second metric');
      continue;
    }
    kept.push({ ...e, y });
  }
  const xValues = kept.map((e) => e.value!);
  const ranks = rankAndPercentile(xValues, q.order);
  const zx = zScores(xValues);
  const yValues = yById ? kept.map((e) => e.y!) : [];
  const zy = yById ? zScores(yValues) : [];
  const rows: WorkbenchRow[] = kept
    .map((e, i) => ({
      id: e.id,
      label: e.label,
      teams: e.teams,
      href: e.href,
      sample: e.sample,
      x: e.value!,
      y: e.y,
      rank: ranks[i]!.rank,
      percentile: ranks[i]!.percentile,
      zX: zx[i]!,
      zY: yById ? zy[i]! : null,
    }))
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  return {
    rows,
    excluded: [...excluded].map(([reason, count]) => ({ reason, count })),
    summary: summarize(xValues),
    ySummary: yById ? summarize(yValues) : null,
    bins: histogram(xValues),
    relationship: yById
      ? relationship(kept.map((e) => [e.value!, e.y!] as const))
      : null,
  };
}
