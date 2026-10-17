import { useState } from 'react';
import {
  CAREER_METRICS,
  CareerMetricSchema,
  type CareerMetric,
} from '@nba-performance-explorer/contracts';
import { useCareerResearch } from './useCareerResearch';
import { QueryFeedback, SourceNote } from '../research/ResearchShell';
import styles from '../research/research.module.css';

export function PeakSeasonPicker({
  playerId,
  onSeason,
}: {
  playerId: string;
  onSeason: (season: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [metric, setMetric] = useState<CareerMetric>('pointsPerGame');
  const [minGames, setMinGames] = useState(20);
  const query = useCareerResearch(playerId, metric, minGames, enabled);
  return (
    <details onToggle={(e) => setEnabled(e.currentTarget.open)}>
      <summary>Choose a qualified peak season for NBA player {playerId}</summary>
      <div className={styles.controls}>
        <label>
          Peak metric for NBA player {playerId}
          <select
            value={metric}
            onChange={(e) => setMetric(CareerMetricSchema.parse(e.target.value))}
          >
            {Object.entries(CAREER_METRICS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Peak minimum games for NBA player {playerId}
          <select
            value={minGames}
            onChange={(e) => setMinGames(Number(e.target.value))}
          >
            {[1, 10, 20, 40, 60, 82].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {enabled && <QueryFeedback pending={query.isPending} failed={query.isError} />}
      {query.data && (
        <>
          <SourceNote provenance={query.data.provenance} />
          <p>
            {query.data.peak.qualifiedSeasons} qualified reported seasons. Highest{' '}
            {CAREER_METRICS[metric]}:{' '}
            {query.data.peak.value === null
              ? 'Unavailable'
              : query.data.peak.value.toFixed(4)}{' '}
            (raw ratio for percentages). Ties retained.
          </p>
          {query.data.peak.seasons.map((season) => (
            <button key={season} onClick={() => onSeason(season)}>
              Use {season} for NBA player {playerId}
            </button>
          ))}
          {!query.data.peak.seasons.length && (
            <p role="status">
              No reported season qualifies. Adjust the criterion or choose a season
              manually.
            </p>
          )}
        </>
      )}
    </details>
  );
}
