import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  LeagueGameDetailResponseSchema,
  LeaguePlayByPlayResponseSchema,
  type LeagueGameDetailResponse,
  type LeaguePlayByPlayResponse,
  type LeaguePlayEvent,
} from '@nba-performance-explorer/contracts';
import { ResearchTable } from '../research/ResearchShell';
import { Slate } from '../../ui/Slate';
import { LineChart } from '../../charts/LineChart';
import { fetchLeague } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { longDate, statusLine } from './game-format';

const periodLabel = (p: number) => (p <= 4 ? `Q${p}` : p === 5 ? 'OT' : `${p - 4}OT`);
const TAPES = [{ code: 'NBA.com', source: 'Box score', variant: 'archive' as const }];
const pct = (m: number | null | undefined, a: number | null | undefined) =>
  m === null || m === undefined || !a ? '—' : `${((m / a) * 100).toFixed(1)}%`;
const n = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : String(v);

/** Box score, highs and play-by-play for one NBA game (archive, live or scheduled). */
export function LeagueGameDetail({
  gameId,
  withHero = true,
}: {
  gameId: string;
  withHero?: boolean;
}) {
  const detail = useQuery({
    queryKey: ['league', 'game', gameId],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/games/${encodeURIComponent(gameId)}`,
        signal,
        LeagueGameDetailResponseSchema.parse,
      ),
    retry: false,
    staleTime: 20_000,
    refetchInterval: (q) => (q.state.data?.game.status === 'live' ? 30_000 : false),
    refetchOnWindowFocus: false,
  });
  const data = detail.data;
  const played = data && (data.game.status === 'final' || data.game.status === 'live');
  return (
    <>
      <LeagueFeedback pending={detail.isPending} error={detail.error} />
      {data ? (
        <>
          {withHero ? <Hero data={data} /> : null}
          {data.notes.length ? (
            <ul className="league-unavailable">
              {data.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          {data.lineScore ? <LineScoreTable data={data} /> : null}
          {data.highs.length ? <Highs data={data} /> : null}
          {data.box ? <BoxScores data={data} /> : null}
          <LeagueSourceNote provenance={data.provenance} />
          {played ? (
            <PlayByPlay gameId={gameId} live={data.game.status === 'live'} />
          ) : null}
        </>
      ) : null}
    </>
  );
}

function Hero({ data }: { data: LeagueGameDetailResponse }) {
  const g = data.game;
  const side = (s: typeof g.home, label: string) => (
    <div
      className={`gamehero__side ${g.status === 'final' && s.score !== null && s.score === Math.max(g.home.score ?? 0, g.away.score ?? 0) ? 'is-won' : ''}`}
    >
      <span className="gamehero__abbr">{s.team.abbreviation}</span>
      <Link to={`/teams/${s.team.id}`} className="gamehero__name">
        {s.team.name}
      </Link>
      <span className="gamehero__label">
        {label}
        {s.record ? ` · ${s.record}` : ''}
      </span>
      <span className="gamehero__score">{s.score ?? '—'}</span>
    </div>
  );
  return (
    <section className="gamehero" aria-label="Game summary">
      <div className="gamehero__meta">
        <span>{statusLine(g)}</span>
        <span>{longDate(g.date)}</span>
        {g.label ? <span>{g.label}</span> : null}
        {g.neutralSite ? <span>Neutral site</span> : null}
        {data.venue?.arena ? (
          <span>{[data.venue.arena, data.venue.city].filter(Boolean).join(', ')}</span>
        ) : null}
      </div>
      <div className="gamehero__teams">
        {side(g.away, 'Away')}
        {side(g.home, g.neutralSite ? 'Designated home' : 'Home')}
      </div>
      {g.note ? <p className="team-note">{g.note}</p> : null}
      {data.venue?.attendance || data.venue?.officials.length ? (
        <p className="team-note">
          {data.venue.attendance
            ? `Attendance ${data.venue.attendance.toLocaleString('en-US')}. `
            : ''}
          {data.venue.officials.length
            ? `Officials: ${data.venue.officials.join(', ')}.`
            : ''}
        </p>
      ) : null}
    </section>
  );
}

function LineScoreTable({ data }: { data: LeagueGameDetailResponse }) {
  const ls = data.lineScore!;
  return (
    <ResearchTable label="Line score">
      <table>
        <caption>Points by period, from NBA.com’s box score</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            {ls.periods.map((p) => (
              <th key={p.period} scope="col">
                {periodLabel(p.period)}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {(['away', 'home'] as const).map((k) => (
            <tr key={k}>
              <th scope="row">{data.game[k].team.abbreviation}</th>
              {ls.periods.map((p) => (
                <td key={p.period}>{p[k]}</td>
              ))}
              <td>{data.game[k].score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResearchTable>
  );
}

function Highs({ data }: { data: LeagueGameDetailResponse }) {
  return (
    <section className="pmod" aria-labelledby="game-highs">
      <Slate id="game-highs" title="Game highs" tapes={TAPES} />
      <ul className="game-highs">
        {data.highs.map((h) => (
          <li key={h.key}>
            <span>{h.label}</span> <b>{h.value}</b>{' '}
            {h.players.map((p, i) => (
              <span key={p.playerId}>
                {i ? ', ' : ''}
                <Link to={`/players/${p.playerId}`}>{p.name}</Link> ({p.team})
              </span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BoxScores({ data }: { data: LeagueGameDetailResponse }) {
  const box = data.box!;
  return (
    <section className="pmod" aria-labelledby="box-scores">
      <Slate
        id="box-scores"
        title="Box score"
        tapes={TAPES}
        meta={[
          box.source === 'archive' ? 'Archived NBA.com box lines' : 'NBA.com box score',
        ]}
      />
      {box.teams
        .slice()
        .sort((a, b) => Number(a.home) - Number(b.home))
        .map((t) => {
          const played = t.players.filter((p) => p.status === 'played');
          const absent = t.players.filter((p) => p.status !== 'played');
          const leader = (k: string) =>
            played.reduce<(typeof played)[number] | null>(
              (b, p) => ((p.stats[k] ?? -1) > (b?.stats[k] ?? -1) ? p : b),
              null,
            );
          return (
            <div key={t.team.id} className="boxscore">
              <h3>
                {t.team.name} {t.home ? '(home)' : '(away)'}
              </h3>
              <p className="team-note">
                Team leaders:{' '}
                {(['pts', 'reb', 'ast'] as const)
                  .map((k) => {
                    const p = leader(k);
                    return p
                      ? `${p.name} ${p.stats[k]} ${k === 'pts' ? 'points' : k === 'reb' ? 'rebounds' : 'assists'}`
                      : null;
                  })
                  .filter(Boolean)
                  .join(' · ')}
                {t.addsUp
                  ? ''
                  : ' · player points do not add up to the team score in this box score'}
              </p>
              <ResearchTable label={`${t.team.name} box score`}>
                <table>
                  <caption>
                    {played.length} players{' '}
                    {box.source === 'archive'
                      ? '(starters not recorded in the archive)'
                      : '(★ starter)'}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Player',
                        'MIN',
                        'PTS',
                        'FG',
                        '3P',
                        'FT',
                        'OREB',
                        'DREB',
                        'REB',
                        'AST',
                        'STL',
                        'BLK',
                        'TOV',
                        'PF',
                        '+/-',
                      ].map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {played
                      .slice()
                      .sort(
                        (a, b) =>
                          Number(b.starter ?? false) - Number(a.starter ?? false) ||
                          (b.minutes ?? 0) - (a.minutes ?? 0),
                      )
                      .map((p) => (
                        <tr key={p.playerId}>
                          <th scope="row">
                            <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                            {p.starter ? ' ★' : ''}
                            {p.position ? <small> {p.position}</small> : null}
                          </th>
                          <td>{p.minutes === null ? '—' : Math.round(p.minutes)}</td>
                          <td>{n(p.stats.pts)}</td>
                          <td>
                            {n(p.stats.fgm)}-{n(p.stats.fga)}
                          </td>
                          <td>
                            {n(p.stats.fg3m)}-{n(p.stats.fg3a)}
                          </td>
                          <td>
                            {n(p.stats.ftm)}-{n(p.stats.fta)}
                          </td>
                          <td>{n(p.stats.oreb)}</td>
                          <td>{n(p.stats.dreb)}</td>
                          <td>{n(p.stats.reb)}</td>
                          <td>{n(p.stats.ast)}</td>
                          <td>{n(p.stats.stl)}</td>
                          <td>{n(p.stats.blk)}</td>
                          <td>{n(p.stats.tov)}</td>
                          <td>{n(p.stats.pf)}</td>
                          <td>
                            {p.stats.pm === null || p.stats.pm === undefined
                              ? '—'
                              : p.stats.pm > 0
                                ? `+${p.stats.pm}`
                                : p.stats.pm}
                          </td>
                        </tr>
                      ))}
                    <tr className="boxscore__totals">
                      <th scope="row">Team</th>
                      <td>
                        {t.totals.min === null || t.totals.min === undefined
                          ? '—'
                          : Math.round(t.totals.min)}
                      </td>
                      <td>{n(t.totals.pts)}</td>
                      <td>
                        {n(t.totals.fgm)}-{n(t.totals.fga)} (
                        {pct(t.totals.fgm, t.totals.fga)})
                      </td>
                      <td>
                        {n(t.totals.fg3m)}-{n(t.totals.fg3a)} (
                        {pct(t.totals.fg3m, t.totals.fg3a)})
                      </td>
                      <td>
                        {n(t.totals.ftm)}-{n(t.totals.fta)} (
                        {pct(t.totals.ftm, t.totals.fta)})
                      </td>
                      <td>{n(t.totals.oreb)}</td>
                      <td>{n(t.totals.dreb)}</td>
                      <td>{n(t.totals.reb)}</td>
                      <td>{n(t.totals.ast)}</td>
                      <td>{n(t.totals.stl)}</td>
                      <td>{n(t.totals.blk)}</td>
                      <td>{n(t.totals.tov)}</td>
                      <td>{n(t.totals.pf)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </ResearchTable>
              {absent.length ? (
                <p className="team-note">
                  Did not play:{' '}
                  {absent
                    .map((p) => `${p.name}${p.note ? ` (${p.note})` : ''}`)
                    .join(' · ')}
                  . NBA.com’s own notes; no reason is inferred.
                </p>
              ) : null}
            </div>
          );
        })}
    </section>
  );
}

const TYPE_FILTERS: [string, string, (e: LeaguePlayEvent) => boolean][] = [
  ['all', 'All events', () => true],
  ['scoring', 'Scoring plays', (e) => e.points > 0],
  [
    'shots',
    'Shots',
    (e) =>
      e.type === 'made-shot' || e.type === 'missed-shot' || e.type === 'free-throw',
  ],
  [
    'turnovers',
    'Turnovers and steals',
    (e) => e.type === 'turnover' || e.type === 'steal',
  ],
  ['fouls', 'Fouls and violations', (e) => e.type === 'foul' || e.type === 'violation'],
  [
    'substitutions',
    'Substitutions and timeouts',
    (e) => e.type === 'substitution' || e.type === 'timeout',
  ],
];

function PlayByPlay({ gameId, live }: { gameId: string; live: boolean }) {
  const query = useQuery({
    queryKey: ['league', 'pbp', gameId],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/games/${encodeURIComponent(gameId)}/play-by-play`,
        signal,
        LeaguePlayByPlayResponseSchema.parse,
      ),
    retry: false,
    staleTime: live ? 20_000 : 60 * 60_000,
    refetchInterval: live ? 30_000 : false,
    refetchOnWindowFocus: false,
  });
  return (
    <section className="pmod" aria-labelledby="play-by-play">
      <Slate
        id="play-by-play"
        title="Play-by-play"
        tapes={[{ code: 'NBA.com', source: 'Events', variant: 'queried' }]}
      />
      <LeagueFeedback pending={query.isPending} error={query.error} />
      {query.data ? <Events data={query.data} /> : null}
    </section>
  );
}

