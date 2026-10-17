import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  CanonicalTeamIdSchema,
  RecordedTeamSeasonResponseSchema,
  type RecordedTeamSeasonResponse,
  type TeamSeasonGame,
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
import { calendarLabel } from '../league/Scoreboard';
import { BarChart, type BarDatum } from '../../charts/BarChart';
import { LineChart } from '../../charts/LineChart';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { NullValue } from '../../ui/DataState';
import { SplitBoard } from './SplitBoard';
import { SeasonSeriesGrid } from './SeasonSeriesGrid';
import {
  FOCUS_OPTIONS,
  focusMatches,
  signed,
  type SeasonFocus,
} from './team-season-format';

const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'FROM AGREED FINALS', variant: 'derived' as const },
];

const StateSchema = z
  .object({
    focus: z
      .enum(FOCUS_OPTIONS.map((o) => o.value) as [SeasonFocus, ...SeasonFocus[]])
      .optional(),
    game: z
      .string()
      .regex(/^[1-9]\d?$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .optional(),
  })
  .strict();

export function TeamSeasonPage() {
  const { teamId } = useParams();
  const [params, setParams] = useSearchParams();
  const validTeam = CanonicalTeamIdSchema.safeParse(teamId).success;
  const state = StateSchema.safeParse(Object.fromEntries(params));
  const validState =
    state.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'recorded-team-season', teamId],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/team-season?team=${encodeURIComponent(teamId ?? '')}`,
        signal,
        RecordedTeamSeasonResponseSchema.parse,
      ),
    enabled: validTeam,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  const focus: SeasonFocus = (validState && state.data.focus) || 'all';
  const selected = validState ? (state.data.game ?? null) : null;
  const update = (key: 'focus' | 'game', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === 'game' });
  };
  return (
    <ResearchShell
      title={data ? `${data.team.name} · 2023–24` : 'Team season'}
      backdrop={
        data ? <span className="teamghost">{data.team.abbreviation}</span> : null
      }
      lede={
        <p>
          The recorded 2023–24 regular season, game by game: every result both team
          pages agree on, with streaks, rest, margins, splits and the season series
          against each opponent. Historical archive, not official standings.
        </p>
      }
    >
      <nav className="intel-links" aria-label="Related team research">
        <Link to={`/teams/${teamId ?? ''}`}>Team hub</Link>
        <Link to="/standings/race">Standings race</Link>
        <Link to="/standings/recorded">Team rankings</Link>
      </nav>
      {!validTeam ? (
        <p role="alert">Invalid team ID. Team routes use namespaced NBA identities.</p>
      ) : !validState ? (
        <p role="alert">
          Invalid season view.{' '}
          <Link to={`/teams/${teamId}/season`}>Reset the view</Link>.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && validState ? (
        <SeasonBody
          data={data}
          focus={focus}
          selected={selected}
          onFocus={(value) => update('focus', value === 'all' ? null : value)}
          onSelect={(game) => update('game', game === null ? null : String(game))}
          sharePath={`/teams/${data.team.id}/season${params.size ? `?${params}` : ''}`}
        />
      ) : null}
    </ResearchShell>
  );
}

function SeasonBody({
  data,
  focus,
  selected,
  onFocus,
  onSelect,
  sharePath,
}: {
  data: RecordedTeamSeasonResponse;
  focus: SeasonFocus;
  selected: number | null;
  onFocus: (focus: SeasonFocus) => void;
  onSelect: (game: number | null) => void;
  sharePath: string;
}) {
  const all = data.splits.find((s) => s.key === 'all')!;
  const unverified = data.games.filter((g) => !g.verified);
  const selectedGame = selected ? data.games[selected - 1] : undefined;
  const matching = data.games.filter((g) => focusMatches(g, focus));
  const matchingVerified = matching.filter((g) => g.verified);
  const matchingWins = matchingVerified.filter((g) => g.result === 'W').length;
  const ribbon: BarDatum[] = data.games.map((g) => ({
    key: g.id,
    label: `Game ${g.gameNumber} · ${g.location === 'home' ? 'vs' : '@'} ${g.opponent.abbreviation} · ${calendarLabel(g.date)}`,
    value: g.margin,
    tone: g.result === 'W' ? 'default' : 'muted',
    dimmed: !focusMatches(g, focus),
    detail: g.verified
      ? [
          {
            label: 'Final',
            value: `${g.result} ${g.teamScore}–${g.opponentScore}${g.overtime ? ` (${g.overtime} OT)` : ''}`,
          },
          { label: 'Record after', value: `${g.observedWins}–${g.observedLosses}` },
          { label: 'Rest', value: restLabel(g) },
        ]
      : [{ label: 'Status', value: 'Not verified: the two source pages disagree' }],
  }));
  const categories = data.games.map((g) => `G${g.gameNumber}`);
  return (
    <>
      <dl className="scoreboard intel-board">
        <div className="scoreboard__cell">
          <dt>Observed record</dt>
          <dd className="num">
            {all.wins}–{all.losses}
          </dd>
          <dd className="intel-board__note">
            {data.verifiedGames} of 82 games verified
            {unverified.length ? ` · ${unverified.length} quarantined` : ''}
          </dd>
        </div>
        <div className="scoreboard__cell">
          <dt>Margin per game</dt>
          <dd className="num">{signed(all.marginPerGame, 1)}</dd>
          <dd className="intel-board__note">
            {fixed(all.pointsFor, 1)} scored · {fixed(all.pointsAgainst, 1)} allowed
          </dd>
        </div>
        <div className="scoreboard__cell">
          <dt>Longest win streak</dt>
          <dd className="num">{data.longestWinStreak?.length ?? '—'}</dd>
          <dd className="intel-board__note">
            {data.longestWinStreak
              ? `Games ${data.longestWinStreak.fromGame}–${data.longestWinStreak.toGame} · ${calendarLabel(data.longestWinStreak.from)} to ${calendarLabel(data.longestWinStreak.to)}`
              : 'Unavailable: game order unknown'}
            {data.longestLosingStreak
              ? ` · longest skid ${data.longestLosingStreak.length}`
              : ''}
          </dd>
        </div>
      </dl>

      <section className="pmod" aria-labelledby="season-ribbon">
        <Slate
          id="season-ribbon"
          title="The season, game by game"
          tapes={TAPES}
          meta={[
            `${data.conference}ern Conference`,
            'Bars: final margin',
            `${matchingVerified.length} verified games in focus`,
          ]}
        />
        <div className="pmod__controls">
          <Segmented
            label="Focus the season on"
            options={FOCUS_OPTIONS}
            value={focus}
            onChange={onFocus}
          />
          <span className="intel-focus" role="status" aria-live="polite">
            {focus === 'all'
              ? `${all.wins}–${all.losses} across the season`
              : `${matchingWins}–${matchingVerified.length - matchingWins} in ${matchingVerified.length} verified ${FOCUS_OPTIONS.find((o) => o.value === focus)!.label.toLowerCase()} games`}
          </span>
        </div>
        <BarChart
          data={ribbon}
          label={`${data.team.name} final margin in each of 82 games`}
          format={(v) => signed(v, 0)}
          height={260}
          color="var(--red-hi)"
          accent="var(--chalk)"
          selected={selected ? selected - 1 : null}
          onSelect={(index) => onSelect(index + 1 === selected ? null : index + 1)}
          tickLabel={(_, index) => `G${index + 1}`}
        />
        <p className="lchart__note">
          Red bars are wins and grey bars losses; faint bars sit outside the focus and
          the white bar is the open game. A flat mark is a quarantined game: its slot
          and date are real, its score is withheld. Choose a bar (or press Enter on it)
          to open the game.
        </p>
        {selectedGame ? (
          <GameCard
            game={selectedGame}
            team={data.team.id}
            onClose={() => onSelect(null)}
          />
        ) : null}
      </section>

      <section className="pmod intel-paths" aria-labelledby="season-path">
        <Slate
          id="season-path"
          title="How the record moved"
          tapes={TAPES}
          meta={['Games above .500 · ten-game rolling margin']}
        />
        <div className="intel-pair">
          <figure className="pmod__figure">
            <figcaption className="pmod__caption">
              Games above .500, observed
            </figcaption>
            <LineChart
              categories={categories}
              series={[
                {
                  id: 'over',
                  label: 'Wins minus losses',
                  color: 'var(--red-hi)',
                  values: data.games.map((g) => g.observedWins - g.observedLosses),
                },
              ]}
              label={`${data.team.name} wins minus losses after each game`}
              format={(v) => signed(v, 0)}
              height={240}
              zero={0}
            />
          </figure>
          <figure className="pmod__figure">
            <figcaption className="pmod__caption">
              Ten-game rolling margin (only fully verified windows)
            </figcaption>
            <LineChart
              categories={categories}
              series={[
                {
                  id: 'rolling',
                  label: 'Mean final margin, last ten games',
                  color: 'var(--s1)',
                  values: data.games.map((g) => g.rollingMargin),
                },
              ]}
              label={`${data.team.name} ten-game rolling final margin`}
              format={(v) => signed(v, 1)}
              height={240}
              zero={0}
            />
          </figure>
        </div>
      </section>

      <SplitBoard splits={data.splits} chronologyKnown={data.chronologyKnown} />

      <section className="pmod" aria-labelledby="season-margins">
        <Slate
          id="season-margins"
          title="Margin distribution"
          tapes={TAPES}
          meta={[
            '5-point bins',
            `Largest win: ${extremeLabel(data, data.largestWins)}`,
            `Largest loss: ${extremeLabel(data, data.largestLosses)}`,
          ]}
        />
        <BarChart
          data={data.marginBins.map((bin) => ({
            key: String(bin.from),
            label: `${signed(bin.from, 0)} to ${signed(bin.to - 1, 0)}`,
            value: bin.wins + bin.losses,
            tone: bin.from >= 0 ? 'accent' : 'default',
            detail: [
              {
                label: bin.from >= 0 ? 'Wins' : 'Losses',
                value: String(bin.wins + bin.losses),
              },
            ],
          }))}
          label={`${data.team.name} games by final margin`}
          format={(v) => String(Math.round(v))}
          height={200}
          tickLabel={(datum) => signed(Number(datum.key), 0)}
        />
        <p className="lchart__note">
          Each bin holds final margins from its left edge up to four points beyond it.
          Margins are final-score differences, overtime included, not the largest
          in-game lead.
        </p>
      </section>

      <SeasonSeriesGrid data={data} />

      <section className="pmod" aria-labelledby="season-ledger">
        <Slate
          id="season-ledger"
          title="Game ledger"
          tapes={TAPES}
          meta={['82 schedule rows']}
        />
        <details className="intel-ledger">
          <summary>Show all 82 games as a table</summary>
          <ResearchTable label={`${data.team.name} 2023-24 game ledger`}>
            <table>
              <caption>
                Source schedule order. Unverified rows keep their date and opponent
                only.
              </caption>
              <thead>
                <tr>
                  <th scope="col">G</th>
                  <th scope="col">Date</th>
                  <th scope="col">Opponent</th>
                  <th scope="col">Result</th>
                  <th scope="col">Margin</th>
                  <th scope="col">Rest days</th>
                  <th scope="col">Record</th>
                  <th scope="col">Recap</th>
                </tr>
              </thead>
              <tbody>
                {data.games.map((g) => (
                  <tr key={g.id}>
                    <td>{g.gameNumber}</td>
                    <td>{g.date}</td>
                    <th scope="row">
                      {g.location === 'home' ? 'vs' : '@'}{' '}
                      <Link to={`/teams/${g.opponent.id}/season`}>
                        {g.opponent.name}
                      </Link>
                    </th>
                    <td>
                      {g.verified ? (
                        `${g.result} ${g.teamScore}–${g.opponentScore}${g.overtime ? ` (${g.overtime} OT)` : ''}`
                      ) : (
                        <span>Not verified</span>
                      )}
                    </td>
                    <td>{g.margin === null ? <NullValue /> : signed(g.margin, 0)}</td>
                    <td>{g.restDays ?? <NullValue />}</td>
                    <td>
                      {g.observedWins}–{g.observedLosses}
                    </td>
                    <td>
                      <a href={g.recapUrl} target="_blank" rel="noreferrer">
                        NBA.com
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        </details>
      </section>

      <SaveResearchButton
        kind="team"
        label={`${data.team.name} 2023-24 season`}
        path={sharePath}
      />
      <SourceNote provenance={data.provenance} />
      <WikiAttribution data={data.attribution} />
      <p>
        Conference alignment from{' '}
        <a href={data.conferenceSource.url} target="_blank" rel="noreferrer">
          {data.conferenceSource.title}, revision {data.conferenceSource.revision}
        </a>{' '}
        ({data.conferenceSource.license}).
        {unverified.length
          ? ` Quarantined game IDs: ${unverified.map((g) => g.id).join(', ')}.`
          : ''}
      </p>
    </>
  );
}

function GameCard({
  game,
  team,
  onClose,
}: {
  game: TeamSeasonGame;
  team: string;
  onClose: () => void;
}) {
  return (
    <Stagger as="div" className="intel-game" gap={0.04}>
      <StaggerItem as="div" className="intel-game__head">
        <span className="intel-game__no">G{game.gameNumber}</span>
        <h3>
          {game.location === 'home' ? 'vs' : 'at'} {game.opponent.name}
        </h3>
        <button type="button" className="btn btn--sm btn--quiet" onClick={onClose}>
          Close game
        </button>
      </StaggerItem>
      <StaggerItem as="div">
        <dl className="statgrid">
          <div className="statgrid__cell">
            <dt>Date</dt>
            <dd>{calendarLabel(game.date)}</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Final</dt>
            <dd className={game.result === 'W' ? 'is-win' : undefined}>
              {game.verified
                ? `${game.result} ${game.teamScore}–${game.opponentScore}${game.overtime ? ` · ${game.overtime}OT` : ''}`
                : 'Not verified'}
            </dd>
          </div>
          <div className="statgrid__cell">
            <dt>Rest before</dt>
            <dd>{restLabel(game)}</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Record after</dt>
            <dd>
              {game.observedWins}–{game.observedLosses}
            </dd>
          </div>
        </dl>
      </StaggerItem>
      <StaggerItem as="div" className="intel-game__links">
        <Link to={`/teams/${game.opponent.id}/season`}>
          {game.opponent.abbreviation} season
        </Link>
        <Link to={`/lab/teams?teams=${team},${game.opponent.id}`}>
          Compare the two teams
        </Link>
        <a href={game.recapUrl} target="_blank" rel="noreferrer">
          NBA.com recap
        </a>
      </StaggerItem>
      {!game.verified ? (
        <p className="intel-game__warn">
          The two team pages disagree on this game or only one lists it, so no score is
          shown and it counts toward no split.
        </p>
      ) : null}
    </Stagger>
  );
}

function restLabel(game: TeamSeasonGame) {
  if (game.restDays === null)
    return game.gameNumber === 1 ? 'Season opener' : 'Unknown';
  if (game.restDays === 0) return 'Back-to-back';
  return `${game.restDays} day${game.restDays === 1 ? '' : 's'}`;
}

function fixed(value: number | null, digits: number) {
  return value === null ? '—' : value.toFixed(digits);
}

function extremeLabel(data: RecordedTeamSeasonResponse, numbers: readonly number[]) {
  if (!numbers.length) return 'none';
  const games = numbers.map((n) => data.games[n - 1]!);
  return `${signed(games[0]!.margin, 0)} (${games
    .map((g) => `${g.location === 'home' ? 'vs' : '@'} ${g.opponent.abbreviation}`)
    .join(', ')})`;
}
