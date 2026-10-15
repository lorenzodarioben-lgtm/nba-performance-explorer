import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedDirectorySchema,
  RecordedSimilarityResponseSchema,
  type RecordedSimilarityResponse,
  type SimilarityMetric,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { PlayerFinder } from '../comparison-studio/PlayerFinder';
import { SavedViews } from '../my-nba/SavedViews';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { downloadShotFile } from '../shot-archive/shot-export';
import { Slate } from '../../ui/Slate';
import { Icon } from '../../ui/Icon';
import {
  DEFAULT_METRICS,
  SIMILARITY_METRICS,
  SIM_LABEL,
  formatMetric,
  readSimilarityState,
  signed,
  similarityCsv,
} from './similarity-config';

const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'Z DISTANCE', variant: 'derived' as const },
];
/** Differences are drawn to ±2.5 cohort SDs; the exact number is always printed beside. */
const DIFF_SCALE = 2.5;

export function SimilarityPage() {
  const [params, setParams] = useSearchParams();
  const state = readSimilarityState(params);
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const api = new URLSearchParams();
  if (state.valid && state.player) {
    api.set('player', state.player);
    api.set('metrics', state.metrics.join(','));
    api.set('minGames', String(state.minGames));
    api.set('limit', String(state.limit));
  }
  const result = useQuery({
    queryKey: ['research', 'recorded-similarity', api.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/similarity?${api}`,
        signal,
        RecordedSimilarityResponseSchema.parse,
      ),
    enabled: state.valid && Boolean(state.player),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const metrics = state.valid ? state.metrics : [...DEFAULT_METRICS];
  const toggle = (m: SimilarityMetric) => {
    const next = metrics.includes(m)
      ? metrics.filter((x) => x !== m)
      : SIMILARITY_METRICS.filter((x) => x === m || metrics.includes(x));
    update('metrics', next.join(','));
  };
  const data = state.valid && state.player ? result.data : undefined;
  const nameOf = (id: string) =>
    directory.data?.players.find((p) => p.playerId === id)?.name ?? `NBA player ${id}`;
  const path = `/discover/similar?${params}`;
  return (
    <ResearchShell
      title="Similarity finder"
      lede={
        <p>
          Choose a recorded 2023–24 season and the measures that matter to your
          question; the finder lists the seasons closest on exactly those measures, and
          shows where each one differs.
        </p>
      }
    >
      {!state.valid ? (
        <p role="alert">
          This similarity link is not supported: choose one player, two to nine
          different measures, a games minimum of 1 to 82 and 1 to 25 results.{' '}
          <Link to="/discover/similar">Start again</Link>.
        </p>
      ) : null}
      <section className="sim-setup" aria-label="Similarity question">
        <div className="sim-target">
          {state.valid && state.player ? (
            <p className="sim-target__name">
              <span className="t-meta">Seasons like</span>{' '}
              <b>{data?.targetName ?? nameOf(state.player)}</b>{' '}
              <button
                type="button"
                className="btn btn--sm btn--quiet"
                onClick={() => update('player', '')}
              >
                Change player
              </button>
            </p>
          ) : (
            <PlayerFinder
              label="Find seasons like"
              players={directory.data?.players ?? []}
              exclude={[]}
              onPick={(id) => update('player', id)}
            />
          )}
        </div>
        <fieldset className="sim-metrics">
          <legend>Match on ({metrics.length} of 9; at least 2)</legend>
          {SIMILARITY_METRICS.map((m) => {
            const on = metrics.includes(m);
            return (
              <label key={m} className="sim-metric">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={on && metrics.length <= 2}
                  onChange={() => toggle(m)}
                />
                {SIM_LABEL[m]}
              </label>
            );
          })}
        </fieldset>
        <div className="sim-knobs">
          <label>
            Minimum games
            <input
              type="number"
              min={1}
              max={82}
              value={state.valid ? state.minGames : 20}
              onChange={(e) => update('minGames', e.target.value)}
            />
          </label>
          <label>
            Results
            <select
              value={state.valid ? state.limit : 10}
              onChange={(e) => update('limit', e.target.value)}
            >
              {[5, 10, 15, 25].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {state.valid && !state.player ? (
        <p className="cs-empty">
          Pick a player to begin. Try{' '}
          <Link to="/discover/similar?player=203999&metrics=pointsPerGame,reboundsPerGame,assistsPerGame,fieldGoalPercentage">
            Jokić on scoring, rebounding, passing and FG%
          </Link>{' '}
          or{' '}
          <Link to="/discover/similar?player=201939&metrics=pointsPerGame,assistsPerGame,threePointPercentage,freeThrowPercentage">
            Curry on scoring, passing and shooting
          </Link>
          .
        </p>
      ) : (
        <QueryFeedback
          pending={result.isPending && Boolean(state.valid && state.player)}
          failed={result.isError}
        />
      )}
      {data ? (
        <Result
          data={data}
          updating={result.isPlaceholderData}
          path={path}
          onMinGames={(n) => update('minGames', String(n))}
        />
      ) : null}
    </ResearchShell>
  );
}

function Result({
  data,
  updating,
  path,
  onMinGames,
}: {
  data: RecordedSimilarityResponse;
  updating: boolean;
  path: string;
  onMinGames: (n: number) => void;
}) {
  const maxDistance = Math.max(0.01, ...data.neighbours.map((n) => n.distance));
  const cohortLine = `${data.cohort} players with at least ${data.minGames} games and a value for every chosen measure; ${data.excluded.belowMinimum} below the games minimum and ${data.excluded.missingMetric} missing a measure are left out.`;
  return (
    <div className="sim-result" aria-busy={updating}>
      <Slate
        title={`Seasons like ${data.targetName}`}
        tapes={TAPES}
        meta={[
          `${data.metrics.length} measures`,
          `Cohort ${data.cohort}`,
          `${data.minGames}+ games`,
        ]}
      />
      {data.target === null ? (
        <p role="status" className="sim-outside">
          {data.targetStatus === 'below-minimum' ? (
            <>
              {data.targetName} played {data.targetGames} games, below this{' '}
              {data.minGames}
              -game minimum, so there is no cohort position to compare.{' '}
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => onMinGames(Math.max(1, data.targetGames))}
              >
                Lower the minimum to {Math.max(1, data.targetGames)}
              </button>
            </>
          ) : (
            <>
              {data.targetName} has no published value for at least one chosen measure
              (traded players have no combined shooting percentages in the source), so
              there is nothing to compare without inventing a number. Choose other
              measures.
            </>
          )}
        </p>
      ) : (
        <>
          <p className="sim-cohort">{cohortLine}</p>
          <ol className="sim-list" aria-label={`Nearest seasons to ${data.targetName}`}>
            {data.neighbours.map((n) => (
              <li key={n.playerId} className="sim-row">
                <span className="sim-row__rank">{n.rank}</span>
                <span className="sim-row__who">
                  <Link to={`/players/${n.playerId}/archive`}>{n.name}</Link>
                  <small>
                    {n.teams.join(' / ')} · {n.gamesPlayed} games
                  </small>
                </span>
                <span
                  className="sim-row__dist"
                  title="Root-mean-square z difference across the chosen measures"
                >
                  <span className="sim-row__meter" aria-hidden="true">
                    <i style={{ width: `${(100 * n.distance) / maxDistance}%` }} />
                  </span>
                  <b>{n.distance.toFixed(2)}</b>
                  <small>distance</small>
                </span>
                <span className="sim-row__why">
                  Closest on {SIM_LABEL[n.closest]}; furthest on {SIM_LABEL[n.furthest]}{' '}
                  ({signed(n.differences[data.metrics.indexOf(n.furthest)]!)} SD)
                </span>
                <Link
                  className="sim-row__compare"
                  to={`/compare/recorded?players=${data.target!.playerId},${n.playerId}`}
                >
                  Compare
                </Link>
              </li>
            ))}
          </ol>
          <ResearchTable label="Similarity exact values">
            <table className="sim-table">
              <caption>
                Each measure&rsquo;s value, and the neighbour&rsquo;s cohort z-score
                minus {data.targetName}&rsquo;s (bar to ±{DIFF_SCALE} SD; right is
                higher)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Distance</th>
                  {data.metrics.map((m) => (
                    <th scope="col" key={m}>
                      {SIM_LABEL[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="sim-table__target">
                  <th scope="row">{data.targetName}</th>
                  <td>—</td>
                  {data.metrics.map((m, k) => (
                    <td key={m}>
                      {formatMetric(m, data.target!.values[k]!)}
                      <small> z {signed(data.target!.zScores[k]!)}</small>
                    </td>
                  ))}
                </tr>
                {data.neighbours.map((n) => (
                  <tr key={n.playerId}>
                    <th scope="row">{n.name}</th>
                    <td>{n.distance.toFixed(3)}</td>
                    {data.metrics.map((m, k) => (
                      <td key={m}>
                        {formatMetric(m, n.values[k]!)}
                        <DiffBar value={n.differences[k]!} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        </>
      )}
      <div className="sim-tools">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() =>
            downloadShotFile(
              similarityCsv(data),
              'text/csv;charset=utf-8',
              `nba-similar-${data.target?.playerId ?? 'player'}-${data.metrics.join('-')}.csv`,
            )
          }
        >
          <Icon name="download" size={15} />
          Export neighbours CSV
        </button>
        <SaveResearchButton
          kind="analysis"
          label={`Seasons like ${data.targetName}`}
          path={path}
        />
      </div>
      <SavedViews
        path={path}
        prefix="/discover/similar"
        title="Saved similarity questions"
        placeholder="e.g. Jokić-style passing bigs"
      />
      <p className="sim-method">
        Method: each measure is standardised inside this cohort (population SD); the
        distance is the square root of the mean squared z difference, so 0 is identical
        on every measure and 1 is one cohort SD apart on average, whatever the number of
        measures. Every measure weighs the same. See the{' '}
        <Link to="/lab/formulas">Formula lab</Link>.
      </p>
      <SourceNote provenance={data.provenance} />
    </div>
  );
}

function DiffBar({ value }: { value: number }) {
  const share = Math.min(1, Math.abs(value) / DIFF_SCALE);
  return (
    <span className="sim-diff" data-sign={value >= 0 ? 'up' : 'down'}>
      <span className="sim-diff__track" aria-hidden="true">
        <i
          style={{
            width: `${share * 50}%`,
            [value >= 0 ? 'left' : 'right']: '50%',
          }}
        />
      </span>
      <small>{signed(value)}</small>
    </span>
  );
}
