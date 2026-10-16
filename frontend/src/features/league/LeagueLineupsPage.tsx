import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  CanonicalTeamIdSchema,
  LeagueLineupsResponseSchema,
  LeagueSeasonLabelSchema,
  LeagueStandingsResponseSchema,
  type LeagueLineupsResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

const QuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema.optional(),
    team: CanonicalTeamIdSchema.optional(),
    minMinutes: z
      .string()
      .regex(/^\d{1,4}$/)
      .optional(),
  })
  .strict();
const r1 = (v: number | null) => (v === null ? '—' : v.toFixed(1));
const signed = (v: number | null) =>
  v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const whole = (v: number | null) => (v === null ? '—' : String(Math.round(v)));
const signedWhole = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
type Lineup = LeagueLineupsResponse['lineups'][number];

/** NBA.com's five-player lineups and on/off splits for one team and season (2007–08 on). */
export function LeagueLineupsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = QuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : {};
  const seasons = useLeagueSeasons();
  const eligible = (seasons.data?.seasons ?? []).filter(
    (s) => Number(s.season.slice(0, 4)) >= 2007,
  );
  const season = q.season ?? eligible.at(-1)?.season;
  const standings = useQuery({
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
  });
  const teams = (
    standings.data?.conferences.flatMap((c) => c.rows.map((r) => r.team)) ?? []
  )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const team =
    q.team ?? teams.find((t) => t.abbreviation === 'BOS')?.id ?? teams[0]?.id;
  const api = new URLSearchParams({ season: season ?? '', team: team ?? '' });
  if (q.minMinutes) api.set('minMinutes', q.minMinutes);
  const query = useQuery({
    queryKey: ['league', 'lineups', api.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/lineups?${api}`,
        signal,
        LeagueLineupsResponseSchema.parse,
      ),
    enabled: valid && Boolean(season && team),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const update = (patch: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) copy.set(k, v);
      else copy.delete(k);
    }
    setPicked([]);
    setParams(copy);
  };
  const data = valid ? query.data : undefined;
  const chosen = (data?.lineups ?? []).filter((l) => picked.includes(l.id));
  const toggle = (id: string) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2),
    );
  const path = `/lab/lineups/nba${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="NBA.com lineups"
      lede={
        <p>
          Every five-player group a team used and every player’s on/off split, with the
          minutes, possessions and ratings NBA.com calculates from its play-by-play.
          Seasons from 2007–08.
        </p>
      }
    >
      <p>
        Also: <Link to="/lab/lineups">2017–18 lineup research dataset</Link> ·{' '}
        <Link to="/leaders/teams">Team ratings</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This lineups link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Start again
          </button>
        </p>
      ) : (
        <LeagueFeedback
          pending={Boolean(season && team) && query.isPending}
          error={seasons.error ?? query.error}
        />
      )}
      <div className={styles.controls}>
        <label>
          Season
          <select
            value={season ?? ''}
            onChange={(e) => update({ season: e.target.value })}
          >
            {newestFirst(eligible).map((s) => (
              <option key={s.season} value={s.season}>
                {seasonDisplay(s.season)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select value={team ?? ''} onChange={(e) => update({ team: e.target.value })}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minimum minutes together
          <input
            type="number"
            min={0}
            max={4000}
            value={q.minMinutes ?? data?.minMinutes ?? 50}
            onChange={(e) => update({ minMinutes: e.target.value || null })}
          />
        </label>
      </div>
      {data ? (
        <>
          <ul className="league-unavailable">
            {data.definitions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {chosen.length === 2 ? (
            <Compare a={chosen[0]!} b={chosen[1]!} />
          ) : (
            <p className="team-note">
              Choose two lineups to compare them side by side.
            </p>
          )}
          <ResearchTable label="Lineups">
            <table>
              <caption>
                {data.lineups.length} of {data.totalLineups} lineups with at least{' '}
                {data.minMinutes} minutes together, most minutes first
              </caption>
              <thead>
                <tr>
                  {[
                    'Compare',
                    'Lineup',
                    'GP',
                    'MIN',
                    'POSS',
                    'ORtg',
                    'DRtg',
                    'Net',
                    'Pace',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.lineups.map((l) => (
                  <tr
                    key={l.id}
                    className={picked.includes(l.id) ? 'is-picked' : undefined}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={picked.includes(l.id)}
                        onChange={() => toggle(l.id)}
                        aria-label={`Compare ${l.players.map((p) => p.name).join(', ')}`}
                      />
                    </td>
                    <th scope="row">
                      {l.players.map((p, i) => (
                        <span key={p.playerId}>
                          {i ? ', ' : ''}
                          <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                        </span>
                      ))}
                    </th>
                    <td>{l.gamesPlayed}</td>
                    <td>{Math.round(l.ratings.minutes)}</td>
                    <td>{Math.round(l.ratings.possessions)}</td>
                    <td>{r1(l.ratings.offRating)}</td>
                    <td>{r1(l.ratings.defRating)}</td>
                    <td>{signed(l.ratings.netRating)}</td>
                    <td>{r1(l.pace)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2 className="record-book__h">On and off the floor</h2>
          <ResearchTable label="On/off splits">
            <table>
              <caption>
                Team ratings with each player on the floor and off it; most minutes on
                first
              </caption>
              <thead>
                <tr>
                  {[
                    'Player',
                    'MIN on',
                    'POSS on',
                    'Net on',
                    'MIN off',
                    'POSS off',
                    'Net off',
                    'On − off',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.onOff.map((p) => (
                  <tr key={p.playerId}>
                    <th scope="row">
                      <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                    </th>
                    <td>{Math.round(p.on.minutes)}</td>
                    <td>{Math.round(p.on.possessions)}</td>
                    <td>{signed(p.on.netRating)}</td>
                    <td>{Math.round(p.off.minutes)}</td>
                    <td>{Math.round(p.off.possessions)}</td>
                    <td>{signed(p.off.netRating)}</td>
                    <td>{signed(p.netDifference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <SaveResearchButton
            kind="analysis"
            label={`${data.team.name} ${seasonDisplay(data.season)} lineups`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}

function Compare({ a, b }: { a: Lineup; b: Lineup }) {
  const rows: [string, (l: Lineup) => number | null, (v: number | null) => string][] = [
    ['Minutes together', (l) => l.ratings.minutes, whole],
    ['Possessions', (l) => l.ratings.possessions, whole],
    ['Offensive rating', (l) => l.ratings.offRating, r1],
    ['Defensive rating', (l) => l.ratings.defRating, r1],
    ['Net rating', (l) => l.ratings.netRating, signed],
    ['Pace', (l) => l.pace, r1],
  ];
  const label = (l: Lineup) =>
    l.players.map((p) => p.name.split(' ').at(-1)).join(', ');
  return (
    <ResearchTable label="Lineup comparison">
      <table>
        <caption>
          Same team, season and NBA.com definitions; the smaller sample sets how much a
          difference can mean
        </caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">{label(a)}</th>
            <th scope="col">{label(b)}</th>
            <th scope="col">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, get, fmt]) => {
            const va = get(a),
              vb = get(b);
            return (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{fmt(va)}</td>
                <td>{fmt(vb)}</td>
                <td>
                  {va === null || vb === null
                    ? '—'
                    : fmt === whole
                      ? signedWhole(va - vb)
                      : signed(va - vb)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResearchTable>
  );
}
