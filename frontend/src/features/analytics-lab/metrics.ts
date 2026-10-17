import { COMPARISON_METRICS } from '@nba-performance-explorer/contracts';

/** Reader-facing names and units for every analytics metric the cohort API accepts. */
export const ANALYTICS_METRICS = [
  ...COMPARISON_METRICS.map((m) => ({ ...m, unit: m.unit === '%' ? 'ratio' : m.unit })),
  { key: 'trueShooting', label: 'TS% estimate', unit: 'ratio' },
  { key: 'effectiveFieldGoal', label: 'eFG%', unit: 'ratio' },
  { key: 'assistTurnover', label: 'AST/TO', unit: 'ratio' },
  { key: 'pointsPer36', label: 'Points per 36', unit: 'points/36 min' },
] as const;
