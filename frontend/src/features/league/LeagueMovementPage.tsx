import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import {
  LeagueMovementQuerySchema,
  LeagueMovementResponseSchema,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { LineChart } from '../../charts/LineChart';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { longDate } from './game-format';

const METRICS: [string, string][] = [
  ['points', 'Points'],
  ['rebounds', 'Rebounds'],
  ['assists', 'Assists'],
  ['steals', 'Steals'],
  ['blocks', 'Blocks'],
  ['threesMade', '3-pointers made'],
];
const COLORS = [
  'var(--red-hi)',
  'var(--chalk)',
  'var(--amber)',
  'var(--s1)',
  'var(--chalk-3)',
];

/** League leaderboards rebuilt for every game date: where each player ranked, and when. */
export function LeagueMovementPage() {
  const [params, setParams] = useSearchParams();
  const parsed = LeagueMovementQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : LeagueMovementQuerySchema.parse({});
  const seasons = useLeagueSeasons();
  const query = useQuery({
    queryKey: ['league', 'movement', params.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/movement?${params}`,
        signal,
        LeagueMovementResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
  const update = (patch: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) copy.set(k, v);
      else copy.delete(k);
    }
    setParams(copy, { replace: Object.keys(patch).every((k) => k === 'date') });
  };
  const data = valid ? query.data : undefined;
  const label = METRICS.find(([k]) => k === q.metric)?.[1] ?? q.metric;
  const index = data ? data.dates.indexOf(data.query.date) : -1;
  const dates = data?.dates ?? [];
  const at = data ? dates.indexOf(data.query.date) : -1;
  const path = `/leaders/movement${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Leaderboard movement"
      lede={
        <p>
          The league leaderboard rebuilt for every game date of a season, from the box
          scores played by then: who led on any day, and how ranks moved. No position is
          inferred for a day without games.
        </p>
      }
    >
      <p>
        Also: <Link to="/leaders">Season leaders</Link> ·{' '}
        <Link to="/standings/race">Team standings race (2023–24)</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show the latest season
          </button>
        </p>
      ) : (
        <LeagueFeedback pending={query.isPending} error={query.error} />
      )}
      <div className={styles.controls}>
        <label>
          Season
          <select
            value={data?.query.season ?? q.season ?? ''}
            onChange={(e) => update({ season: e.target.value, date: null })}
          >
            {newestFirst(seasons.data?.seasons ?? []).map((s) => (
              <option
                key={s.season}
                value={s.season}
                disabled={!s.capabilities.playerStats}
              >
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
              update({
                scope: e.target.value === 'regular-season' ? null : e.target.value,
                date: null,
              })
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
              update({ metric: e.target.value === 'points' ? null : e.target.value })
            }
          >
            {METRICS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rate
          <select
            value={q.mode}
            onChange={(e) =>
              update({ mode: e.target.value === 'per-game' ? null : e.target.value })
            }
          >
            <option value="per-game">Per game</option>
            <option value="totals">Totals</option>
          </select>
        </label>
      </div>
      {data && dates.length ? (
        <>
          <div className="pbp-scrubber">
            <label>
              As of {longDate(data.query.date)} (game day {at + 1} of {dates.length})
              <input
                type="range"
                min={0}
                max={dates.length - 1}
                value={Math.max(0, at)}
                onChange={(e) =>
                  update({ date: dates[Number(e.target.value)] ?? null })
                }
                aria-valuetext={longDate(dates[Math.max(0, at)]!)}
              />
            </label>
            <div className="pbp-scrubber__buttons">
              <button
                type="button"
                disabled={at <= 0}
                onClick={() => update({ date: dates[at - 1] ?? null })}
              >
                Previous game day
              </button>
              <button
                type="button"
                disabled={at >= dates.length - 1}
                onClick={() => update({ date: dates[at + 1] ?? null })}
              >
                Next game day
              </button>
            </div>
          </div>
          <p className="team-note">{data.qualification}</p>
          {data.trajectories.length && index > 0 ? (
            <LineChart
              label={`Rank by date for the leaders as of ${longDate(data.query.date)}`}
              categories={data.dates.slice(0, data.trajectories[0]!.ranks.length)}
              series={data.trajectories.slice(0, 5).map((t, i) => ({
                id: t.playerId,
                label: t.name,
                color: COLORS[i]!,
                values: t.ranks.map((r) => (r === null ? null : -r)),
              }))}
              format={(v) => `#${-v}`}
              formatCategory={(d) => longDate(d)}
              height={240}
            />
          ) : null}
          <ResearchTable label="Leaderboard on this date">
            <table>
              <caption>
                {label}, {q.mode === 'per-game' ? 'per game' : 'totals'}, as of{' '}
                {longDate(data.query.date)}; movement against the previous game day
              </caption>
              <thead>
                <tr>
                  {['Rank', 'Move', 'Player', 'Team', 'GP', label].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.snapshot.map((r) => {
                  const move = r.previousRank === null ? null : r.previousRank - r.rank;
                  return (
                    <tr key={r.playerId}>
                      <td>{r.rank}</td>
                      <td>
                        {move === null ? (
                          <span title="Not ranked on the previous game day">new</span>
                        ) : move > 0 ? (
                          <span aria-label={`up ${move}`}>▲ {move}</span>
                        ) : move < 0 ? (
                          <span aria-label={`down ${-move}`}>▼ {-move}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <th scope="row">
                        <Link
                          to={`/players/${r.playerId}/records`}
                          className="withface"
                        >
                          <PlayerAvatar playerId={r.playerId} name={r.name} size={24} />
                          {r.name}
                        </Link>
                      </th>
                      <td>{r.team}</td>
                      <td>{r.gamesPlayed}</td>
                      <td>
                        {q.mode === 'per-game'
                          ? r.value.toFixed(1)
                          : r.value.toLocaleString('en-US')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResearchTable>
          <SaveResearchButton
            kind="analysis"
            label={`${label} leaderboard movement ${data.query.season}`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
