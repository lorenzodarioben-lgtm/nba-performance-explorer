import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  LeagueSeasonLabelSchema,
  LeagueTeamResponseSchema,
  type LeagueTeamResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchTable } from '../research/ResearchShell';
import { Slate } from '../../ui/Slate';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

const TAPES = [{ code: 'NBA.com', source: 'Archived', variant: 'archive' as const }];
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
const wl = (r: { wins: number; losses: number }) => `${r.wins}–${r.losses}`;

/**
 * The team page's NBA.com sections: franchise identity and titles, one archived season in
 * detail, and every season the franchise has played.
 */
export function LeagueTeamSections({ teamId }: { teamId: string }) {
  const [params, setParams] = useSearchParams();
  const seasonParam = params.get('season');
  const seasonValid =
    seasonParam === null || LeagueSeasonLabelSchema.safeParse(seasonParam).success;
  const query = useQuery({
    queryKey: ['league', 'team', teamId, seasonParam],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/teams/${encodeURIComponent(teamId)}${seasonParam ? `?season=${seasonParam}` : ''}`,
        signal,
        LeagueTeamResponseSchema.parse,
      ),
    enabled: seasonValid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const pick = (season: string) => {
    const copy = new URLSearchParams(params);
    copy.set('season', season);
    setParams(copy);
  };
  if (!seasonValid)
    return (
      <p role="alert">
        That season is not a valid season label.{' '}
        <button type="button" onClick={() => setParams({})}>
          Show the latest season
        </button>
      </p>
    );
  const data = query.data;
  return (
    <>
      <LeagueFeedback pending={query.isPending} error={query.error} />
      {data?.season ? (
        <SeasonPanel data={data} season={data.season} onPick={pick} />
      ) : null}
      {data?.franchise ? (
        <FranchisePanel data={data} franchise={data.franchise} onPick={pick} />
      ) : null}
      {data ? <LeagueSourceNote provenance={data.provenance} /> : null}
    </>
  );
}

function SeasonPanel({
  data,
  season: s,
  onPick,
}: {
  data: LeagueTeamResponse;
  season: NonNullable<LeagueTeamResponse['season']>;
  onPick: (season: string) => void;
}) {
  return (
    <section className="pmod" aria-labelledby="team-season-title">
      <Slate
        id="team-season-title"
        title={`${s.team.name}, ${seasonDisplay(s.season)}`}
        tapes={TAPES}
        meta={[
          `${wl(s.record.overall)}`,
          s.standing
            ? `${s.standing.conference} #${s.standing.rank ?? '—'}`
            : 'No standing',
        ]}
      />
      <label className="team-season-pick">
        Season
        <select value={s.season} onChange={(e) => onPick(e.target.value)}>
          {[...data.seasons].reverse().map((x) => (
            <option key={x} value={x}>
              {seasonDisplay(x)}
            </option>
          ))}
        </select>
      </label>
      <dl className="statgrid">
        <Cell label="Record" value={wl(s.record.overall)} />
        <Cell label="Home" value={wl(s.record.home)} />
        <Cell label="Road" value={wl(s.record.road)} />
        {s.record.neutral.wins + s.record.neutral.losses ? (
          <Cell label="Neutral site" value={wl(s.record.neutral)} />
        ) : null}
        <Cell
          label="Standing"
          value={
            s.standing
              ? `${s.standing.conference} ${s.standing.rank ?? '—'} · ${s.standing.division} ${s.standing.divisionRank ?? '—'}`
              : '—'
          }
        />
        <Cell
          label="Playoffs"
          value={
            s.playoffs
              ? `${wl(s.playoffs)} in ${s.playoffs.games} games`
              : 'Did not play'
          }
        />
      </dl>

      <h3>Shooting</h3>
      <ResearchTable label="Team and opponent shooting">
        <table>
          <caption>Percentages from season makes and attempts</caption>
          <thead>
            <tr>
              {['', 'FG%', '3P%', 'FT%', 'eFG%', 'TS%'].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Team', s.shooting.team],
                ['Opponents', s.shooting.opponent],
              ] as const
            ).map(([who, v]) => (
              <tr key={who}>
                <th scope="row">{who}</th>
                <td>{pct(v.fieldGoal)}</td>
                <td>{pct(v.threePoint)}</td>
                <td>{pct(v.freeThrow)}</td>
                <td>{pct(v.effectiveFieldGoal)}</td>
                <td>{pct(v.trueShooting)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>

      <h3>Ratings and pace</h3>
      {s.ratings ? (
        <dl className="statgrid">
          <Cell label="Offensive rating" value={s.ratings.offRating.toFixed(1)} />
          <Cell label="Defensive rating" value={s.ratings.defRating.toFixed(1)} />
          <Cell
            label="Net rating"
            value={`${s.ratings.netRating > 0 ? '+' : ''}${s.ratings.netRating.toFixed(1)}`}
          />
          <Cell label="Pace" value={s.ratings.pace.toFixed(1)} />
          <Cell
            label="Possessions"
            value={s.ratings.possessions.toLocaleString('en-US')}
          />
        </dl>
      ) : null}
      <p className="team-note">{s.ratingsNote}</p>

      <h3>Box score totals</h3>
      <ResearchTable label="Team and opponent box totals">
        <table>
          <caption>
            Regular season; per game = total ÷{' '}
            {s.record.overall.wins + s.record.overall.losses} games
          </caption>
          <thead>
            <tr>
              {['', 'Team total', 'Team per game', 'Opp. total', 'Opp. per game'].map(
                (h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {s.totals.team.map((row, i) => {
              const opp = s.totals.opponent[i]!;
              return (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{row.total?.toLocaleString('en-US') ?? 'Not recorded'}</td>
                  <td>{row.perGame?.toFixed(1) ?? '—'}</td>
                  <td>{opp.total?.toLocaleString('en-US') ?? 'Not recorded'}</td>
                  <td>{opp.perGame?.toFixed(1) ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResearchTable>

      <h3>Team leaders</h3>
      <div className="team-leaders">
        {s.leaders.map((l) => (
          <section
            key={l.key}
            className="team-leaders__card"
            aria-label={`${l.label} leaders`}
          >
            <h4>{l.label}</h4>
            <ol>
              {l.rows.map((r) => (
                <li key={r.playerId}>
                  <Link to={`/players/${r.playerId}`}>{r.name}</Link>{' '}
                  <b>{r.total.toLocaleString('en-US')}</b>{' '}
                  <small>
                    {r.perGame.toFixed(1)} per game · {r.gamesPlayed} GP
                  </small>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="team-note">
        Totals for games played with this team only; a traded player’s games elsewhere
        are not included.
      </p>

      <h3>Roster</h3>
      {s.roster ? (
        <>
          <p>
            NBA.com lists {s.roster.listed} players for this season;{' '}
            {s.roster.listedWhoAppeared} of them appear in this team’s box scores, which
            name {s.roster.appeared} players in all. Positions, ages and experience are
            NBA.com’s roster fields.
          </p>
          <dl className="statgrid">
            {s.roster.positions.map((p) => (
              <Cell
                key={p.label}
                label={`Position ${p.label}`}
                value={String(p.count)}
              />
            ))}
            {s.roster.age ? (
              <Cell
                label="Age (min / median / max)"
                value={`${s.roster.age.min} / ${s.roster.age.median} / ${s.roster.age.max}`}
              />
            ) : null}
            {s.roster.experience.map((x) => (
              <Cell key={x.label} label={x.label} value={String(x.count)} />
            ))}
          </dl>
          <ResearchTable label="Season roster">
            <table>
              <caption>NBA.com roster list with games played for this team</caption>
              <thead>
                <tr>
                  {['#', 'Player', 'Pos', 'Age', 'Exp', 'GP'].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.roster.players.map((p) => (
                  <tr key={p.playerId}>
                    <td>{p.number ?? '—'}</td>
                    <th scope="row">
                      <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                    </th>
                    <td>{p.position ?? '—'}</td>
                    <td>{p.age ?? '—'}</td>
                    <td>{p.experience ?? '—'}</td>
                    <td>{p.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          {s.roster.coaches.length ? (
            <p>Coaches: {s.roster.coaches.join(' · ')}</p>
          ) : null}
        </>
      ) : (
        <p role="status">No NBA.com roster list is archived for this season.</p>
      )}
    </section>
  );
}

function FranchisePanel({
  data,
  franchise: f,
  onPick,
}: {
  data: LeagueTeamResponse;
  franchise: NonNullable<LeagueTeamResponse['franchise']>;
  onPick: (season: string) => void;
}) {
  return (
    <section className="pmod" aria-labelledby="franchise-title">
      <Slate
        id="franchise-title"
        title="Franchise history"
        tapes={TAPES}
        meta={[
          f.founded ? `Founded ${f.founded}` : 'Founding year not listed',
          `${f.seasons.length} seasons`,
        ]}
      />
      <h3>Names and cities</h3>
      <ol className="franchise-identities">
        {f.identities.map((i) => (
          <li key={`${i.firstSeason}-${i.city}-${i.name}`}>
            <b>
              {i.city} {i.name}
            </b>{' '}
            {seasonDisplay(i.firstSeason)} to {seasonDisplay(i.lastSeason)} ({i.seasons}{' '}
            {i.seasons === 1 ? 'season' : 'seasons'})
          </li>
        ))}
      </ol>
      <p className="team-note">
        Periods follow NBA.com’s franchise records, which assign each season to one
        franchise ID: a gap between periods means the franchise did not play. A
        relocated city keeps the franchise’s history; NBA.com’s franchise tables decide
        which franchise a former identity belongs to.
      </p>
      {f.totals ? (
        <dl className="statgrid">
          <Cell
            label="All-time regular season"
            value={`${f.totals.wins}–${f.totals.losses}`}
          />
          <Cell
            label="Playoff appearances"
            value={String(f.totals.playoffAppearances)}
          />
          <Cell label="Championships" value={String(f.totals.leagueTitles)} />
          <Cell label="Conference titles" value={String(f.totals.conferenceTitles)} />
          <Cell label="Division titles" value={String(f.totals.divisionTitles)} />
        </dl>
      ) : null}
      {f.championships.length ? (
        <p>
          Championships (year awarded):{' '}
          {f.championships
            .map((c) => `${c.year}${c.opponent ? ` (over ${c.opponent})` : ''}`)
            .join(' · ')}
        </p>
      ) : null}
      {f.notable.length ? (
        <ul className="franchise-notable">
          {f.notable.map((n) => (
            <li key={n.label}>
              <b>{n.label}:</b> {n.value}
              {n.seasons.length && n.label !== 'Seasons with playoff games'
                ? ` in ${n.seasons.map(seasonDisplay).join(', ')}`
                : ''}
            </li>
          ))}
        </ul>
      ) : null}
      <h3>Season by season</h3>
      <ResearchTable label="Franchise seasons">
        <table>
          <caption>
            {f.seasons.length} regular seasons; archived seasons open in detail above
          </caption>
          <thead>
            <tr>
              {[
                'Season',
                'Team',
                'W–L',
                'Win%',
                'Conf rank',
                'Div rank',
                'Playoffs',
                'Finals',
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...f.seasons].reverse().map((s) => (
              <tr key={s.season}>
                <th scope="row">
                  {s.archived && data.seasons.includes(s.season) ? (
                    <button
                      type="button"
                      className="reset link-button"
                      onClick={() => onPick(s.season)}
                    >
                      {seasonDisplay(s.season)}
                    </button>
                  ) : (
                    seasonDisplay(s.season)
                  )}
                </th>
                <td>{s.name}</td>
                <td>{wl(s)}</td>
                <td>{s.winPercentage.toFixed(3).replace(/^0/, '')}</td>
                <td>{s.conferenceRank ?? '—'}</td>
                <td>{s.divisionRank ?? '—'}</td>
                <td>
                  {(s.playoffWins ?? 0) + (s.playoffLosses ?? 0)
                    ? `${s.playoffWins}–${s.playoffLosses}`
                    : '—'}
                </td>
                <td>
                  {s.finals === 'LEAGUE CHAMPION'
                    ? 'Champion'
                    : s.finals === 'FINALS APPEARANCE'
                      ? 'Lost in the Finals'
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="statgrid__cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
