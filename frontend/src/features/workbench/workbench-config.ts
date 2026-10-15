import {
  WorkbenchPlayerMetricSchema,
  WorkbenchQuerySchema,
  WorkbenchTeamMetricSchema,
  type WorkbenchMetricDefinition,
  type WorkbenchResponse,
} from '@nba-performance-explorer/contracts';

// Labels for the metric pickers (the response carries the authoritative definitions). Grouped so
// a reader picks from named categories, never from raw keys.

export const PLAYER_METRICS: readonly {
  group: string;
  items: readonly [string, string][];
}[] = [
  {
    group: 'Per game',
    items: [
      ['pointsPerGame', 'Points per game'],
      ['reboundsPerGame', 'Rebounds per game'],
      ['assistsPerGame', 'Assists per game'],
      ['stealsPerGame', 'Steals per game'],
      ['blocksPerGame', 'Blocks per game'],
      ['minutesPerGame', 'Minutes per game'],
    ],
  },
  {
    group: 'Shooting',
    items: [
      ['fieldGoalPercentage', 'Field-goal %'],
      ['threePointPercentage', 'Three-point %'],
      ['freeThrowPercentage', 'Free-throw %'],
    ],
  },
  {
    group: 'Season totals',
    items: [
      ['points', 'Total points'],
      ['rebounds', 'Total rebounds'],
      ['assists', 'Total assists'],
      ['steals', 'Total steals'],
      ['blocks', 'Total blocks'],
      ['gamesPlayed', 'Games played'],
    ],
  },
];

export const TEAM_METRICS: readonly {
  group: string;
  items: readonly [string, string][];
}[] = [
  {
    group: 'Results',
    items: [
      ['winPercentage', 'Win %'],
      ['marginPerGame', 'Margin per game'],
      ['pointsFor', 'Points scored per game'],
      ['pointsAgainst', 'Points allowed per game'],
    ],
  },
  {
    group: 'Splits',
    items: [
      ['homeWinPercentage', 'Home win %'],
      ['awayWinPercentage', 'Away win %'],
      ['vsWinningWinPercentage', 'Win % vs winning teams'],
      ['vsLosingWinPercentage', 'Win % vs losing teams'],
      ['closeWinPercentage', 'Close-game win %'],
      ['decisiveWinPercentage', 'Decisive-game win %'],
      ['backToBackWinPercentage', 'Back-to-back win %'],
    ],
  },
  {
    group: 'Streaks',
    items: [
      ['longestWinStreak', 'Longest win streak'],
      ['longestLosingStreak', 'Longest losing streak'],
    ],
  },
];

// Every picker entry must be a metric the API accepts for that population.
if (
  PLAYER_METRICS.flatMap((g) => g.items).some(
    ([k]) => !WorkbenchPlayerMetricSchema.safeParse(k).success,
  ) ||
  TEAM_METRICS.flatMap((g) => g.items).some(
    ([k]) => !WorkbenchTeamMetricSchema.safeParse(k).success,
  )
)
  throw new Error('Workbench picker lists an unsupported metric.');

export const metricLabel = (entity: 'players' | 'teams', key: string) =>
  (entity === 'players' ? PLAYER_METRICS : TEAM_METRICS)
    .flatMap((g) => g.items)
    .find(([k]) => k === key)?.[1] ?? key;

/** URL state: the API query plus the front-end-only selected entity (`pick`). */
export function readWorkbenchState(params: URLSearchParams) {
  const repeated = [...params.keys()].some((k) => params.getAll(k).length > 1);
  const api = new URLSearchParams(params);
  const pick = api.get('pick');
  api.delete('pick');
  const parsed = WorkbenchQuerySchema.safeParse(Object.fromEntries(api));
  const pickValid = pick === null || /^[a-z0-9:]{1,30}$/.test(pick);
  return {
    valid: !repeated && parsed.success && pickValid,
    query: parsed.success ? parsed.data : null,
    api,
    pick: pickValid ? pick : null,
  };
}

export function formatValue(def: WorkbenchMetricDefinition, value: number | null) {
  if (value === null) return '—';
  if (def.unit === 'percent') return `${(value * 100).toFixed(1)}%`;
  if (def.unit === 'count' || def.unit === 'games') return String(Math.round(value));
  if (def.key === 'marginPerGame')
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`;
  return value.toFixed(1);
}

/** One CSV cell, quoted, with spreadsheet formula prefixes neutralised. */
export function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value);
  const safe =
    /^[=+\-@\t\r]/.test(text) && typeof value === 'string' ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function workbenchCsv(data: WorkbenchResponse) {
  const header = [
    'rank',
    'name',
    'teams',
    'games behind value',
    data.metric.label,
    ...(data.y ? [data.y.label] : []),
    'percentile',
    'z',
  ];
  const lines = data.rows.map((r) =>
    [
      r.rank,
      r.label,
      r.teams.join('/'),
      r.sample,
      r.x,
      ...(data.y ? [r.y] : []),
      r.percentile.toFixed(2),
      r.zX.toFixed(4),
    ]
      .map((v) => csvCell(v as string | number | null))
      .join(','),
  );
  const notes = [
    `# NBA Performance Explorer research workbench, ${data.season} regular season`,
    `# Cohort: ${data.cohort}`,
    `# ${data.metric.label}: ${data.metric.definition}`,
    ...(data.y ? [`# ${data.y.label}: ${data.y.definition}`] : []),
    `# Excluded: ${data.excluded.map((e) => `${e.reason} (${e.count})`).join('; ') || 'none'}`,
    '# Source: recorded 2023-24 Wikipedia team pages (CC BY-SA 4.0); identifiers from Wikidata (CC0).',
  ];
  return (
    [...notes, header.map((h) => csvCell(h)).join(','), ...lines].join('\r\n') + '\r\n'
  );
}
