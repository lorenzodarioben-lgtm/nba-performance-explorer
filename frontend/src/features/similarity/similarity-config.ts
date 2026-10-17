import {
  RecordedSimilarityQuerySchema,
  SimilarityMetricSchema,
  type RecordedSimilarityResponse,
  type SimilarityMetric,
} from '@nba-performance-explorer/contracts';

import { csvCell } from '../workbench/workbench-config';

export const SIMILARITY_METRICS = SimilarityMetricSchema.options;
export const DEFAULT_METRICS: readonly SimilarityMetric[] = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
];

export const SIM_LABEL: Record<SimilarityMetric, string> = {
  minutesPerGame: 'Minutes',
  pointsPerGame: 'Points',
  reboundsPerGame: 'Rebounds',
  assistsPerGame: 'Assists',
  stealsPerGame: 'Steals',
  blocksPerGame: 'Blocks',
  fieldGoalPercentage: 'FG%',
  threePointPercentage: '3P%',
  freeThrowPercentage: 'FT%',
};

export const isPercent = (m: SimilarityMetric) => m.endsWith('Percentage');
export const formatMetric = (m: SimilarityMetric, v: number) =>
  isPercent(m) ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);
export const signed = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

/**
 * Reads the finder's URL. Every parameter is checked against the API contract (with a stand-in
 * player while none is chosen), so a hand-edited link is rejected rather than half-applied.
 */
export function readSimilarityState(params: URLSearchParams) {
  const single = [...params.keys()].every((k) => params.getAll(k).length === 1);
  const player = params.get('player');
  const raw = Object.fromEntries(params);
  const parsed = RecordedSimilarityQuerySchema.safeParse({
    metrics: DEFAULT_METRICS.join(','),
    ...raw,
    player: player ?? '1',
  });
  if (!single || !parsed.success) return { valid: false as const };
  return {
    valid: true as const,
    player: player ? parsed.data.player : null,
    metrics: parsed.data.metrics,
    minGames: parsed.data.minGames,
    limit: parsed.data.limit,
  };
}

export function similarityCsv(data: RecordedSimilarityResponse) {
  const header = [
    'rank',
    'name',
    'teams',
    'games',
    'distance',
    ...data.metrics.flatMap((m) => [SIM_LABEL[m], `${SIM_LABEL[m]} z difference`]),
  ];
  const lines = data.neighbours.map((n) =>
    [
      n.rank,
      n.name,
      n.teams.join('/'),
      n.gamesPlayed,
      n.distance.toFixed(4),
      ...data.metrics.flatMap((_, k) => [n.values[k]!, n.differences[k]!.toFixed(4)]),
    ]
      .map((v) => csvCell(v))
      .join(','),
  );
  const notes = [
    `# NBA Performance Explorer similarity finder, ${data.season} regular season`,
    `# Target: ${data.targetName} (${data.targetGames} games)`,
    `# Metrics: ${data.metrics.map((m) => SIM_LABEL[m]).join(', ')}; minimum ${data.minGames} games`,
    `# Cohort ${data.cohort}; below the games minimum ${data.excluded.belowMinimum}; missing a metric ${data.excluded.missingMetric}`,
    '# Distance: root-mean-square of cohort z-score differences, every metric weighted equally.',
    '# Source: recorded 2023-24 Wikipedia team pages (CC BY-SA 4.0); identifiers from Wikidata (CC0).',
  ];
  return (
    [...notes, header.map((h) => csvCell(h)).join(','), ...lines].join('\r\n') + '\r\n'
  );
}
