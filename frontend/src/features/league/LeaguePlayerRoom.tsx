import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  LeagueDistributionResponseSchema,
  LeaguePlayerResponseSchema,
  ResearchPlayerIdSchema,
  type LeaguePlayerResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { Slate } from '../../ui/Slate';
import { TeamLogo } from '../../ui/TeamLogo';
import { PlayerBackdrop } from '../players/PlayerBackdrop';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { longDate } from './game-format';

const TAPES = [{ code: 'NBA.com', source: 'Archived', variant: 'archive' as const }];
type Mark = LeaguePlayerResponse['careerHighs']['regularSeason'][number];

/** The player hub's Records room: the NBA.com archive's view of one career. */
export function LeaguePlayerRoom() {
  const { playerId = '' } = useParams();
  const valid = ResearchPlayerIdSchema.safeParse(playerId).success;
  const query = useQuery({
    queryKey: ['league', 'player', playerId],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/players/${playerId}`,
        signal,
        LeaguePlayerResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  return (
    <ResearchShell
      title={data ? `${data.name}: records` : 'Records'}
      backdrop={valid ? <PlayerBackdrop playerId={playerId} /> : null}
      lede={
        <p>
          Every archived game since 1983–84: team stints and trades, availability,
          season highs and lows, career highs and the exact games in which milestones
          fell. The coverage note says whether the archive holds the whole career.
        </p>
      }
    >
      {!valid ? (
        <p role="alert">That is not an NBA player ID.</p>
      ) : (
        <LeagueFeedback pending={query.isPending} error={query.error} />
      )}
      {data ? (
        <>
          <Coverage data={data} />
          <Timeline data={data} />
          <Highs
            title="Career highs"
            regular={data.careerHighs.regularSeason}
            playoffs={data.careerHighs.playoffs}
            whole={data.coverage.wholeCareer}
          />
          <Milestones data={data} />
          <SeasonHighs data={data} />
          <Profile playerId={playerId} seasons={data.seasons.map((s) => s.season)} />
          <SaveResearchButton
            kind="player"
            label={`${data.name} records`}
            path={`/players/${playerId}/records`}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}

function Coverage({ data }: { data: LeaguePlayerResponse }) {
  const c = data.coverage;
  return (
    <p className={`coverage-statement ${c.wholeCareer ? 'is-whole' : ''}`}>
      <strong>
        {c.wholeCareer
          ? `The archive holds every game of this career to date (${seasonDisplay(c.firstSeason)} to ${seasonDisplay(c.lastSeason)}).`
          : `The archive covers ${seasonDisplay(c.firstSeason)} to ${seasonDisplay(c.lastSeason)}, but not necessarily the whole career.`}
      </strong>{' '}
      {c.mayPredateArchive
        ? 'The first archived game is in the archive’s first season, so earlier games may exist outside it. '
        : ''}
      {c.incompleteSeasons.length
        ? `In ${c.incompleteSeasons.map((s) => `${seasonDisplay(s.season)} (${s.teamGamesAffected} team games)`).join(', ')}, some of the player’s teams’ box scores do not add up, so a line may be missing. `
        : ''}
      {c.wholeCareer ? '' : 'Highs and milestones below are “in archived games”.'}
    </p>
  );
}

function Timeline({ data }: { data: LeaguePlayerResponse }) {
  return (
    <section className="pmod" aria-labelledby="career-timeline">
      <Slate
        id="career-timeline"
        title="Career timeline and availability"
        tapes={TAPES}
      />
      <p className="team-note">
        Each team stint runs from its first to last appearance. Availability is games
        played out of the team’s games in that span: it counts absences, never their
        reasons, and says nothing about games before a debut or after a departure.
      </p>
      <ResearchTable label="Career timeline">
        <table>
          <caption>
            {data.seasons.length} archived seasons
            {data.gaps.length
              ? `; no games in ${data.gaps.map(seasonDisplay).join(', ')}`
              : ''}
          </caption>
          <thead>
            <tr>
              {[
                'Season',
                'Age',
                'Team',
                'From',
                'To',
                'GP',
                'Team games',
                'Available',
                'PTS',
                'REB',
                'AST',
                'Playoff GP',
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data.seasons].reverse().flatMap((s) =>
              s.stints.map((st, i) => (
                <tr key={`${s.season}-${st.team.id}-${st.firstGame}`}>
                  <th scope="row">{i === 0 ? seasonDisplay(s.season) : ''}</th>
                  <td>{i === 0 ? (s.age ?? '—') : ''}</td>
                  <td>
                    <Link
                      to={`/teams/${st.team.id}?season=${s.season}`}
                      className="withlogo"
                    >
                      <TeamLogo team={st.team} season={s.season} size={20} />
                      {st.team.name}
                    </Link>
                    {i > 0 ? <small> (traded or signed)</small> : null}
                  </td>
                  <td>{st.firstGame}</td>
                  <td>{st.lastGame}</td>
                  <td>{st.gamesPlayed}</td>
                  <td>{st.teamGamesInSpan}</td>
                  <td>
                    {st.teamGamesInSpan
                      ? `${Math.round((st.gamesPlayed / st.teamGamesInSpan) * 100)}%`
                      : '—'}
                  </td>
                  <td>{st.points ?? '—'}</td>
                  <td>{st.rebounds ?? '—'}</td>
                  <td>{st.assists ?? '—'}</td>
                  <td>{i === 0 ? s.playoffGames : ''}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </ResearchTable>
    </section>
  );
}

const markText = (m: Mark) =>
  `${m.games
    .slice(0, 3)
    .map((g) => `${longDate(g.date)} ${g.home ? 'vs' : '@'} ${g.opponent}`)
    .join('; ')}${m.count > 3 ? `; ${m.count - 3} more` : ''}`;

function Highs({
  title,
  regular,
  playoffs,
  whole,
}: {
  title: string;
  regular: Mark[];
  playoffs: Mark[];
  whole: boolean;
}) {
  return (
    <section className="pmod" aria-labelledby="career-highs">
      <Slate
        id="career-highs"
        title={whole ? title : `${title} in archived games`}
        tapes={TAPES}
      />
      <ResearchTable label="Career highs">
        <table>
          <caption>Best single-game marks; every game at the mark counts</caption>
          <thead>
            <tr>
              {['Category', 'Regular season', 'Games', 'Playoffs', 'Games'].map(
                (h, i) => (
                  <th key={`${h}-${i}`} scope="col">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {regular.map((m) => {
              const p = playoffs.find((x) => x.key === m.key);
              return (
                <tr key={m.key}>
                  <th scope="row">{m.label}</th>
                  <td>{m.value}</td>
                  <td>
                    <Link to={`/games/${m.games[0]!.id}`}>{markText(m)}</Link>
                  </td>
                  <td>{p?.value ?? '—'}</td>
                  <td>
                    {p ? (
                      <Link to={`/games/${p.games[0]!.id}`}>{markText(p)}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResearchTable>
    </section>
  );
}

function Milestones({ data }: { data: LeaguePlayerResponse }) {
  if (!data.milestones.length) return null;
  const latest = data.coverage.lastSeason;
  return (
    <section className="pmod" aria-labelledby="career-milestones">
      <Slate id="career-milestones" title="Milestones" tapes={TAPES} />
      <p className="team-note">
        The game in which each regular-season total first reached the mark, counted from
        {data.coverage.wholeCareer
          ? ' the debut.'
          : ' the first archived game, so these may not be career totals.'}
      </p>
      <ol className="milestones">
        {data.milestones.map((m) => (
          <li
            key={`${m.key}-${m.threshold}`}
            className={m.game.season === latest ? 'is-recent' : undefined}
          >
            <b>{m.label}</b>{' '}
            <Link to={`/games/${m.game.id}`}>
              {longDate(m.game.date)} {m.game.home ? 'vs' : '@'} {m.game.opponent}
            </Link>
            {m.game.season === latest ? <small> (latest archived season)</small> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SeasonHighs({ data }: { data: LeaguePlayerResponse }) {
  return (
    <section className="pmod" aria-labelledby="season-highs">
      <Slate id="season-highs" title="Season highs and lows" tapes={TAPES} />
      <ResearchTable label="Season highs and lows">
        <table>
          <caption>Regular season; a low counts only games with minutes played</caption>
          <thead>
            <tr>
              {[
                'Season',
                'High PTS',
                'High REB',
                'High AST',
                'High 3PM',
                'Low PTS',
                'Most MIN',
                'Fewest MIN',
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data.seasons].reverse().map((s) => {
              const h = (k: string) => s.highs.find((x) => x.key === k);
              const l = (k: string) => s.lows.find((x) => x.key === k);
              const cell = (m: Mark | undefined) =>
                m ? (
                  <Link to={`/games/${m.games[0]!.id}`} title={markText(m)}>
                    {m.value}
                    {m.count > 1 ? ` ×${m.count}` : ''}
                  </Link>
                ) : (
                  '—'
                );
              return (
                <tr key={s.season}>
                  <th scope="row">{seasonDisplay(s.season)}</th>
                  <td>{cell(h('pts'))}</td>
                  <td>{cell(h('reb'))}</td>
                  <td>{cell(h('ast'))}</td>
                  <td>{cell(h('fg3m'))}</td>
                  <td>{cell(l('pts'))}</td>
                  <td>{cell(h('min'))}</td>
                  <td>{cell(l('min'))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResearchTable>
    </section>
  );
}

function Profile({ playerId, seasons }: { playerId: string; seasons: string[] }) {
  const [params, setParams] = useSearchParams();
  const season =
    params.get('season') && seasons.includes(params.get('season')!)
      ? params.get('season')!
      : seasons.at(-1)!;
  const query = useQuery({
    queryKey: ['league', 'profile', playerId, season],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/distribution?season=${season}&metric=points&player=${playerId}`,
        signal,
        LeagueDistributionResponseSchema.parse,
      ),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <section className="pmod" aria-labelledby="player-dna">
      <Slate
        id="player-dna"
        title="Percentile profile"
        tapes={[{ code: 'ƒ', source: 'Cohort', variant: 'derived' }]}
      />
      <label className="team-season-pick">
        Season
        <select value={season} onChange={(e) => setParams({ season: e.target.value })}>
          {[...seasons].reverse().map((s) => (
            <option key={s} value={s}>
              {seasonDisplay(s)}
            </option>
          ))}
        </select>
      </label>
      <LeagueFeedback pending={query.isPending} error={query.error} />
      {query.data ? (
        <>
          <p className="team-note">
            Each bar is the percentile among that season’s qualified players for the
            category (the leaders page’s cohort and rule: per-game counts need 70% of
            the most games any team played; shooting needs the scaled attempts minimum).
            n is the cohort size.
          </p>
          <ul className="dna">
            {query.data.profile.map((p) => (
              <li key={p.metric}>
                <span className="dna__label">{p.label}</span>
                <span className="dna__bar" aria-hidden="true">
                  <i style={{ width: `${p.percentile ?? 0}%` }} />
                </span>
                <span className="dna__value">
                  {p.percentile === null
                    ? 'Not in the qualified cohort'
                    : `${p.percentile.toFixed(0)}th percentile (n = ${p.n}; ${p.value! < 1 ? `${(p.value! * 100).toFixed(1)}%` : p.value!.toFixed(1)})`}
                </span>
              </li>
            ))}
          </ul>
          <p>
            <Link to={`/leaders?season=${season}`}>
              The full {seasonDisplay(season)} leaderboards
            </Link>
          </p>
        </>
      ) : null}
    </section>
  );
}
