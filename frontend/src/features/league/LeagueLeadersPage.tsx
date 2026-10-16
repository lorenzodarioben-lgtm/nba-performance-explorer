import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import {
  LeagueLeadersQuerySchema,
  LeagueLeadersResponseSchema,
  LeagueStandingsResponseSchema,
  type LeagueLeaderMetric,
  type LeagueRateMode,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { RankedBoard } from './RankedBoard';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { LeagueDistributionPanel } from './LeagueDistributionPanel';

const LEADER_METRICS: {
  group: string;
  items: [LeagueLeaderMetric, string][];
}[] = [
  {
    group: 'Counting',
    items: [
      ['points', 'Points'],
      ['rebounds', 'Rebounds'],
      ['assists', 'Assists'],
      ['steals', 'Steals'],
      ['blocks', 'Blocks'],
      ['threesMade', '3-pointers made'],
      ['offensiveRebounds', 'Offensive rebounds'],
      ['defensiveRebounds', 'Defensive rebounds'],
      ['turnovers', 'Turnovers'],
      ['plusMinus', 'Plus-minus'],
      ['minutes', 'Minutes'],
      ['gamesPlayed', 'Games played'],
    ],
  },
  {
    group: 'Shooting',
    items: [
      ['fieldGoalPercentage', 'FG%'],
      ['threePointPercentage', '3P%'],
      ['freeThrowPercentage', 'FT%'],
      ['trueShootingPercentage', 'TS%'],
      ['effectiveFieldGoalPercentage', 'eFG%'],
    ],
  },
];
const PERCENT = new Set<LeagueLeaderMetric>([
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'trueShootingPercentage',
  'effectiveFieldGoalPercentage',
]);
const MODES: [LeagueRateMode, string][] = [
  ['per-game', 'Per game'],
  ['totals', 'Totals'],
  ['per-36', 'Per 36 min'],
  ['per-100', 'Per 100 poss'],
];
const metricLabel = (m: LeagueLeaderMetric) =>
  LEADER_METRICS.flatMap((g) => g.items).find(([k]) => k === m)?.[1] ?? m;

/** League leaders for any archived NBA season with complete box scores. */
export function LeagueLeadersPage() {
  const [params, setParams] = useSearchParams();
  // Links to the published 2023–24 category winners keep working.
  const legacy =
    params.has('category') ||
    params.get('scope') === 'player' ||
    params.get('scope') === 'team' ||
    params.has('search');
  const parsed = LeagueLeadersQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    !legacy &&
    parsed.success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const seasons = useLeagueSeasons();
  const [marked, setMarked] = useState<string | null>(null);
  const playerSeasons = (seasons.data?.seasons ?? []).filter(
    (s) => s.capabilities.playerStats,
  );
  const q = parsed.success ? parsed.data : LeagueLeadersQuerySchema.parse({});
  const season = q.season ?? playerSeasons.at(-1)?.season;
  const mode: LeagueRateMode =
    PERCENT.has(q.metric) || q.metric === 'gamesPlayed' ? 'totals' : q.mode;
  const api = new URLSearchParams(params);
  if (season) api.set('season', season);
  api.set('mode', mode);
  const leaders = useQuery({
    queryKey: ['league', 'leaders', api.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/leaders?${api}`,
        signal,
        LeagueLeadersResponseSchema.parse,
      ),
    enabled: valid && Boolean(season),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const teams = useQuery({
    queryKey: ['league', 'standings', season],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/standings?season=${season}`,
        signal,
        LeagueStandingsResponseSchema.parse,
      ),
    enabled: valid && Boolean(season),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  if (legacy) return <Navigate to={`/leaders/wikipedia?${params}`} replace />;
  const update = (patch: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) copy.set(k, v);
      else copy.delete(k);
    }
    if (!('page' in patch)) copy.delete('page');
    setParams(copy);
  };
  const data = valid ? leaders.data : undefined;
  const percent = PERCENT.has(q.metric);
  const format = (v: number) =>
    percent
      ? `${(v * 100).toFixed(1)}%`
      : mode === 'totals'
        ? v.toLocaleString('en-US')
        : v.toFixed(1);
  const teamOptions = (
    teams.data?.conferences.flatMap((c) => c.rows.map((r) => r.team)) ?? []
  )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const path = `/leaders${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="League leaders"
      lede={
        <p>
          Every player in a season ranked on one measure, from NBA.com box scores summed
          game by game. Choose the season, regular season or playoffs, a rate and the
          qualification; percentiles are among the qualified players shown.
        </p>
      }
    >
      <p>
        Also: <Link to="/leaders/recorded">Recorded 2023–24 leaders (Wikipedia)</Link> ·{' '}
        <Link to="/leaders/wikipedia">
          Wikipedia’s published 2023–24 category winners
        </Link>{' '}
        · <Link to="/history/records">Record book</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This leaders link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show the latest season
          </button>
        </p>
      ) : (
        <LeagueFeedback
          pending={seasons.isPending || (Boolean(season) && leaders.isPending)}
          error={seasons.error ?? leaders.error}
        />
      )}
      <div className={styles.controls}>
        <label>
          Season
          <select
            value={season ?? ''}
            onChange={(e) => update({ season: e.target.value, team: null })}
          >
            {newestFirst(seasons.data?.seasons ?? []).map((s) => (
              <option
                key={s.season}
                value={s.season}
                disabled={!s.capabilities.playerStats}
              >
                {seasonDisplay(s.season)}
                {s.capabilities.playerStats ? '' : ' — box scores incomplete'}
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
                minGames: null,
                minAttempts: null,
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
            onChange={(e) => update({ metric: e.target.value, minAttempts: null })}
          >
            {LEADER_METRICS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <fieldset
          className="league-modes"
          disabled={percent || q.metric === 'gamesPlayed'}
        >
          <legend>Rate</legend>
          {MODES.map(([m, label]) => {
            const info = data?.modes.find((x) => x.mode === m);
            const off = info ? !info.available : false;
            return (
              <label key={m} title={info?.reason ?? undefined}>
                <input
                  type="radio"
                  name="league-mode"
                  value={m}
                  checked={mode === m}
                  disabled={off && mode !== m}
                  onChange={() => update({ mode: m === 'per-game' ? null : m })}
                />
                {label}
              </label>
            );
          })}
        </fieldset>
        <label>
          Team
          <select
            value={q.team ?? ''}
            onChange={(e) => update({ team: e.target.value || null })}
          >
            <option value="">All teams</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minimum games
          <input
            type="number"
            min={0}
            max={100}
            value={q.minGames ?? data?.query.minGames ?? ''}
            onChange={(e) => update({ minGames: e.target.value })}
          />
        </label>
        {percent ? (
          <label>
            Minimum attempts
            <input
              type="number"
              min={0}
              max={5000}
              value={q.minAttempts ?? data?.query.minAttempts ?? ''}
              onChange={(e) => update({ minAttempts: e.target.value })}
            />
          </label>
        ) : null}
      </div>
      {data ? (
        <>
          <p>
            <strong>
              {metricLabel(data.query.metric)}
              {percent
                ? ''
                : `, ${MODES.find(([m]) => m === data.query.mode)?.[1].toLowerCase()}`}
              , {seasonDisplay(data.query.season)}{' '}
              {data.query.scope === 'playoffs' ? 'playoffs' : 'regular season'}.
            </strong>{' '}
            {data.definition} {data.qualification}
          </p>
          <p className="league-population">
            {data.population.qualified} qualified of {data.population.players} players
            {data.population.belowGames
              ? ` · ${data.population.belowGames} below the games minimum`
              : ''}
            {data.population.belowAttempts
              ? ` · ${data.population.belowAttempts} below the attempts minimum`
              : ''}
            {data.population.missingInputs
              ? ` · ${data.population.missingInputs} without the inputs this measure needs`
              : ''}
          </p>
          {data.modes.some(
            (m) => !m.available && !percent && q.metric !== 'gamesPlayed',
          ) ? (
            <ul className="league-unavailable">
              {data.modes
                .filter((m) => !m.available)
                .map((m) => (
                  <li key={m.mode}>
                    {MODES.find(([x]) => x === m.mode)?.[1]}: {m.reason}
                  </li>
                ))}
            </ul>
          ) : null}
          {data.rows.length ? (
            <RankedBoard
              rows={data.rows}
              showPodium={data.query.page === 1}
              metricLabel={metricLabel(data.query.metric)}
              format={format}
            />
          ) : (
            <p role="status">No player meets this qualification. Lower the minimums.</p>
          )}
          <ResearchTable label="League leaders table">
            <table>
              <caption>
                {data.total} qualified players; page {data.query.page}
              </caption>
              <thead>
                <tr>
                  {[
                    'Rank',
                    'Player',
                    'Team',
                    'GP',
                    'MIN',
                    metricLabel(data.query.metric),
                    'Inputs',
                    'Percentile',
                    'Distribution',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.playerId}>
                    <td>{r.rank}</td>
                    <th scope="row">
                      <Link to={`/players/${r.playerId}`} className="withface">
                        <PlayerAvatar playerId={r.playerId} name={r.name} size={28} />
                        {r.name}
                      </Link>
                    </th>
                    <td>{r.teams.map((t) => t.abbreviation).join(' / ')}</td>
                    <td>{r.gamesPlayed}</td>
                    <td>{r.minutes?.toLocaleString('en-US') ?? '—'}</td>
                    <td>{format(r.value)}</td>
                    <td>
                      {r.inputs
                        .map((i) => `${i.label} ${i.value.toLocaleString('en-US')}`)
                        .join(' · ')}
                    </td>
                    <td>{r.percentile.toFixed(1)}</td>
                    <td>
                      <button
                        type="button"
                        className="reset link-button"
                        aria-pressed={marked === r.playerId}
                        onClick={() =>
                          setMarked(marked === r.playerId ? null : r.playerId)
                        }
                      >
                        Mark
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          {data.query.team === null &&
          (percent ||
            data.query.mode === 'per-game' ||
            data.query.metric === 'gamesPlayed') ? (
            <LeagueDistributionPanel
              season={data.query.season}
              scope={data.query.scope}
              metric={data.query.metric}
              player={marked}
              onClear={() => setMarked(null)}
            />
          ) : (
            <p className="team-note">
              The league distribution is drawn for per-game values (and percentages)
              over the whole league; switch the rate to per game and clear the team
              filter to see it.
            </p>
          )}
          <div className="league-pager">
            <button
              type="button"
              disabled={data.query.page <= 1}
              onClick={() => update({ page: String(data.query.page - 1) })}
            >
              Previous page
            </button>
            <span>
              Page {data.query.page} of {Math.max(1, Math.ceil(data.total / 25))}
            </span>
            <button
              type="button"
              disabled={data.query.page * 25 >= data.total}
              onClick={() => update({ page: String(data.query.page + 1) })}
            >
              Next page
            </button>
          </div>
          <SaveResearchButton
            kind="analysis"
            label={`${seasonDisplay(data.query.season)} ${metricLabel(data.query.metric)} leaders`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
