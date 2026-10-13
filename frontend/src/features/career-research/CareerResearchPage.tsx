import { Link, useParams, useSearchParams } from 'react-router';
import {
  CAREER_METRICS,
  CareerQuerySchema,
  ResearchPlayerIdSchema,
} from '@nba-performance-explorer/contracts';
import { useCareerResearch } from './useCareerResearch';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';

const format = (n: number | null, ratio = false) =>
  n === null ? 'Unavailable' : ratio ? `${(n * 100).toFixed(2)}%` : n.toFixed(2);
export function CareerResearchPage() {
  const { playerId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const parsed = CareerQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success &&
    ResearchPlayerIdSchema.safeParse(playerId).success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const metric = parsed.success ? parsed.data.metric : 'pointsPerGame';
  const minGames = parsed.success ? parsed.data.minGames : 20;
  const query = useCareerResearch(playerId, metric, minGames, valid);
  const data = valid ? query.data : undefined;
  return (
    <ResearchShell
      title={data ? `${data.player.fullName} · reported career` : 'Reported career'}
    >
      <Link to={`/players/${playerId}/insights`}>Player insights</Link>
      {!valid ? (
        <p role="alert">
          Invalid career URL.{' '}
          <button onClick={() => setParams({})}>Reset criterion</button>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SaveResearchButton
            kind="analysis"
            label={`${data.player.fullName} reported career`}
            path={`/players/${playerId}/career?metric=${metric}&minGames=${minGames}`}
          />
          <SourceNote provenance={data.provenance} />
          <form
            className={styles.controls}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setParams({
                metric: String(form.get('metric')),
                minGames: String(form.get('minGames')),
              });
            }}
            key={`${metric}:${minGames}`}
          >
            <label>
              Peak criterion
              <select name="metric" defaultValue={metric}>
                {Object.entries(CAREER_METRICS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum games in season
              <input
                name="minGames"
                type="number"
                min={1}
                max={82}
                required
                defaultValue={minGames}
              />
            </label>
            <button>Apply peak criterion</button>
          </form>
          <h2>Qualified peak</h2>
          <p>
            {data.peak.qualifiedSeasons} qualified seasons; {data.peak.excludedSeasons}{' '}
            excluded for insufficient games or unavailable inputs. Highest{' '}
            {CAREER_METRICS[metric]}:{' '}
            {format(
              data.peak.value,
              metric === 'trueShooting' || metric === 'effectiveFieldGoal',
            )}
            .
          </p>
          {data.peak.seasons.length ? (
            <ul>
              {data.peak.seasons.map((s) => (
                <li key={s}>
                  <Link to={`/players/${playerId}/insights?season=${s}`}>
                    {s} insights
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No reported season qualifies.</p>
          )}
          {data.aggregate ? (
            <>
              <h2>Totals across reported seasons</h2>
              <ResearchTable label="Reported career aggregate">
                <table>
                  <caption>
                    Raw counts across {data.aggregate.seasonsReported} distinct reported
                    seasons; missing fields remain unavailable
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.aggregate)
                      .filter(([key]) => key !== 'metrics')
                      .map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{format(value as number | null)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                Attempt-weighted career TS% estimate:{' '}
                {format(data.aggregate.metrics.trueShooting, true)}; eFG%:{' '}
                {format(data.aggregate.metrics.effectiveFieldGoal, true)}. TS uses 0.44
                × FTA.
              </p>
            </>
          ) : (
            <p role="status">
              Career records are {data.status}. No synthetic totals are shown.
            </p>
          )}
          <h2>Reported milestone tracker</h2>
          <p>
            Thresholds cover reported rows only. A crossing identifies a reported
            season, not the actual first career crossing or an exact game date.
            Unreported years may contain earlier achievements.
          </p>
          <ResearchTable label="Reported milestones">
            <table>
              <caption>PTS, REB and AST thresholds using raw totals</caption>
              <thead>
                <tr>
                  {[
                    'Metric',
                    'Threshold',
                    'Reported total',
                    'Reached in reported rows',
                    'Crossing reported season',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.milestones.map((m) => (
                  <tr key={`${m.metric}:${m.threshold}`}>
                    <th scope="row">{m.metric}</th>
                    <td>{m.threshold}</td>
                    <td>{format(m.reportedTotal)}</td>
                    <td>{m.reached === null ? 'Unknown' : m.reached ? 'Yes' : 'No'}</td>
                    <td>{m.reachedByReportedSeason ?? 'Unavailable / not reached'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2>Season timeline</h2>
          <ResearchTable label="Reported season timeline">
            <table>
              <caption>
                Chronological reported regular seasons; gaps and missing statistics are
                retained
              </caption>
              <thead>
                <tr>
                  {[
                    'Season',
                    'Team',
                    'GP',
                    'PTS',
                    'REB',
                    'AST',
                    'PTS/G',
                    'REB/G',
                    'AST/G',
                    'TS%',
                    'eFG%',
                    'PTS/36',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.seasons.map((s, i) => (
                  <tr key={s.totals.season}>
                    <th scope="row">
                      <Link
                        to={`/players/${playerId}/insights?season=${s.totals.season}`}
                      >
                        {s.totals.season}
                      </Link>
                      {i > 0 &&
                        Number(s.totals.season.slice(0, 4)) -
                          Number(data.seasons[i - 1]!.totals.season.slice(0, 4)) >
                          1 &&
                        ' · preceding gap in reported seasons'}
                    </th>
                    <td>{s.totals.team?.abbreviation ?? 'Aggregate / not supplied'}</td>
                    <td>{s.totals.gamesPlayed}</td>
                    {[
                      s.totals.points,
                      s.totals.rebounds,
                      s.totals.assists,
                      s.pointsPerGame,
                      s.reboundsPerGame,
                      s.assistsPerGame,
                    ].map((v, index) => (
                      <td key={index}>{format(v)}</td>
                    ))}
                    <td>{format(s.metrics.trueShooting, true)}</td>
                    <td>{format(s.metrics.effectiveFieldGoal, true)}</td>
                    <td>{format(s.metrics.pointsPer36)}</td>
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