function Events({ data }: { data: LeaguePlayByPlayResponse }) {
  const [period, setPeriod] = useState<number | 'all'>('all');
  const [team, setTeam] = useState<'both' | 'home' | 'away'>('both');
  const [kind, setKind] = useState('all');
  const [at, setAt] = useState(data.events.length - 1);
  const [page, setPage] = useState(0);
  const a = data.analysis;
  const events = data.events;
  const filter = TYPE_FILTERS.find(([k]) => k === kind)![2];
  const shown = useMemo(
    () =>
      events.filter(
        (e) =>
          (period === 'all' || e.period === period) &&
          (team === 'both' || e.team === team) &&
          filter(e),
      ),
    [events, period, team, filter],
  );
  const PAGE = 60;
  const current = events[Math.min(at, events.length - 1)]!;
  const scoring = events.filter((e) => e.points !== 0);
  const jump = (dir: 1 | -1) => {
    const next =
      dir === 1
        ? scoring.find((e) => e.index > at)
        : [...scoring].reverse().find((e) => e.index < at);
    if (next) setAt(next.index);
  };
  const H = data.home.abbreviation,
    W = data.away.abbreviation;
  const counts = data.sourceCounts;
  return (
    <>
      <ul className="league-unavailable">
        {data.checks.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <ResearchTable label="Scoring flow summary">
        <table>
          <caption>
            Derived from the ordered score after every event
            {counts ? ', beside NBA.com’s own counts' : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">From the events</th>
              {counts ? <th scope="col">NBA.com</th> : null}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Lead changes</th>
              <td>{a.leadChanges}</td>
              {counts ? <td>{n(counts.leadChanges)}</td> : null}
            </tr>
            <tr>
              <th scope="row">Times tied</th>
              <td>{a.timesTied}</td>
              {counts ? <td>{n(counts.timesTied)}</td> : null}
            </tr>
            <tr>
              <th scope="row">Largest lead, {H}</th>
              <td>{a.largestLead.home.points}</td>
              {counts ? <td>{n(counts.biggestLeadHome)}</td> : null}
            </tr>
            <tr>
              <th scope="row">Largest lead, {W}</th>
              <td>{a.largestLead.away.points}</td>
              {counts ? <td>{n(counts.biggestLeadAway)}</td> : null}
            </tr>
            <tr>
              <th scope="row">Biggest run, {H}</th>
              <td>{a.biggestRun.home ? `${a.biggestRun.home.points}-0` : '—'}</td>
              {counts ? (
                <td>
                  {counts.biggestRunHome === null ? '—' : `${counts.biggestRunHome}-0`}
                </td>
              ) : null}
            </tr>
            <tr>
              <th scope="row">Biggest run, {W}</th>
              <td>{a.biggestRun.away ? `${a.biggestRun.away.points}-0` : '—'}</td>
              {counts ? (
                <td>
                  {counts.biggestRunAway === null ? '—' : `${counts.biggestRunAway}-0`}
                </td>
              ) : null}
            </tr>
          </tbody>
        </table>
      </ResearchTable>
      <p className="team-note">
        A lead change is the leading team switching; a tie is a scoring play that levels
        the score; a run is consecutive points by one team with none by the other (runs
        of {a.runThreshold}+ are listed). NBA.com publishes its counts but not the
        events behind them, so the two can differ.
      </p>
      {scoring.length > 1 ? (
        <LineChart
          label={`${H} margin over ${W} through the game`}
          categories={scoring.map((e) => `${periodLabel(e.period)} ${e.clock}`)}
          series={[
            {
              id: 'margin',
              label: `${H} margin`,
              color: 'var(--red-hi)',
              values: scoring.map((e) => e.home - e.away),
            },
          ]}
          format={(v) => (v > 0 ? `${H} +${v}` : v < 0 ? `${W} +${-v}` : 'Tied')}
          zero={0}
          height={220}
        />
      ) : null}
      <div className="pbp-scrubber">
        <label>
          Event {at + 1} of {events.length}
          <input
            type="range"
            min={0}
            max={events.length - 1}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
            aria-valuetext={`${periodLabel(current.period)} ${current.clock}, ${W} ${current.away}, ${H} ${current.home}`}
          />
        </label>
        <div className="pbp-scrubber__buttons">
          <button type="button" onClick={() => jump(-1)}>
            Previous scoring play
          </button>
          <button type="button" onClick={() => jump(1)}>
            Next scoring play
          </button>
        </div>
        <p aria-live="polite" className="pbp-scrubber__now">
          <b>
            {periodLabel(current.period)} {current.clock}
          </b>{' '}
          {W} {current.away}, {H} {current.home} — {current.description}
        </p>
      </div>
      {a.runs.length ? (
        <>
          <h3>Runs of {a.runThreshold} or more unanswered points</h3>
          <ul className="pbp-runs">
            {a.runs.map((r) => (
              <li key={`${r.startIndex}-${r.endIndex}`}>
                <button
                  type="button"
                  className="reset link-button"
                  onClick={() => setAt(r.endIndex)}
                >
                  {r.team === 'home' ? H : W} {r.points}-0
                </button>{' '}
                in {periodLabel(r.period)}, {r.startScore} to {r.endScore} ({W}-{H})
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="pbp-filters">
        <label>
          Period
          <select
            value={String(period)}
            onChange={(e) => (
              setPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value)),
              setPage(0)
            )}
          >
            <option value="all">All periods</option>
            {a.periodScores.map((p) => (
              <option key={p.period} value={p.period}>
                {periodLabel(p.period)} ({W} {p.away}, {H} {p.home})
              </option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select
            value={team}
            onChange={(e) => (setTeam(e.target.value as 'both'), setPage(0))}
          >
            <option value="both">Both teams</option>
            <option value="away">{W}</option>
            <option value="home">{H}</option>
          </select>
        </label>
        <label>
          Events
          <select value={kind} onChange={(e) => (setKind(e.target.value), setPage(0))}>
            {TYPE_FILTERS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ResearchTable label="Play-by-play events">
        <table>
          <caption>
            {shown.length} of {events.length} events
          </caption>
          <thead>
            <tr>
              {['Period', 'Clock', 'Team', 'Event', `${W}-${H}`].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(page * PAGE, page * PAGE + PAGE).map((e) => (
              <tr key={e.index} className={e.index === at ? 'is-picked' : undefined}>
                <td>{periodLabel(e.period)}</td>
                <td>
                  <button
                    type="button"
                    className="reset link-button"
                    onClick={() => setAt(e.index)}
                  >
                    {e.clock}
                  </button>
                </td>
                <td>{e.team === 'home' ? H : e.team === 'away' ? W : ''}</td>
                <th scope="row">
                  {e.playerId && e.player ? (
                    <Link to={`/players/${e.playerId}`}>{e.description}</Link>
                  ) : (
                    e.description
                  )}
                </th>
                <td>
                  {e.points > 0 ? (
                    <b>{`${e.away}-${e.home}`}</b>
                  ) : (
                    `${e.away}-${e.home}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
      <div className="league-pager">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous events
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(shown.length / PAGE))}
        </span>
        <button
          type="button"
          disabled={(page + 1) * PAGE >= shown.length}
          onClick={() => setPage(page + 1)}
        >
          Next events
        </button>
      </div>
      <LeagueSourceNote provenance={data.provenance} />
    </>
  );
}
