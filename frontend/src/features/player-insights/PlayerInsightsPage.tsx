import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router';
import {
  InsightQuerySchema,
  PlayerInsightsResponseSchema,
  ResearchPlayerIdSchema,
  type GameSummaryStats,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { useHubIdentity } from '../player-hub/hub-context';
import { SeasonTotalsPanel } from './SeasonTotalsPanel';
import { FormChart, FormScoreboard } from './FormVisuals';
import { Slate } from '../../ui/Slate';
import type { TapeSpec } from '../../ui/Tape';

const QUERIED: TapeSpec = { code: 'NBA.com', source: 'Queried', variant: 'queried' };
const DERIVED: TapeSpec = { code: 'Calculated', variant: 'derived' };

const value = (n: number | null) => (n === null ? 'Unavailable' : n.toFixed(1));

function SummaryRow({ label, summary }: { label: string; summary: GameSummaryStats }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{summary.sample}</td>
      <td>{value(summary.points)}</td>
      <td>{value(summary.rebounds)}</td>
      <td>{value(summary.assists)}</td>
      <td>{value(summary.minutes)}</td>
      <td>
        {summary.wins}–{summary.losses}
      </td>
    </tr>
  );
}

export function PlayerInsightsPage() {
  const { playerId } = useParams();
  const [params, setParams] = useSearchParams();
  const entries = Object.fromEntries(params);
  const valid = InsightQuerySchema.safeParse(entries);
  const repeated = [...params.keys()].some((key) => params.getAll(key).length > 1);
  const validId = ResearchPlayerIdSchema.safeParse(playerId).success;
  const query = useQuery({
    queryKey: ['research', 'insights', playerId, params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/players/${encodeURIComponent(playerId ?? '')}/insights?${params}`,
        signal,
        (v) => PlayerInsightsResponseSchema.parse(v),
      ),
    enabled: validId && valid.success && !repeated,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  function update(key: string, next: string) {
    const copy = new URLSearchParams(params);
    if (next) copy.set(key, next);
    else copy.delete(key);
    if (key !== 'page') copy.delete('page');
    setParams(copy);
  }
  const data = query.data;
  useHubIdentity(
    data ? { playerId: data.player.id, name: data.player.fullName } : null,
  );
  const savedParams = new URLSearchParams(params);
  if (data?.season) savedParams.set('season', data.season);
  return (
    <ResearchShell
      title={data ? `${data.player.fullName}: player insights` : 'Player insights'}
    >
      {!valid.success || !validId || repeated ? (
        <p role="alert">
          Invalid research URL.{' '}
          <button onClick={() => setParams({})}>Reset filters</button>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SaveResearchButton
            kind="analysis"
            label={`${data.player.fullName} insights`}
            path={`/players/${data.player.id}/insights${savedParams.size ? `?${savedParams}` : ''}`}
          />
          <SourceNote provenance={data.provenance} />
          <div className={styles.controls}>
            <label>
              Season
              <select
                value={data.season ?? ''}
                onChange={(e) => update('season', e.target.value)}
              >
                {data.season && !data.seasons.some((s) => s.season === data.season) && (
                  <option value={data.season}>{data.season} (unavailable)</option>
                )}
                {!data.season && <option value="">No recorded seasons</option>}
                {data.seasons.map((s) => (
                  <option key={s.season} value={s.season}>
                    {s.season} ·{' '}
                    {s.team?.abbreviation ?? 'Multiple teams / not supplied'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rolling window
              <select
                value={data.window}
                onChange={(e) => update('window', e.target.value)}
              >
                {[...new Set([5, 10, 20, data.window])]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n} games
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <form
            className={styles.controls}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const copy = new URLSearchParams(params);
              for (const key of ['from', 'to', 'opponent', 'location', 'result']) {
                const field = String(form.get(key) ?? '')
                  .trim()
                  .toUpperCase();
                const next = key === 'location' ? field.toLowerCase() : field;
                if (next) copy.set(key, next);
                else copy.delete(key);
              }
              copy.delete('page');
              setParams(copy);
            }}
            key={`${params.get('from')}-${params.get('to')}-${params.get('opponent')}-${params.get('location')}-${params.get('result')}`}
          >
            <label>
              From date
              <input name="from" type="date" defaultValue={params.get('from') ?? ''} />
            </label>
            <label>
              To date
              <input name="to" type="date" defaultValue={params.get('to') ?? ''} />
            </label>
            <label>
              Opponent abbreviation
              <input
                name="opponent"
                maxLength={3}
                pattern="[A-Za-z]{3}"
                defaultValue={params.get('opponent') ?? ''}
                placeholder="e.g. BOS"
              />
            </label>
            <label>
              Location
              <select name="location" defaultValue={params.get('location') ?? ''}>
                <option value="">All</option>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </label>
            <label>
              Result
              <select name="result" defaultValue={params.get('result') ?? ''}>
                <option value="">All</option>
                <option value="W">Win</option>
                <option value="L">Loss</option>
              </select>
            </label>
            <button type="submit">Apply filters</button>
            <button
              type="button"
              onClick={() => setParams(data.season ? { season: data.season } : {})}
            >
              Clear filters
            </button>
          </form>
          <p>
            Regular season only. {data.filteredGames} matching games of{' '}
            {data.observedGames} observed. Averages, splits and extrema below use the
            entire filtered cohort, independent of ledger pagination. Shooting splits
            and advanced efficiency are unsupported without raw attempts.
          </p>
          {!data.stats && (
            <p role="status">
              No recorded statistics for this season. Choose another recorded season.
            </p>
          )}
          <FormScoreboard
            summary={data.summary}
            recent={data.recent}
            window={data.window}
          />
          {data.rolling.length > 1 ? (
            <section className="frmod" aria-labelledby="form-chart-title">
              <Slate
                id="form-chart-title"
                title={`Rolling ${data.window}-game form`}
                tapes={[QUERIED, DERIVED]}
                meta={[`${data.rolling.length} games`, 'Trailing average']}
              />
              <FormChart rolling={data.rolling} window={data.window} />
            </section>
          ) : null}
          {data.season && (
            <SeasonTotalsPanel playerId={data.player.id} season={data.season} />
          )}
          <Slate title="Observed form and splits" tapes={[QUERIED]} />
          <ResearchTable label="Observed averages">
            <table>
              <caption>Per-game averages with actual sample counts</caption>
              <thead>
                <tr>
                  {['Cohort', 'Games', 'PTS', 'REB', 'AST', 'MIN', 'W–L'].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <SummaryRow label="All matching games" summary={data.summary} />
                <SummaryRow
                  label={`Last ${data.window} matching games`}
                  summary={data.recent}
                />
                {data.splits.map((s) => (
                  <SummaryRow key={s.label} label={s.label} summary={s.summary} />
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <Slate title="Observed highs and lows" tapes={[QUERIED]} />
          {data.extrema.length ? (
            <ResearchTable label="Observed extrema">
              <table>
                <caption>Filtered observed games; ties retained</caption>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">High</th>
                    <th scope="col">High game IDs</th>
                    <th scope="col">Low</th>
                    <th scope="col">Low game IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.extrema.map((row) => (
                    <tr key={row.metric}>
                      <th scope="row">{row.metric}</th>
                      <td>{row.high}</td>
                      <td>{row.highGames.join(', ')}</td>
                      <td>{row.low}</td>
                      <td>{row.lowGames.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          ) : (
            <p>No observed games match these filters.</p>
          )}
          <Slate title="Game ledger" tapes={[QUERIED]} meta={[`Page ${data.page}`]} />
          <div className={styles.controls}>
            <label>
              Sort games
              <select
                value={params.get('sort') ?? 'date'}
                onChange={(e) => update('sort', e.target.value)}
              >
                {['date', 'points', 'rebounds', 'assists', 'minutes'].map((metric) => (
                  <option key={metric}>{metric}</option>
                ))}
              </select>
            </label>
            <label>
              Sort direction
              <select
                value={params.get('order') ?? 'desc'}
                onChange={(e) => update('order', e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
          <ResearchTable label="Filtered game ledger">
            <table>
              <caption>Page {data.page} · recorded league game dates</caption>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Game ID',
                    'Team',
                    'Opponent',
                    'Location',
                    'Result',
                    'MIN',
                    'PTS',
                    'REB',
                    'AST',
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.games.map((game) => (
                  <tr key={game.id}>
                    <th scope="row">{game.date}</th>
                    <td>{game.id}</td>
                    <td>{game.team.abbreviation}</td>
                    <td>{game.opponent.abbreviation}</td>
                    <td>{game.location}</td>
                    <td>{game.result}</td>
                    <td>{game.minutes}</td>
                    <td>{game.points}</td>
                    <td>{game.rebounds}</td>
                    <td>{game.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <div className={styles.controls}>
            <button
              disabled={data.page <= 1}
              onClick={() => update('page', String(data.page - 1))}
            >
              Previous page
            </button>
            <button
              disabled={data.page * data.pageSize >= data.filteredGames}
              onClick={() => update('page', String(data.page + 1))}
            >
              Next page
            </button>
          </div>
          <Slate title="Rolling series" tapes={[QUERIED, DERIVED]} />
          <ResearchTable label="Rolling game series">
            <table>
              <caption>
                Chronological trailing {data.window} matching games, including the row's
                game
              </caption>
              <thead>
                <tr>
                  {['Date', 'Sample', 'PTS', 'REB', 'AST', 'MIN'].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rolling.map((row) => (
                  <tr key={row.gameId}>
                    <th scope="row">{row.date}</th>
                    <td>{row.summary.sample}</td>
                    <td>{value(row.summary.points)}</td>
                    <td>{value(row.summary.rebounds)}</td>
                    <td>{value(row.summary.assists)}</td>
                    <td>{value(row.summary.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        </>
      )}
    </ResearchShell>
  );
}
