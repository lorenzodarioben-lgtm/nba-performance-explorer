import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  LeagueEraPlayersResponseSchema,
  LeagueErasResponseSchema,
  LeagueSeasonLabelSchema,
  type LeagueEnvironment,
  type LeagueEraPlayersResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { LineChart } from '../../charts/LineChart';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { ArchivePlayerPicker } from './ArchivePlayerPicker';

type EnvKey = Exclude<
  keyof LeagueEnvironment,
  'season' | 'teams' | 'teamGames' | 'per36'
>;
const ENV: [EnvKey, string, 'pct' | 'num'][] = [
  ['points', 'Points per team game', 'num'],
  ['pace', 'Pace (NBA.com, 1996–97 on)', 'num'],
  ['offensiveRating', 'Offensive rating (NBA.com, 1996–97 on)', 'num'],
  ['fieldGoalAttempts', 'Field-goal attempts per game', 'num'],
  ['threePointAttempts', '3-point attempts per game', 'num'],
  ['threePointRate', '3PA share of all shots', 'pct'],
  ['freeThrowRate', 'Free throws per shot (FTA ÷ FGA)', 'pct'],
  ['fieldGoalPct', 'FG%', 'pct'],
  ['threePointPct', '3P%', 'pct'],
  ['freeThrowPct', 'FT%', 'pct'],
  ['effectiveFieldGoalPct', 'eFG%', 'pct'],
  ['trueShootingPct', 'TS%', 'pct'],
  ['rebounds', 'Rebounds per game', 'num'],
  ['assists', 'Assists per game', 'num'],
  ['turnovers', 'Turnovers per game', 'num'],
];
const CATS: [
  keyof LeagueEraPlayersResponse['players'][number]['summary']['raw'],
  string,
][] = [
  ['points', 'Points'],
  ['rebounds', 'Rebounds'],
  ['assists', 'Assists'],
  ['steals', 'Steals'],
  ['blocks', 'Blocks'],
  ['threesMade', '3-pointers'],
  ['trueShooting', 'True shooting'],
];
const COLORS = ['var(--red-hi)', 'var(--chalk)', 'var(--amber)', 'var(--s1)'];
const QuerySchema = z
  .object({
    metric: z.enum(ENV.map(([k]) => k) as [EnvKey, ...EnvKey[]]).default('points'),
    decade: z.enum(['1980s', '1990s', '2000s', '2010s', '2020s']).optional(),
    a: LeagueSeasonLabelSchema.optional(),
    b: LeagueSeasonLabelSchema.optional(),
    players: z
      .string()
      .regex(/^[1-9]\d{0,11}(,[1-9]\d{0,11}){0,3}$/)
      .optional(),
    view: z.enum(['raw', 'index']).default('index'),
    category: z.enum(CATS.map(([k]) => k) as [string, ...string[]]).default('points'),
  })
  .strict();
const fmtEnv = (kind: 'pct' | 'num', v: number | null) =>
  v === null ? '—' : kind === 'pct' ? `${(v * 100).toFixed(1)}%` : v.toFixed(1);

