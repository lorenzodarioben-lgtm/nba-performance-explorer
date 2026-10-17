import type { ProfileMetric } from '@nba-performance-explorer/contracts';
import type { MarkerShape } from '../../charts/markers';

/** Each participant keeps one colour, one shape and one lane offset, so colour is never alone. */
export const PLAYER_STYLE: readonly {
  color: string;
  shape: MarkerShape;
  lane: number;
}[] = [
  { color: 'var(--s1)', shape: 'circle', lane: -10 },
  { color: 'var(--s2)', shape: 'square', lane: -3.5 },
  { color: 'var(--s3)', shape: 'triangle', lane: 3.5 },
  { color: 'var(--s4)', shape: 'diamond', lane: 10 },
];

export const METRIC_LABEL: Record<ProfileMetric, string> = {
  pointsPerGame: 'Points',
  reboundsPerGame: 'Rebounds',
  assistsPerGame: 'Assists',
  stealsPerGame: 'Steals',
  blocksPerGame: 'Blocks',
  minutesPerGame: 'Minutes',
};
