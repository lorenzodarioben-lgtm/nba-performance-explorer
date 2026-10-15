import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  PlayoffSeriesFilmRoomResponseSchema,
  PlayoffSeriesIdSchema,
  type PlayoffSeriesFilmRoomResponse,
  type SeriesGameAnalysis,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { calendarLabel, LineScore, MarginFlow } from '../league/Scoreboard';
import { BarChart } from '../../charts/BarChart';
import { MirrorBars } from '../../charts/MirrorBars';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { springs } from '../../motion/tokens';
import { Slate } from '../../ui/Slate';
import { ROUND_NAMES } from './bracket-layout';
import { LeaderText } from '../wiki-archive/LeaderText';

const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'FROM FINAL + PERIOD SCORES', variant: 'derived' as const },
];
const periodName = (p: number) => (p <= 4 ? `Q${p}` : p === 5 ? 'OT' : `${p - 4}OT`);
const signed = (v: number, digits = 0) => {
  const text = Math.abs(v).toFixed(digits);
  return Number(text) === 0 ? text : `${v > 0 ? '+' : '−'}${text}`;
};

export function SeriesFilmRoomPage() {
  const { seriesId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const id = PlayoffSeriesIdSchema.safeParse(seriesId);
  const gameParam = params.get('game');
  const validGame =
    gameParam === null ||
    (/^[1-7]$/.test(gameParam) && params.getAll('game').length === 1);
  const extra = [...params.keys()].some((k) => k !== 'game');
  const valid = id.success && validGame && !extra;
  const query = useQuery({
    queryKey: ['research', 'playoff-series', seriesId],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/games/series/${seriesId}`,
        signal,
        PlayoffSeriesFilmRoomResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const title = data
    ? `${data.series.teams[0].abbreviation} vs ${data.series.teams[1].abbreviation} film room`
    : 'Series film room';
  return (
    <ResearchShell
      title={title}
      lede={
        <p>
          One 2024 playoff series, game by game: every recorded final, the series score
          as it stood, and how each game was won quarter by quarter. Built only from
          published final and period scores.
        </p>
      }
    >
      <nav className="intel-links" aria-label="Related playoff research">
        <Link to={data ? `/games/bracket?series=${data.series.id}` : '/games/bracket'}>
          Back to the bracket
        </Link>
        <Link to="/games">Playoff games by date</Link>
      </nav>
      {!valid ? (
        <p role="alert">
          This series link is not supported. Choose a series from{' '}
          <Link to="/games/bracket">the 2024 bracket</Link>.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data ? (
        <FilmRoom
          data={data}
          selectedNumber={Math.min(
            Number(gameParam ?? data.series.games.length),
            data.series.games.length,
          )}
          onSelect={(n) =>
            setParams(n === data.series.games.length ? {} : { game: String(n) }, {
              replace: true,
            })
          }
        />
      ) : null}
    </ResearchShell>
  );
}

function FilmRoom({
  data,
  selectedNumber,
  onSelect,
}: {
  data: PlayoffSeriesFilmRoomResponse;
  selectedNumber: number;
  onSelect: (n: number) => void;
}) {
  const { series, analysis } = data;
  const [a, b] = series.teams;
  const selected = analysis.games.find((g) => g.number === selectedNumber)!;
  const entry = series.games.find((g) => g.number === selectedNumber)!;
  const teamOf = (teamId: string) => (teamId === a.id ? a : b);
  const roundName = series.round ? ROUND_NAMES[series.round] : 'Playoff series';
  const seed = (i: 0 | 1) => (series.seeds ? series.seeds[i] : null);
  // The saved and shared link keeps the game being studied (Game 5 by default is the clinch).
  const path = `/games/series/${series.id}${selectedNumber === series.games.length ? '' : `?game=${selectedNumber}`}`;
  return (
    <>
      <section className="fr-hero" aria-label="Series result">
        <span className="fr-hero__kicker">
          Film room · {roundName}
          {series.conference ? ` · ${series.conference}ern Conference` : ''} · 2024
        </span>
        <div className="fr-hero__board">
          {([0, 1] as const).map((i) => {
            const team = series.teams[i];
            const won = series.winner?.id === team.id;
            return (
              <div
                key={team.id}
                className={`fr-hero__side ${won ? 'is-won' : series.winner ? 'is-out' : ''}`}
              >
                {seed(i) !== null ? (
                  <span className="fr-hero__seed">Seed {seed(i)}</span>
                ) : null}
                <span className="fr-hero__abbr">{team.abbreviation}</span>
                <span className="fr-hero__name">{team.name}</span>
                <span className="fr-hero__wins num">{series.wins[i]}</span>
              </div>
            );
          })}
        </div>
        <p className="fr-hero__result">
          {series.winner
            ? `${series.winner.name} won the series ${Math.max(...series.wins)}–${Math.min(...series.wins)}, clinching in Game ${series.games.length}.`
            : `Undecided in the record: ${a.abbreviation} ${series.wins[0]}–${series.wins[1]} ${b.abbreviation} after ${series.games.length} recorded games.`}
          {data.champion && series.round === 4
            ? ` ${data.champion.name} are the 2024 champions.`
            : ''}
        </p>
        <nav className="fr-hero__nav" aria-label="Neighbouring series">
          {data.previous.map((prev, i) =>
            prev ? (
              <Link key={prev} to={`/games/series/${prev}`}>
                ← How {series.teams[i as 0 | 1].abbreviation} got here
              </Link>
            ) : null,
          )}
          {data.next ? (
            <Link to={`/games/series/${data.next}`}>
              {series.winner?.abbreviation} next →
            </Link>
          ) : null}
        </nav>
      </section>

      <section className="pmod" aria-labelledby="fr-tape">
        <Slate
          id="fr-tape"
          title="The series, game by game"
          tapes={TAPES}
          meta={[
            `${series.games.length} recorded games`,
            `Home team won ${series.homeWins}`,
            series.overtimeGames ? `${series.overtimeGames} overtime` : 'No overtime',
          ]}
        />
        <p className="fr-note fr-tape__key">
          Each card&rsquo;s bar grows left when {a.abbreviation} won and right when{' '}
          {b.abbreviation} won, scaled to the series&rsquo; widest margin. Arrow keys
          move between games.
        </p>
        <GameTape data={data} selectedNumber={selectedNumber} onSelect={onSelect} />
        <figure className="pmod__figure">
          <figcaption className="pmod__caption">
            Final margin each game, from {a.name}&apos;s side. Choose a bar to open that
            game.
          </figcaption>
          <BarChart
            data={analysis.games.map((g) => ({
              key: g.gameId,
              label: `Game ${g.number}`,
              value: g.margin,
              tone: g.margin > 0 ? 'accent' : 'default',
              detail: [
                { label: 'Winner', value: teamOf(g.winnerId).abbreviation },
                { label: 'Total points', value: String(g.total) },
              ],
            }))}
            label={`${a.abbreviation} final margin by game`}
            format={(v) => signed(v)}
            height={200}
            selected={selectedNumber - 1}
            onSelect={(i) => onSelect(i + 1)}
            tickLabel={(_, i) => `G${i + 1}`}
          />
        </figure>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <GamePanel
          key={selected.gameId}
          data={data}
          analysis={selected}
          entry={entry}
        />
      </AnimatePresence>

      <SeriesIntelligence data={data} />

      <p className="intel-game__links">
        <Link to={`/teams/${a.id}/season`}>{a.abbreviation} regular season</Link>
        <Link to={`/teams/${b.id}/season`}>{b.abbreviation} regular season</Link>
        <Link to={`/lab/teams?teams=${a.id},${b.id}`}>
          Compare their regular seasons
        </Link>
        <Link to={`/games/bracket?series=${series.id}`}>Series on the bracket</Link>
      </p>
      <SaveResearchButton
        kind="analysis"
        label={`2024 ${roundName}: ${a.abbreviation}–${b.abbreviation} film room`}
        path={path}
      />
      <SourceNote provenance={data.provenance} />
      <WikiAttribution data={data.attribution} />
    </>
  );
}

/** The series as a strip of game cards; arrow keys move between games (one tab stop). */
function GameTape({
  data,
  selectedNumber,
  onSelect,
}: {
  data: PlayoffSeriesFilmRoomResponse;
  selectedNumber: number;
  onSelect: (n: number) => void;
}) {
  const { series, analysis } = data;
  const [a, b] = series.teams;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const maxMargin = Math.max(...analysis.games.map((g) => Math.abs(g.margin)), 1);
  const move = (e: KeyboardEvent, index: number) => {
    const last = analysis.games.length - 1;
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(last, index + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(0, index - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    onSelect(to + 1);
    refs.current[to]?.focus();
  };
  return (
    <ol className="fr-tape" aria-label="Games in the series">
      {analysis.games.map((g, i) => {
        const game = series.games[i]!.game;
        const on = g.number === selectedNumber;
        const winner = g.winnerId === a.id ? a : b;
        const after = series.games[i]!.after;
        return (
          <li key={g.gameId}>
            <button
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              className={`reset fr-card ${on ? 'is-on' : ''} ${g.margin > 0 ? 'is-a' : 'is-b'}`}
              aria-pressed={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(g.number)}
              onKeyDown={(e) => move(e, i)}
              aria-label={`Game ${g.number}, ${calendarLabel(game.date)}: ${winner.name} won ${Math.max(game.homeScore, game.awayScore)}–${Math.min(game.homeScore, game.awayScore)}${g.periods.length > 4 ? ' in overtime' : ''}; series ${a.abbreviation} ${after[0]}–${after[1]} ${b.abbreviation}${g.clinching ? ', series clinched' : ''}`}
            >
              <span className="fr-card__no">G{g.number}</span>
              <span className="fr-card__date">{calendarLabel(game.date)}</span>
              <span className="fr-card__score num">
                <span className={game.away.id === winner.id ? 'is-won' : ''}>
                  {game.away.abbreviation} {game.awayScore}
                </span>
                <span className={game.home.id === winner.id ? 'is-won' : ''}>
                  @ {game.home.abbreviation} {game.homeScore}
                </span>
              </span>
              <span className="fr-card__bar" aria-hidden="true">
                <i
                  style={{
                    width: `${(50 * Math.abs(g.margin)) / maxMargin}%`,
                    [g.margin > 0 ? 'right' : 'left']: '50%',
                  }}
                />
              </span>
              <span className="fr-card__after num">
                {after[0]}–{after[1]}
                {g.clinching ? <b>clinched</b> : null}
                {g.periods.length > 4 ? <em> · OT</em> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function GamePanel({
  data,
  analysis,
  entry,
}: {
  data: PlayoffSeriesFilmRoomResponse;
  analysis: SeriesGameAnalysis;
  entry: PlayoffSeriesFilmRoomResponse['series']['games'][number];
}) {
  const allowed = useMotionAllowed();
  const { series } = data;
  const [a, b] = series.teams;
  const game = entry.game;
  const leaders = game.leaders;
  const afterThree = analysis.periods[2]!.cumulativeMargin;
  const leaderAfterThree = afterThree > 0 ? a : afterThree < 0 ? b : null;
  return (
    <motion.section
      className="pmod fr-game"
      aria-labelledby="fr-game-title"
      initial={allowed ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={allowed ? { opacity: 0, y: -8 } : { opacity: 1 }}
      transition={allowed ? springs.data : { duration: 0 }}
      aria-live="polite"
    >
      <Slate
        id="fr-game-title"
        title={`Game ${analysis.number}: ${game.away.abbreviation} ${game.awayScore} @ ${game.home.abbreviation} ${game.homeScore}`}
        tapes={[TAPES[0]!]}
        meta={[
          calendarLabel(game.date),
          game.venue ?? 'Venue not recorded',
          `Series after: ${a.abbreviation} ${entry.after[0]}–${entry.after[1]} ${b.abbreviation}`,
        ]}
        actions={
          <Link className="btn btn--sm" to={`/games/${game.id}`}>
            Open the game page
          </Link>
        }
      />
      <div className="fr-game__grid">
        <div>
          <h3 className="fr-sub">Line score</h3>
          <LineScore game={game} />
          <h3 className="fr-sub">Margin at each period&rsquo;s end</h3>
          <MarginFlow game={game} />
        </div>
        <div>
          <h3 className="fr-sub">Points by period</h3>
          <MirrorBars
            nameA={a.abbreviation}
            nameB={b.abbreviation}
            sharedMax={Math.max(...analysis.periods.flatMap((p) => p.points))}
            rows={analysis.periods.map((p) => ({
              label: periodName(p.period),
              a: p.points[0],
              b: p.points[1],
              displayA: String(p.points[0]),
              displayB: String(p.points[1]),
            }))}
          />
          <dl className="statgrid fr-game__facts">
            <div className="statgrid__cell">
              <dt>First half</dt>
              <dd>
                {analysis.halves.first[0]}–{analysis.halves.first[1]}
              </dd>
            </div>
            <div className="statgrid__cell">
              <dt>Second half</dt>
              <dd>
                {analysis.halves.second[0]}–{analysis.halves.second[1]}
              </dd>
            </div>
            {analysis.halves.overtime ? (
              <div className="statgrid__cell">
                <dt>Overtime</dt>
                <dd>
                  {analysis.halves.overtime[0]}–{analysis.halves.overtime[1]}
                </dd>
              </div>
            ) : null}
            <div className="statgrid__cell">
              <dt>After three</dt>
              <dd>
                {leaderAfterThree
                  ? `${leaderAfterThree.abbreviation} +${Math.abs(afterThree)}`
                  : 'Level'}
              </dd>
            </div>
          </dl>
          {analysis.wonFromBehindAfterThree ? (
            <p className="fr-note">
              {(analysis.margin > 0 ? a : b).name} trailed after three quarters and won.
              Quarter totals only: when the lead changed inside the fourth is not
              recorded.
            </p>
          ) : null}
        </div>
      </div>
      <ResearchTable label={`Game ${analysis.number} period scores`}>
        <table>
          <caption>
            Points per period and {a.abbreviation}&rsquo;s running margin, as published
          </caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">{a.abbreviation}</th>
              <th scope="col">{b.abbreviation}</th>
              <th scope="col">{a.abbreviation} running margin</th>
            </tr>
          </thead>
          <tbody>
            {analysis.periods.map((p) => (
              <tr key={p.period}>
                <th scope="row">{periodName(p.period)}</th>
                <td>{p.points[0]}</td>
                <td>{p.points[1]}</td>
                <td>{signed(p.cumulativeMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
      {leaders.some((l) => l.points || l.rebounds || l.assists) ? (
        <div className="fr-leaders">
          <h3 className="fr-sub">Published game leaders</h3>
          <dl>
            {leaders.map((l) => {
              const team = l.teamId === a.id ? a : b;
              return (
                <div key={l.teamId}>
                  <dt>{team.abbreviation}</dt>
                  <dd>
                    {(
                      [
                        ['Points', l.points],
                        ['Rebounds', l.rebounds],
                        ['Assists', l.assists],
                      ] as const
                    )
                      .filter(([, v]) => v)
                      .map(([label, v], i) => (
                        <span key={label}>
                          {i ? ' · ' : ''}
                          {label}: <LeaderText text={v} teamId={l.teamId} />
                        </span>
                      ))}
                    {!l.points && !l.rebounds && !l.assists ? 'Not published' : null}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="fr-note">
            As printed in the source&rsquo;s game box; no player totals are
            recalculated.
          </p>
        </div>
      ) : null}
    </motion.section>
  );
}

function SeriesIntelligence({ data }: { data: PlayoffSeriesFilmRoomResponse }) {
  const { series, analysis } = data;
  const [a, b] = series.teams;
  const gameNo = (id: string) => analysis.games.find((g) => g.gameId === id)!.number;
  const team = (id: string) => (id === a.id ? a : b);
  return (
    <section className="pmod" aria-labelledby="fr-intel">
      <Slate
        id="fr-intel"
        title="Series intelligence"
        tapes={[TAPES[1]!]}
        meta={[
          `All ${analysis.games.length} recorded games`,
          `${a.abbreviation} side first`,
        ]}
      />
      <dl className="statgrid fr-intel">
        <div className="statgrid__cell">
          <dt>Wins</dt>
          <dd>
            {a.abbreviation} {series.wins[0]} · {b.abbreviation} {series.wins[1]}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>Points per game</dt>
          <dd>
            {analysis.pointsPerGame[0].toFixed(1)}–
            {analysis.pointsPerGame[1].toFixed(1)}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>{a.abbreviation} average margin</dt>
          <dd>{signed(analysis.averageMargin, 1)}</dd>
        </div>
        <div className="statgrid__cell">
          <dt>Average total</dt>
          <dd>{analysis.averageTotal.toFixed(1)}</dd>
        </div>
        <div className="statgrid__cell">
          <dt>Closest game</dt>
          <dd>
            {analysis.closest.margin} pts · G
            {analysis.closest.gameIds.map(gameNo).join(', G')}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>Largest margin</dt>
          <dd>
            {team(analysis.largest.winnerId).abbreviation} by {analysis.largest.margin}{' '}
            · G{gameNo(analysis.largest.gameId)}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>Widest period gap</dt>
          <dd>
            {analysis.widestPeriod.period}:{' '}
            {analysis.widestPeriod.margin === 0
              ? 'level'
              : `${(analysis.widestPeriod.margin > 0 ? a : b).abbreviation} +${Math.abs(analysis.widestPeriod.margin)}`}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>Won after trailing at Q3</dt>
          <dd>{analysis.comebacksAfterThree}</dd>
        </div>
      </dl>
      <div className="fr-periods">
        <h3 className="fr-sub">Points by period across the series</h3>
        <MirrorBars
          nameA={a.abbreviation}
          nameB={b.abbreviation}
          sharedMax={Math.max(...analysis.periodTotals.flatMap((p) => p.points))}
          rows={analysis.periodTotals.map((p) => ({
            label: p.period,
            a: p.points[0],
            b: p.points[1],
            displayA: String(p.points[0]),
            displayB: String(p.points[1]),
          }))}
        />
      </div>
      <ResearchTable label="Series exact values">
        <table>
          <caption>
            Every recorded game; margins and running margins from {a.abbreviation}
            &rsquo;s side
          </caption>
          <thead>
            <tr>
              <th scope="col">Game</th>
              <th scope="col">Winner</th>
              <th scope="col">{a.abbreviation}</th>
              <th scope="col">{b.abbreviation}</th>
              <th scope="col">Margin</th>
              <th scope="col">After Q3</th>
              <th scope="col">1st half</th>
              <th scope="col">2nd half</th>
            </tr>
          </thead>
          <tbody>
            {analysis.games.map((g) => {
              const aPts = (g.total + g.margin) / 2;
              return (
                <tr key={g.gameId}>
                  <th scope="row">
                    <Link to={`/games/${g.gameId}`}>Game {g.number}</Link>
                  </th>
                  <td>{team(g.winnerId).abbreviation}</td>
                  <td>{aPts}</td>
                  <td>{g.total - aPts}</td>
                  <td>{signed(g.margin)}</td>
                  <td>{signed(g.periods[2]!.cumulativeMargin)}</td>
                  <td>
                    {g.halves.first[0]}–{g.halves.first[1]}
                  </td>
                  <td>
                    {g.halves.second[0]}–{g.halves.second[1]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResearchTable>
      <p className="fr-note">
        Definitions: margin is {a.abbreviation} points minus {b.abbreviation} points;
        &ldquo;won after trailing at Q3&rdquo; compares the running margin after three
        quarters with the final. Period totals add overtime periods together. There is
        no play-by-play in this source, so no scoring runs or lead changes within a
        period are described.
      </p>
    </section>
  );
}
