import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  COMPARISON_METRICS,
  ComparisonResponseSchema,
  type ComparisonMetric,
} from '@nba-performance-explorer/contracts';

import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { usePlayerProfileQuery } from '../players/usePlayerProfileQuery';
import { usePlayerSeasonsQuery } from '../players/usePlayerSeasonsQuery';
import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { addLabPlayer, buildLabParams, readLabState, type LabSlot } from './lab-state';

function PlayerSlot({
  slot,
  onSeason,
  onRemove,
}: {
  slot: LabSlot;
  onSeason: (season: string) => void;
  onRemove: () => void;
}) {
  const profile = usePlayerProfileQuery(slot.playerId);
  const seasons = usePlayerSeasonsQuery(slot.playerId);
  return (
    <fieldset>
      <legend>
        {profile.data?.fullName ?? `NBA player ${slot.playerId}`} · NBA ID{' '}
        {slot.playerId}
      </legend>
      <QueryFeedback
        pending={profile.isPending || seasons.isPending}
        failed={profile.isError || seasons.isError}
      />
      <div className={styles.controls}>
        <label>
          Season for NBA player {slot.playerId}
          <select value={slot.season ?? ''} onChange={(e) => onSeason(e.target.value)}>
            <option value="">Choose a recorded season</option>
            {slot.season && !seasons.data?.some((s) => s.season === slot.season) && (
              <option value={slot.season}>
                {slot.season} (not in available seasons)
              </option>
            )}
            {seasons.data?.map((s) => (
              <option key={s.season} value={s.season}>
                {s.season}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onRemove}>Remove NBA player {slot.playerId}</button>
        <Link to={`/players/${slot.playerId}`}>
          Original profile: {profile.data?.fullName ?? slot.playerId}
        </Link>
        <Link
          to={`/players/${slot.playerId}/insights${slot.season ? `?season=${slot.season}` : ''}`}
        >
          Insights: {profile.data?.fullName ?? slot.playerId}
        </Link>
      </div>
      {seasons.isSuccess && seasons.data.length === 0 && (
        <p>No recorded seasons; replace this player or remove the slot.</p>
      )}
    </fieldset>
  );
}

export function ComparisonLabPage() {
  const [params, setParams] = useSearchParams();
  const state = readLabState(params);
  const [message, setMessage] = useState('');
  const ready =
    !state.invalid &&
    state.slots.length >= 2 &&
    state.slots.every((s) => s.season !== null);
  const apiParams = buildLabParams(state.slots);
  const query = useQuery({
    queryKey: ['research', 'compare', apiParams.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/analytics/compare?${apiParams}`, signal, (v) =>
        ComparisonResponseSchema.parse(v),
      ),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const metrics = COMPARISON_METRICS.filter(
    (m) => state.metric === 'all' || m.key === state.metric,
  );
  return (
    <ResearchShell title="Comparison lab">
      <SaveResearchButton
        kind="comparison"
        label="Player season comparison"
        path={`/lab/compare${params.size ? `?${params}` : ''}`}
      />
      <p>
        Choose 2–4 distinct NBA players and one recorded season each. Values use equal
        units and regular-season scope. Cross-era values remain raw; no pace or
        percentile model is applied.
      </p>
      {state.invalid && (
        <p role="alert">
          Invalid comparison URL.{' '}
          <button onClick={() => setParams({})}>Reset comparison</button>
        </p>
      )}
      {message && <p role="alert">{message}</p>}
      {!state.invalid && (
        <>
          {state.slots.length < 4 && (
            <PlayerCombobox
              label="Add player to comparison"
              onSelect={(player) => {
                try {
                  setParams(
                    buildLabParams(addLabPlayer(state.slots, player.id), state.metric),
                  );
                  setMessage('');
                } catch {
                  setMessage(
                    'Choose a different player; this NBA ID is already selected.',
                  );
                }
              }}
            />
          )}
          {state.slots.map((slot) => (
            <PlayerSlot
              key={slot.playerId}
              slot={slot}
              onSeason={(season) =>
                setParams(
                  buildLabParams(
                    state.slots.map((s) =>
                      s.playerId === slot.playerId
                        ? { ...s, season: season || null }
                        : s,
                    ),
                    state.metric,
                  ),
                )
              }
              onRemove={() => {
                setParams(
                  buildLabParams(
                    state.slots.filter((s) => s.playerId !== slot.playerId),
                    state.metric,
                  ),
                );
                setMessage('');
              }}
            />
          ))}
          <label>
            Comparison metric
            <select
              value={state.metric}
              onChange={(e) =>
                setParams(
                  buildLabParams(
                    state.slots,
                    e.target.value as ComparisonMetric | 'all',
                  ),
                )
              }
            >
              <option value="all">All supported metrics</option>
              {COMPARISON_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.unit})
                </option>
              ))}
            </select>
          </label>
          <label>
            Shareable comparison URL
            <input
              readOnly
              value={`${window.location.origin}/lab/compare${params.size ? `?${params}` : ''}`}
              onFocus={(e) => e.target.select()}
            />
          </label>
          {!ready && (
            <p role="status">
              Add at least two players and select a season for each to compare.
            </p>
          )}
          {ready && <QueryFeedback pending={query.isPending} failed={query.isError} />}
          {ready && query.data && (
            <>
              <Link to={`/lab/analytics?${apiParams}`}>Analyze selected cohort</Link>
              <SourceNote provenance={query.data.provenance} />
              <ResearchTable label="Multi-player season comparison">
                <table>
                  <caption>
                    Recorded regular-season summaries; unavailable means missing, not
                    zero
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric (unit)</th>
                      {query.data.rows.map((row) => (
                        <th scope="col" key={row.playerId}>
                          {row.player?.fullName ?? `NBA ${row.playerId}`} · {row.season}
                          <br />
                          {row.stats?.team?.abbreviation ??
                            'Multiple teams / not supplied'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr key={metric.key}>
                        <th scope="row">
                          {metric.label} ({metric.unit})
                        </th>
                        {query.data!.rows.map((row) => (
                          <td key={row.playerId}>
                            {row.stats
                              ? metric.unit === '%'
                                ? `${(row.stats[metric.key] * 100).toFixed(1)}%`
                                : metric.unit === 'games'
                                  ? row.stats[metric.key]
                                  : row.stats[metric.key].toFixed(1)
                              : `Unavailable (${row.status})`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                Per-game means use the provider's season-summary convention. Shooting
                percentages are sourced season ratios; raw attempts are not exposed.
                Compare games played before interpreting small samples. No custom winner
                or official ranking is implied.
              </p>
            </>
          )}
        </>
      )}
    </ResearchShell>
  );
}
