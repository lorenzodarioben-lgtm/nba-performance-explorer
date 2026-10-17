import {
  ComparisonMetricSchema,
  ResearchPlayerIdSchema,
  SeasonIdSchema,
  type ComparisonMetric,
} from '@nba-performance-explorer/contracts';

export interface LabSlot {
  playerId: string;
  season: string | null;
}
export interface LabState {
  slots: LabSlot[];
  metric: ComparisonMetric | 'all';
  invalid: boolean;
}

export function readLabState(params: URLSearchParams): LabState {
  const invalid = { slots: [], metric: 'all' as const, invalid: true };
  if (
    [...params.keys()].some(
      (key) =>
        !['players', 'seasons', 'metric'].includes(key) ||
        params.getAll(key).length > 1,
    )
  )
    return invalid;
  const ids = params.get('players')?.split(',') ?? [];
  const seasons = params.get('seasons')?.split(',') ?? ids.map(() => '');
  if (
    ids.length > 4 ||
    seasons.length !== ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !ResearchPlayerIdSchema.safeParse(id).success) ||
    seasons.some((season) => season && !SeasonIdSchema.safeParse(season).success)
  )
    return invalid;
  const metric = params.get('metric') ?? 'all';
  if (metric !== 'all' && !ComparisonMetricSchema.safeParse(metric).success)
    return invalid;
  return {
    slots: ids.map((playerId, i) => ({ playerId, season: seasons[i] || null })),
    metric: metric as ComparisonMetric | 'all',
    invalid: false,
  };
}

export function buildLabParams(
  slots: readonly LabSlot[],
  metric: ComparisonMetric | 'all' = 'all',
) {
  const params = new URLSearchParams();
  if (slots.length) {
    params.set('players', slots.map((s) => s.playerId).join(','));
    params.set('seasons', slots.map((s) => s.season ?? '').join(','));
  }
  if (metric !== 'all') params.set('metric', metric);
  if (readLabState(params).invalid) throw new Error('Invalid comparison selection.');
  return params;
}

export function addLabPlayer(slots: readonly LabSlot[], playerId: string): LabSlot[] {
  if (
    slots.length >= 4 ||
    slots.some((s) => s.playerId === playerId) ||
    !ResearchPlayerIdSchema.safeParse(playerId).success
  )
    throw new Error('Select up to four distinct NBA players.');
  return [...slots, { playerId, season: null }];
}
