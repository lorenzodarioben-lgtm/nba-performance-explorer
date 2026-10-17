import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  LeagueSeasonLabelSchema,
  LeagueStandingsResponseSchema,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { TeamLogo } from '../../ui/TeamLogo';
import { ConferenceLadders, type LadderSort } from './ConferenceLadder';
import { postseasonFormat } from './postseason-format';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

const QuerySchema = z
  .object({
    /** A season label, or current: NBA.com's live table for the season under way. */
    season: z.union([LeagueSeasonLabelSchema, z.literal('current')]).optional(),
    conference: z.enum(['East', 'West']).optional(),
    sort: z.enum(['rank', 'wins', 'losses', 'winPercentage']).default('rank'),
  })
  .strict();

/** East/West standings for any archived NBA season, from NBA.com's published tables. */
export function LeagueStandingsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = QuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : QuerySchema.parse({});
  const seasons = useLeagueSeasons();
  const season = q.season ?? seasons.data?.seasons.at(-1)?.season;
  const standings = useQuery({
    queryKey: ['league', 'standings', season],
    queryFn: ({ signal }) =>
      fetchLeague(
        season === 'current'
          ? '/api/league/standings/current'
          : `/api/league/standings?season=${season}`,
        signal,
        LeagueStandingsResponseSchema.parse,
      ),
    enabled: valid && Boolean(season),
    retry: false,
    staleTime: season === 'current' ? 60_000 : 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const data = valid ? standings.data : undefined;
  const rows =
    data?.conferences.flatMap((c) =>
      c.rows.map((r) => ({ ...r, conference: c.conference })),
    ) ?? [];
  const shown = rows.filter((r) => !q.conference || r.conference === q.conference);
  // Before any game, NBA.com's ranks are placeholders: no rank or ladder is shown.
  const noGames = rows.length > 0 && rows.every((r) => r.wins + r.losses === 0);
  const path = `/standings${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Standings"
      lede={
        <p>
          East and West standings for every archived NBA season, from NBA.com’s
          published tables and checked against every paired game result, plus NBA.com’s
          live table for the season under way.
        </p>
      }
    >
      <p>
        Also: <Link to="/standings/race">2023–24 standings race</Link> ·{' '}
        <Link to="/standings/recorded">Recorded team rankings</Link> ·{' '}
        <Link to="/standings/wikipedia">Wikipedia’s published 2023–24 table</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This standings link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show the latest season
          </button>
        </p>
      ) : (
        <LeagueFeedback
          pending={seasons.isPending || (Boolean(season) && standings.isPending)}
          error={seasons.error ?? standings.error}
        />
      )}
      <div className={styles.controls}>
        <label>
          Season
          <select
            value={season ?? ''}
            onChange={(e) => update('season', e.target.value)}
            disabled={!seasons.data}
          >
            <option value="current">Current season (live from NBA.com)</option>
            {newestFirst(seasons.data?.seasons ?? []).map((s) => (
              <option key={s.season} value={s.season}>
                {seasonDisplay(s.season)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conference
          <select
            value={q.conference ?? ''}
            onChange={(e) => update('conference', e.target.value)}
          >
            <option value="">Both</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </label>
        <label>
          Order
          <select
            value={q.sort}
            onChange={(e) =>
              update('sort', e.target.value === 'rank' ? '' : e.target.value)
            }
          >
            <option value="rank">Published conference rank</option>
            <option value="wins">Wins</option>
            <option value="losses">Losses</option>
            <option value="winPercentage">Win percentage</option>
          </select>
        </label>
      </div>
      {data ? (
        <>
          <p>
            <strong>{seasonDisplay(data.season)} regular season.</strong>{' '}
            {data.basis === 'published'
              ? 'Ranks, games behind, records and clinch marks are NBA.com’s published table.'
              : 'NBA.com publishes no table for this season: teams are ranked here by win percentage from paired results.'}{' '}
            {data.resultsAgreement
              ? `${data.resultsAgreement.agreeing} of ${data.resultsAgreement.teams} teams’ published W–L match the archived game results.`
              : null}
          </p>
          {data.basis === 'published' && !noGames ? (
            <ConferenceLadders
              standings={rows.filter(
                (r): r is typeof r & { conference: 'East' | 'West' } =>
                  r.conference !== 'League',
              )}
              sort={q.sort as LadderSort}
              conference={q.conference}
              format={postseasonFormat(data.season)}
              season={data.season}
            />
          ) : null}
          <ResearchTable label="Standings table">
            <table>
              <caption>
                {shown.length} teams, {seasonDisplay(data.season)}; win percentage = W ÷
                (W + L)
              </caption>
              <thead>
                <tr>
                  {[
                    'Conf',
                    'Rank',
                    'Team',
                    'W',
                    'L',
                    'Win%',
                    'GB',
                    'Division',
                    'Home',
                    'Road',
                    'Last 10',
                    'Streak',
                    'Clinch',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown
                  .slice()
                  .sort((a, b) =>
                    q.sort === 'rank'
                      ? a.conference.localeCompare(b.conference) || a.rank - b.rank
                      : q.sort === 'losses'
                        ? b.losses - a.losses
                        : b[q.sort] - a[q.sort],
                  )
                  .map((r) => (
                    <tr key={r.team.id}>
                      <td>{r.conference}</td>
                      <td>{noGames ? '—' : r.rank}</td>
                      <th scope="row">
                        <Link
                          to={`/teams/${r.team.id}?season=${data.season}`}
                          className="withlogo"
                        >
                          <TeamLogo team={r.team} season={data.season} size={20} />
                          {r.team.name}
                        </Link>
                      </th>
                      <td>{r.wins}</td>
                      <td>{r.losses}</td>
                      <td>{r.winPercentage.toFixed(3).replace(/^0/, '')}</td>
                      <td>{r.gamesBehind === 0 ? '—' : r.gamesBehind}</td>
                      <td>{r.division ?? '—'}</td>
                      <td>{r.home ?? '—'}</td>
                      <td>{r.road ?? '—'}</td>
                      <td>{r.lastTen ?? '—'}</td>
                      <td>{r.streak ?? '—'}</td>
                      <td>{r.clinch ?? ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </ResearchTable>
          <p>
            Clinch marks are NBA.com’s published codes, shown as given: x means clinched
            a playoff berth and o means eliminated; other letters mark NBA.com’s
            division, conference and play-in clinches. Streak and last 10 are as of the
            final regular-season day.
          </p>
          <SaveResearchButton
            kind="analysis"
            label={`${seasonDisplay(data.season)} standings`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