/** The league season by season, and players compared against their own league. */
export function LeagueErasPage() {
  const [params, setParams] = useSearchParams();
  const parsed = QuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : QuerySchema.parse({});
  const eras = useQuery({
    queryKey: ['league', 'eras'],
    queryFn: ({ signal }) =>
      fetchLeague('/api/league/eras', signal, LeagueErasResponseSchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const players = useQuery({
    queryKey: ['league', 'era-players', q.players],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/era-players?players=${q.players}`,
        signal,
        LeagueEraPlayersResponseSchema.parse,
      ),
    enabled: valid && Boolean(q.players),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (patch: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) copy.set(k, v);
      else copy.delete(k);
    }
    setParams(copy, { replace: true });
  };
  const data = valid ? eras.data : undefined;
  const metric = ENV.find(([k]) => k === q.metric)!;
  const seasons =
    data?.seasons.filter(
      (s) => !q.decade || s.season.startsWith(q.decade.slice(0, 3)),
    ) ?? [];
  const a = data?.seasons.find((s) => s.season === (q.a ?? data.seasons[0]?.season));
  const b = data?.seasons.find(
    (s) => s.season === (q.b ?? data.seasons.at(-1)?.season),
  );
  const ids = q.players?.split(',') ?? [];
  const path = `/history/eras${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Eras"
      lede={
        <p>
          How the league itself changed season by season since 1983–84, and players
          compared with their own league: raw numbers, or a league-relative index where
          100 is the league rate that season.
        </p>
      }
    >
      <p>
        Also: <Link to="/history">Seasons</Link> ·{' '}
        <Link to="/leaders">League leaders</Link> ·{' '}
        <Link to="/history/record-book">Record book</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This eras link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Start again
          </button>
        </p>
      ) : (
        <LeagueFeedback pending={eras.isPending} error={eras.error} />
      )}
      {data ? (
        <>
          <section className="pmod" aria-labelledby="eras-league">
            <Slate
              id="eras-league"
              title="The league through the eras"
              tapes={[{ code: 'NBA.com', source: 'Archived', variant: 'archive' }]}
            />
            <div className={styles.controls}>
              <label>
                Measure
                <select
                  value={q.metric}
                  onChange={(e) =>
                    update({
                      metric: e.target.value === 'points' ? null : e.target.value,
                    })
                  }
                >
                  {ENV.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <Segmented
                label="Decade"
                options={[
                  { value: 'all', label: 'All' },
                  ...['1980s', '1990s', '2000s', '2010s', '2020s'].map((d) => ({
                    value: d,
                    label: d,
                  })),
                ]}
                value={q.decade ?? 'all'}
                onChange={(v) => update({ decade: v === 'all' ? null : v })}
              />
            </div>
            <LineChart
              label={`${metric[1]} by season`}
              categories={seasons.map((s) => s.season)}
              series={[
                {
                  id: q.metric,
                  label: metric[1],
                  color: 'var(--red-hi)',
                  values: seasons.map((s) => s[q.metric] as number | null),
                },
              ]}
              format={(v) => fmtEnv(metric[2], v)}
              formatCategory={seasonDisplay}
              height={240}
            />
            <p className="team-note">
              Per team game from every team’s summed box scores. A gap means NBA.com’s
              game logs do not record the field in every game that season (1983–84 and
              1984–85 lack 3-point attempts, rebound splits, steals, blocks and
              turnovers in most games); pace and offensive rating are published from
              1996–97.
            </p>
            <h3>Compare two seasons</h3>
            <div className={styles.controls}>
              <label>
                Season A
                <select
                  value={a?.season}
                  onChange={(e) => update({ a: e.target.value })}
                >
                  {data.seasons.map((s) => (
                    <option key={s.season} value={s.season}>
                      {seasonDisplay(s.season)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Season B
                <select
                  value={b?.season}
                  onChange={(e) => update({ b: e.target.value })}
                >
                  {data.seasons.map((s) => (
                    <option key={s.season} value={s.season}>
                      {seasonDisplay(s.season)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {a && b ? (
              <ResearchTable label="Season comparison">
                <table>
                  <caption>
                    {seasonDisplay(a.season)} ({a.teams} teams) against{' '}
                    {seasonDisplay(b.season)} ({b.teams} teams), per team game
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Measure',
                        seasonDisplay(a.season),
                        seasonDisplay(b.season),
                        'Change',
                      ].map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ENV.map(([k, l, kind]) => {
                      const va = a[k] as number | null,
                        vb = b[k] as number | null;
                      const diff = va === null || vb === null ? null : vb - va;
                      return (
                        <tr key={k}>
                          <th scope="row">{l}</th>
                          <td>{fmtEnv(kind, va)}</td>
                          <td>{fmtEnv(kind, vb)}</td>
                          <td>
                            {diff === null
                              ? '—'
                              : `${diff > 0 ? '+' : ''}${fmtEnv(kind, diff)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ResearchTable>
            ) : null}
            <LeagueSourceNote provenance={data.provenance} />
          </section>

          <section className="pmod" aria-labelledby="eras-players">
            <Slate
              id="eras-players"
              title="Players across eras"
              tapes={[{ code: 'ƒ', source: 'League-relative', variant: 'derived' }]}
            />
            <p className="era-model">{data.model}</p>
            <ul className="league-unavailable">
              {data.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className={styles.controls}>
              <ArchivePlayerPicker
                label="Add a player (up to four)"
                disabled={ids.length >= 4}
                onPick={(p) =>
                  !ids.includes(p.playerId) &&
                  update({ players: [...ids, p.playerId].join(',') })
                }
              />
              <Segmented
                label="Numbers"
                options={[
                  { value: 'index', label: 'Era-adjusted (index)' },
                  { value: 'raw', label: 'Raw (per game)' },
                ]}
                value={q.view}
                onChange={(v) => update({ view: v === 'index' ? null : v })}
              />
              <label>
                Category
                <select
                  value={q.category}
                  onChange={(e) =>
                    update({
                      category: e.target.value === 'points' ? null : e.target.value,
                    })
                  }
                >
                  {CATS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {ids.length ? (
              <p>
                {players.data?.players.map((p) => (
                  <button
                    key={p.playerId}
                    type="button"
                    className="chip"
                    onClick={() =>
                      update({
                        players: ids.filter((x) => x !== p.playerId).join(',') || null,
                      })
                    }
                  >
                    {p.name} ✕
                  </button>
                ))}
              </p>
            ) : (
              <p className="team-note">
                Add players to compare their seasons with their leagues.
              </p>
            )}
            <LeagueFeedback
              pending={Boolean(q.players) && players.isPending}
              error={players.error}
            />
            {players.data && players.data.players.length ? (
              <PlayerEras
                data={players.data}
                view={q.view}
                category={q.category as (typeof CATS)[number][0]}
              />
            ) : null}
          </section>
          <SaveResearchButton kind="analysis" label="Eras comparison" path={path} />
        </>
      ) : null}
    </ResearchShell>
  );
}

function PlayerEras({
  data,
  view,
  category,
}: {
  data: LeagueEraPlayersResponse;
  view: 'raw' | 'index';
  category: (typeof CATS)[number][0];
}) {
  const label = CATS.find(([k]) => k === category)![1];
  const seasons = [
    ...new Set(data.players.flatMap((p) => p.seasons.map((s) => s.season))),
  ].sort();
  const fmtFor = (key: string) => (v: number | null) =>
    v === null
      ? '—'
      : view === 'index'
        ? v.toFixed(0)
        : key === 'trueShooting'
          ? `${(v * 100).toFixed(1)}%`
          : v.toFixed(1);
  const fmt = fmtFor(category);
  return (
    <>
      <LineChart
        label={`${label}, ${view === 'index' ? 'league-relative index' : 'raw per game'}, by season`}
        categories={seasons}
        series={data.players.map((p, i) => ({
          id: p.playerId,
          label: p.name,
          color: COLORS[i]!,
          values: seasons.map(
            (s) => p.seasons.find((x) => x.season === s)?.[view][category] ?? null,
          ),
        }))}
        format={fmt}
        formatCategory={seasonDisplay}
        {...(view === 'index' ? { zero: 100 } : {})}
        height={260}
      />
      <ResearchTable label="Era comparison summary">
        <table>
          <caption>
            Minutes-weighted over seasons with at least {data.minMinutes} minutes;{' '}
            {view === 'index'
              ? '100 = league rate that season'
              : 'raw per game, TS% as a percentage'}
          </caption>
          <thead>
            <tr>
              {['Player', 'Seasons', ...CATS.map(([, l]) => l)].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => (
              <tr key={p.playerId}>
                <th scope="row">
                  <Link to={`/players/${p.playerId}/records`}>{p.name}</Link>
                  {p.mayPredateArchive ? (
                    <small> (career may start before 1983–84)</small>
                  ) : null}
                </th>
                <td>{p.summary.seasons}</td>
                {CATS.map(([k]) => (
                  <td key={k}>
                    {fmtFor(k)(
                      view === 'index' ? p.summary.index[k] : p.summary.raw[k],
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
      {data.missing.length ? (
        <p role="status">Not in the archive: {data.missing.join(', ')}.</p>
      ) : null}
      <LeagueSourceNote provenance={data.provenance} />
    </>
  );
}
