import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  GameResearchQuerySchema,
  GameResearchResponseSchema,
  ResearchPlayerIdSchema,
  RAW_GAME_METRICS,
  type GameResearchResponse,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { SeasonScopeComparison } from './SeasonScopeComparison';
import styles from '../research/research.module.css';
const format = (n: number | null, ratio = false) =>
  n === null ? 'Unavailable' : ratio ? `${(n * 100).toFixed(2)}%` : n.toFixed(2);
function SummaryRow({
  label,
  s,
}: {
  label: string;
  s: GameResearchResponse['summary'];
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{s.sample}</td>
      <td>{s.qualified ? 'Yes' : `No (minimum ${s.minSample})`}</td>
      {RAW_GAME_METRICS.map((key) => (
        <td key={key}>{format(s.perGame[key])}</td>
      ))}
      <td>{format(s.metrics.fieldGoalPercentage, true)}</td>
      <td>{format(s.metrics.threePointPercentage, true)}</td>
      <td>{format(s.metrics.freeThrowPercentage, true)}</td>
      <td>{format(s.metrics.trueShooting, true)}</td>
      <td>{format(s.metrics.effectiveFieldGoal, true)}</td>
      <td>
        {s.wins}–{s.losses}
      </td>
    </tr>
  );
}
export function GameResearchPage() {
  const { playerId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const parsed = GameResearchQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success &&
    ResearchPlayerIdSchema.safeParse(playerId).success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'raw-games', playerId, params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/players/${playerId}/game-research?${params}`,
        signal,
        GameResearchResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    copy.set(key, value);
    if (key !== 'page') copy.delete('page');
    setParams(copy);
  };
  return (
    <ResearchShell
      title={data ? `${data.player.fullName} · game research` : 'Game research'}
    >
      <Link to={`/players/${playerId}/career`}>Reported career</Link>
      {!valid ? (
        <section role="alert">
          Choose a valid recorded season and filters.{' '}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const season = new FormData(e.currentTarget).get('season');
              setParams({ season: String(season) });
            }}
          >
            <label>
              Season (YYYY-YY)
              <input
                name="season"
                required
                pattern="[0-9]{4}-[0-9]{2}"
                placeholder="2023-24"
              />
            </label>
            <button>Open season</button>
          </form>
        </section>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SaveResearchButton
            kind="analysis"
            label={`${data.player.fullName} game research`}
            path={`/players/${playerId}/games?${params}`}
          />
          <label>
            Shareable game research URL
            <input
              readOnly
              value={`${window.location.origin}/players/${playerId}/games?${params}`}
            />
          </label>
          <SourceNote provenance={data.provenance} />
          <form
            key={params.toString()}
            className={styles.controls}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const copy = new URLSearchParams();
              for (const [key, value] of form.entries())
                if (String(value).trim()) copy.set(key, String(value).trim());
              copy.set('window', params.get('window') ?? '5');
              copy.set('sort', params.get('sort') ?? 'date');
              copy.set('order', params.get('order') ?? 'desc');
              setParams(copy);
            }}
          >
            <label>
              Recorded season
              <input
                name="season"
                required
                pattern="[0-9]{4}-[0-9]{2}"
                defaultValue={data.season}
              />
            </label>
            <label>
              Minimum cohort sample
              <input
                name="minSample"
                type="number"
                min={1}
                max={150}
                required
                defaultValue={params.get('minSample') ?? '1'}
              />
            </label>
            <label>
              Game season scope
              <select name="scope" defaultValue={data.scope}>
                <option value="regular-season">Regular season</option>
                <option value="playoffs">Playoffs</option>
              </select>
            </label>
            <label>
              From date
              <input name="from" type="date" defaultValue={params.get('from') ?? ''} />
            </label>
            <label>
              To date
              <input name="to" type="date" defaultValue={params.get('to') ?? ''} />
            </label>
            <label>
              Opponent
              <input
                name="opponent"
                maxLength={3}
                pattern="[A-Z]{3}"
                placeholder="BOS"
                defaultValue={params.get('opponent') ?? ''}
              />
            </label>
            <label>
              Game location
              <select name="location" defaultValue={params.get('location') ?? ''}>
                <option value="">All</option>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </label>
            <label>
              Game result
              <select name="result" defaultValue={params.get('result') ?? ''}>
                <option value="">All</option>
                <option value="W">Win</option>
                <option value="L">Loss</option>
              </select>
            </label>
            {['Points', 'Rebounds', 'Assists', 'Minutes'].map((label) => (
              <label key={label}>
                Minimum {label.toLowerCase()}
                <input
                  type="number"
                  min={0}
                  max={label === 'Points' ? 200 : 100}
                  step={label === 'Minutes' ? 'any' : 1}
                  name={`min${label}`}
                  defaultValue={params.get(`min${label}`) ?? ''}
                />
              </label>
            ))}
            <button>Apply game filters</button>
            <button
              type="button"
              onClick={() => setParams({ season: data.season, scope: data.scope })}
            >
              Clear game filters
            </button>
          </form>
          <p>
            {data.scope}; {data.filteredGames} matching games of {data.observedGames}{' '}
            observed. Same-scope summary GP: {data.reportedSeasonGames ?? 'Unavailable'}
            . Status: {data.status}. Thresholds restrict the cohort before calculations.
          </p>
          <div className={styles.controls}>
            <label>
              Raw rolling window
              <select
                value={data.window}
                onChange={(e) => update('window', e.target.value)}
              >
                {[...new Set([5, 10, 20, data.window])]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Raw game sort
              <select
                value={params.get('sort') ?? 'date'}
                onChange={(e) => update('sort', e.target.value)}
              >
                {['date', ...RAW_GAME_METRICS].map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
            <label>
              Raw sort direction
              <select
                value={params.get('order') ?? 'desc'}
                onChange={(e) => update('order', e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
          <h2>Attempt-weighted observed splits</h2>
          <p>
            Derived averages and shooting ratios stay unavailable until a cohort reaches
            the chosen minimum sample. Raw observed totals and game evidence remain
            available.
          </p>
          <ResearchTable label="Raw shooting and defensive splits">
            <table>
              <caption>
                Per-game counts and aggregated-attempt shooting; all matching games,
                independent of pagination
              </caption>
              <thead>
                <tr>
                  {[
                    'Cohort',
                    'Sample',
                    'Qualified',
                    ...RAW_GAME_METRICS,
                    'FG%',
                    '3P%',
                    'FT%',
                    'TS%',
                    'eFG%',
                    'W–L',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SummaryRow label="All matching" s={data.summary} />
                <SummaryRow label={`Last ${data.window} matching`} s={data.recent} />
                {data.splits.map((s) => (
                  <SummaryRow key={s.label} label={s.label} s={s.summary} />
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2>Observed raw game ledger</h2>
          <ResearchTable label="Raw game ledger">
            <table>
              <caption>
                Page {data.page}; recorded game dates and stable source IDs
              </caption>
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
                    'STL',
                    'BLK',
                    'TOV',
                    'FGM',
                    'FGA',
                    '3PM',
                    '3PA',
                    'FTM',
                    'FTA',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.games.map(({ game: g, raw: r }) => (
                  <tr key={g.id}>
                    <th scope="row">{g.date}</th>
                    <td>{g.id}</td>
                    <td>{g.team.abbreviation}</td>
                    <td>{g.opponent.abbreviation}</td>
                    <td>{g.location}</td>
                    <td>{g.result}</td>
                    {[
                      g.minutes,
                      g.points,
                      g.rebounds,
                      g.assists,
                      r.steals,
                      r.blocks,
                      r.turnovers,
                      r.fieldGoalsMade,
                      r.fieldGoalsAttempted,
                      r.threesMade,
                      r.threesAttempted,
                      r.freeThrowsMade,
                      r.freeThrowsAttempted,
                    ].map((n, i) => (
                      <td key={i}>{n ?? 'Unavailable'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          {!data.filteredGames && (
            <p role="status">No observed games match the filters.</p>
          )}
          <div className={styles.controls}>
            <button
              disabled={data.page <= 1}
              onClick={() => update('page', String(data.page - 1))}
            >
              Previous raw page
            </button>
            <button
              disabled={data.page * data.pageSize >= data.filteredGames}
              onClick={() => update('page', String(data.page + 1))}
            >
              Next raw page
            </button>
          </div>
          <h2>Observed records with evidence</h2>
          <ResearchTable label="Raw game extrema">
            <table>
              <caption>
                Filtered observed games only; all ties, missing inputs excluded
              </caption>
              <thead>
                <tr>
                  {['Metric', 'High', 'High evidence', 'Low', 'Low evidence'].map(
                    (s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.extrema.map((s) => (
                  <tr key={s.metric}>
                    <th scope="row">{s.metric}</th>
                    <td>{format(s.high)}</td>
                    <td>
                      {s.highGames
                        .map((g) => `${g.date} vs ${g.opponent.abbreviation} (${g.id})`)
                        .join('; ') || 'Unavailable'}
                    </td>
                    <td>{format(s.low)}</td>
                    <td>
                      {s.lowGames
                        .map((g) => `${g.date} vs ${g.opponent.abbreviation} (${g.id})`)
                        .join('; ') || 'Unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2>Raw rolling series</h2>
          <ResearchTable label="Raw rolling shooting">
            <table>
              <caption>
                Chronological trailing {data.window} matching games; cumulative sample
                counts and weighted attempts
              </caption>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Sample',
                    'PTS/G',
                    'STL/G',
                    'BLK/G',
                    'TOV/G',
                    'TS%',
                    'eFG%',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rolling.map((s) => (
                  <tr key={s.gameId}>
                    <th scope="row">{s.date}</th>
                    <td>{s.summary.sample}</td>
                    {[
                      s.summary.perGame.points,
                      s.summary.perGame.steals,
                      s.summary.perGame.blocks,
                      s.summary.perGame.turnovers,
                    ].map((n, i) => (
                      <td key={i}>{format(n)}</td>
                    ))}
                    <td>{format(s.summary.metrics.trueShooting, true)}</td>
                    <td>{format(s.summary.metrics.effectiveFieldGoal, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <SeasonScopeComparison playerId={playerId} season={data.season} />
        </>
      )}
    </ResearchShell>
  );
}
