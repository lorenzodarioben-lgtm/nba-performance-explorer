import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  ArchiveGameIdSchema,
  PlayoffBracketResponseSchema,
  type PlayoffBracketResponse,
  type PlayoffSeries,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchShell, SourceNote } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { calendarLabel } from '../league/Scoreboard';
import { BarChart } from '../../charts/BarChart';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { Slate } from '../../ui/Slate';
import { Notice } from '../../ui/DataState';
import {
  bracketColumns,
  ROUND_NAMES,
  seriesForGame,
  playoffRecord,
} from './bracket-layout';

const StateSchema = z
  .object({
    series: z
      .string()
      .regex(/^r[1-4]-[A-Z]{3}-[A-Z]{3}$/)
      .optional(),
    game: ArchiveGameIdSchema.optional(),
  })
  .strict();

const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'SERIES FROM FINALS', variant: 'derived' as const },
];

export function PlayoffBracketPage() {
  const [params, setParams] = useSearchParams();
  const state = StateSchema.safeParse(Object.fromEntries(params));
  const valid =
    state.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'playoff-bracket'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/games/bracket', signal, PlayoffBracketResponseSchema.parse),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const selected = data
    ? state.data?.series
      ? (data.series.find((s) => s.id === state.data.series) ?? null)
      : state.data?.game
        ? seriesForGame(data.series, state.data.game)
        : null
    : null;
  const choose = (series: PlayoffSeries | null) =>
    setParams(series ? { series: series.id } : {}, { replace: true });
  return (
    <ResearchShell
      title="2024 playoff bracket"
      lede={
        <p>
          Every recorded game of the 2024 NBA playoffs, grouped into series and
          assembled into the bracket. Winners are named only where the recorded games
          end with a fourth win.
        </p>
      }
    >
      <nav className="intel-links" aria-label="Related playoff research">
        <Link to="/games/recorded">Playoff games by date</Link>
        <Link to="/games/shooting">2018 playoff shooting</Link>
        <Link to="/standings/race">Regular-season race</Link>
      </nav>
      {!valid ? (
        <p role="alert">
          Invalid bracket view. <Link to="/games/bracket">Reset the bracket</Link>.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data ? (
        <>
          {data.champion ? <Champion data={data} /> : null}
          {data.complete ? (
            <Bracket data={data} selected={selected} onSelect={choose} />
          ) : (
            <PartialRounds data={data} selected={selected} onSelect={choose} />
          )}
          {selected ? (
            <SeriesPanel series={selected} onClose={() => choose(null)} />
          ) : (
            <p className="lchart__note bracket__hint">
              Choose any series to open its game-by-game story.
            </p>
          )}
          <SaveResearchButton
            kind="analysis"
            label={
              selected
                ? `2024 playoffs: ${selected.teams[0].abbreviation}–${selected.teams[1].abbreviation}`
                : '2024 playoff bracket'
            }
            path={`/games/bracket${selected ? `?series=${selected.id}` : ''}`}
          />
          <SourceNote provenance={data.provenance} />
          <WikiAttribution data={data.attribution} />
        </>
      ) : null}
    </ResearchShell>
  );
}

function Champion({ data }: { data: PlayoffBracketResponse }) {
  const champion = data.champion!;
  const record = playoffRecord(data.series, champion.id);
  const finals = data.series.find((s) => s.round === 4)!;
  const opponent = finals.teams.find((t) => t.id !== champion.id)!;
  const finalsWins = finals.wins[finals.teams[0].id === champion.id ? 0 : 1];
  return (
    <Stagger as="section" className="champion" gap={0.08}>
      <StaggerItem as="div" className="champion__kicker">
        2024 NBA champion · from recorded games
      </StaggerItem>
      <StaggerItem as="div" className="champion__name">
        <span className="champion__abbr">{champion.abbreviation}</span>
        <span>{champion.name}</span>
      </StaggerItem>
      <StaggerItem as="div">
        <dl className="statgrid champion__facts">
          <div className="statgrid__cell">
            <dt>Playoff record</dt>
            <dd>
              {record.wins}–{record.losses}
            </dd>
          </div>
          <div className="statgrid__cell">
            <dt>Finals</dt>
            <dd>
              {finalsWins}–{finals.games.length - finalsWins} vs {opponent.abbreviation}
            </dd>
          </div>
          <div className="statgrid__cell">
            <dt>Series won</dt>
            <dd>4</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Recorded games</dt>
            <dd>{data.recordedGames}</dd>
          </div>
        </dl>
      </StaggerItem>
    </Stagger>
  );
}

function Bracket({
  data,
  selected,
  onSelect,
}: {
  data: PlayoffBracketResponse;
  selected: PlayoffSeries | null;
  onSelect: (series: PlayoffSeries) => void;
}) {
  const columns = bracketColumns(data.series);
  return (
    <section className="pmod" aria-labelledby="bracket-title">
      <Slate
        id="bracket-title"
        title="The bracket"
        tapes={TAPES}
        meta={[
          '15 series',
          'West · Finals · East',
          data.seedsPublished
            ? 'Seeds as published by the source'
            : 'Seeds not published',
        ]}
      />
      <div className="bracket">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`bracket__col bracket__col--r${column.round} bracket__col--${column.side}`}
            role="group"
            aria-label={column.label}
          >
            <h3 className="bracket__head">{column.label}</h3>
            <div className="bracket__slots">
              {column.pairs.map((pair, index) => (
                <div key={index} className="bracket__pair">
                  {pair.map((series) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      on={selected?.id === series.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="lchart__note">
        Each card lists the better seed first when the source publishes seeds. Pips run
        in game order and are filled when the upper team won.
      </p>
    </section>
  );
}

function PartialRounds({
  data,
  selected,
  onSelect,
}: {
  data: PlayoffBracketResponse;
  selected: PlayoffSeries | null;
  onSelect: (series: PlayoffSeries) => void;
}) {
  return (
    <section className="pmod" aria-labelledby="bracket-title">
      <Slate
        id="bracket-title"
        title="Recorded series"
        tapes={[...TAPES, { code: 'INCOMPLETE', variant: 'partial' }]}
        meta={[`${data.series.length} series`]}
      />
      <Notice tone="warn" title="Partial bracket">
        The recorded games do not form a complete bracket, so series are listed by round
        without a tree. {data.issues.join(' ')}
      </Notice>
      {[1, 2, 3, 4, null].map((round) => {
        const list = data.series.filter((s) => s.round === round);
        if (!list.length) return null;
        return (
          <div key={String(round)} className="bracket__partial">
            <h3 className="bracket__head">{round ? ROUND_NAMES[round] : 'Unplaced'}</h3>
            <div className="bracket__plist">
              {list.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  on={selected?.id === s.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SeriesCard({
  series,
  on,
  onSelect,
}: {
  series: PlayoffSeries;
  on: boolean;
  onSelect: (series: PlayoffSeries) => void;
}) {
  // The better published seed is listed first, as on a broadcast bracket; otherwise the order
  // is the series' own (by abbreviation).
  const order: [0 | 1, 0 | 1] =
    series.seeds && series.seeds[1] < series.seeds[0] ? [1, 0] : [0, 1];
  const top = series.teams[order[0]];
  const seed = (i: 0 | 1) => (series.seeds ? `seed ${series.seeds[i]} ` : '');
  const label = `${order
    .map((i) => `${seed(i)}${series.teams[i].name} ${series.wins[i]}`)
    .join(
      ', ',
    )}${series.winner ? `, ${series.winner.name} won in ${series.games.length}` : ', undecided'}`;
  return (
    <button
      type="button"
      className={`reset seriescard ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => onSelect(series)}
    >
      {order.map((i) => {
        const team = series.teams[i];
        const won = series.winner?.id === team.id;
        return (
          <span
            key={team.id}
            className={`seriescard__team ${won ? 'is-won' : series.winner ? 'is-out' : ''}`}
          >
            <b>
              {series.seeds ? (
                <span className="seriescard__seed">{series.seeds[i]}</span>
              ) : null}
              {team.abbreviation}
            </b>
            <em className="num">{series.wins[i]}</em>
          </span>
        );
      })}
      <span className="seriescard__pips" aria-hidden="true">
        {series.games.map((g) => (
          <i
            key={g.game.id}
            className={g.winner.id === top.id ? 'pip pip--w' : 'pip'}
            title={`Game ${g.number}: ${g.winner.abbreviation}`}
          />
        ))}
      </span>
    </button>
  );
}

function SeriesPanel({
  series,
  onClose,
}: {
  series: PlayoffSeries;
  onClose: () => void;
}) {
  const [a, b] = series.teams;
  const margins = series.games.map((g) => {
    const aScore = g.game.home.id === a.id ? g.game.homeScore : g.game.awayScore;
    const bScore = g.game.home.id === a.id ? g.game.awayScore : g.game.homeScore;
    return aScore - bScore;
  });
  const title = series.seeds
    ? `(${series.seeds[0]}) ${a.abbreviation} vs (${series.seeds[1]}) ${b.abbreviation}`
    : `${a.abbreviation} vs ${b.abbreviation}`;
  return (
    <section className="pmod seriespanel" aria-labelledby="series-title">
      <Slate
        id="series-title"
        title={`${title} · ${series.round ? ROUND_NAMES[series.round] : 'Unplaced'}`}
        tapes={TAPES}
        meta={[
          series.winner
            ? `${series.winner.abbreviation} won ${Math.max(...series.wins)}–${Math.min(...series.wins)}`
            : `Undecided in the record (${series.wins.join('–')})`,
          series.conference ? `${series.conference}ern Conference` : 'NBA Finals',
          series.sourceIdRoundAgrees
            ? 'Game IDs agree on the round'
            : 'Game IDs disagree on the round',
        ]}
        actions={
          <>
            <Link className="btn btn--sm" to={`/games/series/${series.id}`}>
              Open the film room
            </Link>
            <button type="button" className="btn btn--sm btn--quiet" onClick={onClose}>
              Close series
            </button>
          </>
        }
      />
      <dl className="statgrid">
        <div className="statgrid__cell">
          <dt>Points</dt>
          <dd>
            {series.totalPoints[0]}–{series.totalPoints[1]}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>{a.abbreviation} margin / game</dt>
          <dd>{signedText(margins.reduce((s, m) => s + m, 0) / margins.length, 1)}</dd>
        </div>
        <div className="statgrid__cell">
          <dt>Home team won</dt>
          <dd>
            {series.homeWins} of {series.games.length}
          </dd>
        </div>
        <div className="statgrid__cell">
          <dt>Overtime games</dt>
          <dd>{series.overtimeGames}</dd>
        </div>
      </dl>
      <figure className="pmod__figure">
        <figcaption className="pmod__caption">
          Final margin each game, from {a.name}&apos;s side
        </figcaption>
        <BarChart
          data={series.games.map((g, i) => ({
            key: g.game.id,
            label: `Game ${g.number} · ${calendarLabel(g.game.date)}`,
            value: margins[i]!,
            tone: margins[i]! > 0 ? 'accent' : 'default',
            detail: [
              {
                label: 'Final',
                value: `${g.game.away.abbreviation} ${g.game.awayScore} @ ${g.game.home.abbreviation} ${g.game.homeScore}`,
              },
              {
                label: 'Series after',
                value: `${a.abbreviation} ${g.after[0]}–${g.after[1]} ${b.abbreviation}`,
              },
            ],
          }))}
          label={`${title} final margins by game`}
          format={(v) => signedText(v, 0)}
          height={200}
          tickLabel={(_, i) => `G${i + 1}`}
        />
      </figure>
      <Stagger as="ol" className="seriesgames" gap={0.05}>
        {series.games.map((g) => {
          const ot = g.game.quarters.length - 4;
          return (
            <StaggerItem as="li" key={g.game.id}>
              <Link to={`/games/${g.game.id}`} className="seriesgame">
                <span className="seriesgame__no">Game {g.number}</span>
                <span className="seriesgame__date">{calendarLabel(g.game.date)}</span>
                <span className="seriesgame__score">
                  <span className={g.winner.id === g.game.away.id ? 'is-won' : ''}>
                    {g.game.away.abbreviation} {g.game.awayScore}
                  </span>
                  <span aria-hidden="true">@</span>
                  <span className={g.winner.id === g.game.home.id ? 'is-won' : ''}>
                    {g.game.home.abbreviation} {g.game.homeScore}
                  </span>
                </span>
                <span className="seriesgame__state">
                  {ot > 0 ? `Final · ${ot} OT` : 'Final'} · series {g.after[0]}–
                  {g.after[1]}
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
      <p className="intel-game__links">
        <Link to={`/teams/${a.id}/season`}>{a.abbreviation} regular season</Link>
        <Link to={`/teams/${b.id}/season`}>{b.abbreviation} regular season</Link>
        <Link to={`/lab/teams?teams=${a.id},${b.id}`}>
          Compare their regular seasons
        </Link>
      </p>
    </section>
  );
}

function signedText(value: number, digits: number) {
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${value > 0 ? '+' : '−'}${text}`;
}
