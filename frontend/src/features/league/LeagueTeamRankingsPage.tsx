import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  LeagueTeamMetricSchema,
  LeagueTeamRankingsQuerySchema,
  LeagueTeamRankingsResponseSchema,
  type LeagueTeamMetric,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { RankBars } from '../../charts/RankBars';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

const LABELS: Record<LeagueTeamMetric, string> = {
  winPercentage: 'Win percentage',
  pointsPerGame: 'Points per game',
  opponentPointsPerGame: 'Points allowed per game',
  pointDifferential: 'Point differential per game',
  offensiveRating: 'Offensive rating',
  defensiveRating: 'Defensive rating',
  netRating: 'Net rating',
  pace: 'Pace',
  fieldGoalPercentage: 'FG%',
  threePointPercentage: '3P%',
  freeThrowPercentage: 'FT%',
  trueShootingPercentage: 'TS%',
  reboundsPerGame: 'Rebounds per game',
  assistsPerGame: 'Assists per game',
  turnoversPerGame: 'Turnovers per game',
};
const PERCENT = new Set<LeagueTeamMetric>([
  'winPercentage',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'trueShootingPercentage',
]);

/** Every team in a season ranked on one measure. */
export function LeagueTeamRankingsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = LeagueTeamRankingsQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : LeagueTeamRankingsQuerySchema.parse({});
  const seasons = useLeagueSeasons();
  const season = q.season ?? seasons.data?.seasons.at(-1)?.season;
  const api = new URLSearchParams(params);
  if (season) api.set('season', season);
  const query = useQuery({
    queryKey: ['league', 'team-rankings', api.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/team-rankings?${api}`,
        signal,
        LeagueTeamRankingsResponseSchema.parse,
      ),
    enabled: valid && Boolean(season),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: string, value: string | null) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const data = valid ? query.data : undefined;
  const fmt = (v: number) =>
    PERCENT.has(q.metric)
      ? q.metric === 'winPercentage'
        ? v.toFixed(3).replace(/^0/, '')
        : `${(v * 100).toFixed(1)}%`
      : `${q.metric === 'pointDifferential' || q.metric === 'netRating' ? (v > 0 ? '+' : '') : ''}${v.toFixed(1)}`;
  const path = `/leaders/teams${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Team rankings"
      lede={
        <p>
          Every team in a season ranked on one measure: records, scoring, shooting and,
          from 1996–97, NBA.com’s offensive, defensive and net ratings and pace.
        </p>
      }
    >
      <p>
        Also: <Link to="/leaders">Player leaders</Link> ·{' '}
        <Link to="/standings">Standings</Link> ·{' '}
        <Link to="/standings/recorded">Recorded 2023–24 team rankings</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This rankings link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show the latest season
          </button>
        </p>
      ) : (
        <LeagueFeedback
          pending={seasons.isPending || (Boolean(season) && query.isPending)}
          error={seasons.error ?? query.error}
        />
      )}
      <div className={styles.controls}>
        <label>
          Season
          <select
            value={season ?? ''}
            onChange={(e) => update('season', e.target.value)}
          >
            {newestFirst(seasons.data?.seasons ?? []).map((s) => (
              <option key={s.season} value={s.season}>
                {seasonDisplay(s.season)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Games
          <select
            value={q.scope}
            onChange={(e) =>
              update(
                'scope',
                e.target.value === 'regular-season' ? null : e.target.value,
              )
            }
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
        <label>
          Measure
          <select
            value={q.metric}
            onChange={(e) =>
              update('metric', e.target.value === 'netRating' ? null : e.target.value)
            }
          >
            {LeagueTeamMetricSchema.options.map((m) => (
              <option key={m} value={m}>
                {LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data ? (
        <>
          <p>
            <strong>
              {LABELS[data.query.metric]}, {seasonDisplay(data.query.season)}{' '}
              {data.query.scope === 'playoffs' ? 'playoffs' : 'regular season'}.
            </strong>{' '}
            {data.definition}{' '}
            {data.direction === 'lower-is-better'
              ? 'Lower is better: rank 1 is the lowest.'
              : ''}
          </p>
          {data.unavailable ? (
            <p role="status">{data.unavailable}</p>
          ) : (
            <RankBars
              label={`${LABELS[data.query.metric]} by team`}
              rows={data.rows.map((r) => ({
                key: r.team.id,
                label: (
                  <span>
                    <b>{r.rank}</b> {r.team.name}
                  </span>
                ),
                value: r.value,
                display: fmt(r.value),
              }))}
            />
          )}
          {data.rows.length ? (
            <ResearchTable label="Team rankings table">
              <table>
                <caption>{data.rows.length} teams</caption>
                <thead>
                  <tr>
                    {['Rank', 'Team', 'W–L', LABELS[data.query.metric]].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.team.id}>
                      <td>{r.rank}</td>
                      <th scope="row">
                        <Link to={`/teams/${r.team.id}?season=${data.query.season}`}>
                          {r.team.name}
                        </Link>
                      </th>
                      <td>
                        {r.wins}–{r.losses}
                      </td>
                      <td>{fmt(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          ) : null}
          <SaveResearchButton
            kind="analysis"
            label={`${seasonDisplay(data.query.season)} team ${LABELS[data.query.metric].toLowerCase()}`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
