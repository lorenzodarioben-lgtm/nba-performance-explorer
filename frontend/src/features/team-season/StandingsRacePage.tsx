import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  CanonicalTeamIdSchema,
  GameDateSchema,
  RecordedStandingsRaceResponseSchema,
  type RecordedStandingsRaceResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchShell, SourceNote } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { calendarLabel } from '../league/Scoreboard';
import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings, springs } from '../../motion/tokens';
import { linear, niceTicks } from '../../charts/scale';
import { useChartWidth } from '../../charts/useChartWidth';
import { Segmented } from '../../ui/Segmented';
import {
  dateIndex,
  raceSeries,
  standingsAt,
  type RaceRow,
  type RaceView,
} from './race-standings';
import { signed } from './team-season-format';

const StateSchema = z
  .object({
    conference: z.enum(['East', 'West']).optional(),
    team: CanonicalTeamIdSchema.optional(),
    date: GameDateSchema.optional(),
    view: z.enum(['gb', 'rank']).optional(),
  })
  .strict();

// 2023–24 postseason format (a league rule, not a source field): 1–6 direct, 7–10 play-in.
const PLAYOFF_CUT = 6;
const PLAY_IN_CUT = 10;
const STEP_MS = 110;

export function StandingsRacePage() {
  const [params, setParams] = useSearchParams();
  const state = StateSchema.safeParse(Object.fromEntries(params));
  const valid =
    state.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const conference = (valid && state.data.conference) || 'East';
  const query = useQuery({
    queryKey: ['research', 'recorded-standings-race', conference],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/standings-race?conference=${conference}`,
        signal,
        RecordedStandingsRaceResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace });
  };
  return (
    <ResearchShell
      title="The standings race"
      lede={
        <p>
          Replay the 2023–24 regular season one date at a time: each team&apos;s
          observed record, counted only from final scores both team pages agree on, with
          the ladder reordering as the season unfolds.
        </p>
      }
    >
      <nav className="intel-links" aria-label="Related standings">
        <Link to="/standings">Published final standings</Link>
        <Link to="/standings/recorded">Team rankings</Link>
      </nav>
      {!valid ? (
        <p role="alert">
          Invalid race view. <Link to="/standings/race">Reset the race</Link>.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {valid && query.data && query.data.conference === conference ? (
        <Race
          data={query.data}
          conference={conference}
          team={state.data.team ?? null}
          date={state.data.date ?? null}
          view={state.data.view ?? 'above'}
          onView={(value) => update({ view: value === 'above' ? null : value }, true)}
          onConference={(value) =>
            update({ conference: value === 'East' ? null : value, team: null })
          }
          onTeam={(value) => update({ team: value }, true)}
          onDate={(value) => update({ date: value }, true)}
          sharePath={`/standings/race${params.size ? `?${params}` : ''}`}
        />
      ) : null}
    </ResearchShell>
  );
}

function Race({
  data,
  conference,
  team,
  date,
  view,
  onView,
  onConference,
  onTeam,
  onDate,
  sharePath,
}: {
  data: RecordedStandingsRaceResponse;
  conference: 'East' | 'West';
  team: string | null;
  date: string | null;
  view: RaceView;
  onView: (value: RaceView) => void;
  onConference: (value: 'East' | 'West') => void;
  onTeam: (value: string | null) => void;
  onDate: (value: string | null) => void;
  sharePath: string;
}) {
  const last = data.dates.length - 1;
  const fromUrl = date ? dateIndex(data.dates, date) : last;
  const [index, setIndex] = useState(fromUrl < 0 ? 0 : fromUrl);
  const [playing, setPlaying] = useState(false);
  const allowed = useMotionAllowed();
  const sliderId = useId();

  // The URL follows the scrubber only when the reader stops (pausing or releasing it).
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= last) {
          setPlaying(false);
          return last;
        }
        return current + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, last]);
  useEffect(() => {
    if (!playing) onDate(index === last ? null : data.dates[index]!);
    // onDate is a fresh closure each render; the scrub position is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index]);

  const rows = useMemo(() => standingsAt(data.teams, index), [data.teams, index]);
  const highlighted = team && data.teams.some((t) => t.team.id === team) ? team : null;
  const currentDate = data.dates[index]!;
  return (
    <>
      <div className="pmod__controls race-controls">
        <Segmented
          label="Conference"
          options={[
            { value: 'East', label: 'East' },
            { value: 'West', label: 'West' },
          ]}
          value={conference}
          onChange={onConference}
        />
        <Segmented
          label="Race view"
          options={[
            { value: 'above', label: 'Above .500' },
            { value: 'gb', label: 'Games behind' },
            { value: 'rank', label: 'Ladder rank' },
          ]}
          value={view}
          onChange={onView}
        />
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => {
            if (!playing && index >= last) setIndex(0);
            setPlaying((p) => !p);
          }}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : index >= last ? 'Replay the season' : 'Play'}
        </button>
        <div className="race-scrub">
          <label htmlFor={sliderId} className="field-label">
            Race date
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={last}
            value={index}
            aria-valuetext={calendarLabel(currentDate)}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
          />
          <output className="race-scrub__date" htmlFor={sliderId}>
            {calendarLabel(currentDate)}
          </output>
        </div>
      </div>

      <div className="race">
        <RaceChart
          data={data}
          index={index}
          view={view}
          highlighted={highlighted}
          onTeam={onTeam}
          animate={allowed}
        />
        <RaceLadder
          rows={rows}
          conference={conference}
          date={currentDate}
          highlighted={highlighted}
          onTeam={onTeam}
          allowed={allowed}
        />
      </div>

      <p className="lchart__note">
        {view === 'above'
          ? 'Lines plot wins minus losses after each date with a verified game.'
          : view === 'gb'
            ? 'Lines plot games behind the observed leader on each date; the leader sits on the top line.'
            : 'Lines plot ladder position on each date; the solid rules mark 6th and 10th, the 2023–24 playoff and play-in cut-offs.'}{' '}
        Order uses observed win percentage, then wins; there are no official
        tiebreakers, and games behind is computed from the observed records. A dagger
        marks a team with quarantined games already on its schedule, which are not
        counted.
      </p>
      <SaveResearchButton
        kind="analysis"
        label={`${conference} standings race${highlighted ? ` · ${rows.find((r) => r.team.id === highlighted)?.team.abbreviation ?? ''}` : ''}`}
        path={sharePath}
      />
      <SourceNote provenance={data.provenance} />
      <p>
        Adapted from the recorded 2023–24 team pages on Wikipedia (
        {data.attributions.length} revisions, CC BY-SA 4.0), {data.reconciledGames}{' '}
        source-agreed finals; {data.quarantinedGameIds.length} game IDs quarantined
        league-wide. Conference alignment from{' '}
        <a href={data.conferenceSource.url} target="_blank" rel="noreferrer">
          {data.conferenceSource.title}, revision {data.conferenceSource.revision}
        </a>
        .
      </p>
    </>
  );
}

const PAD = { top: 16, right: 44, bottom: 28, left: 40 };

function RaceChart({
  data,
  index,
  view,
  highlighted,
  onTeam,
  animate,
}: {
  data: RecordedStandingsRaceResponse;
  index: number;
  view: RaceView;
  highlighted: string | null;
  onTeam: (team: string | null) => void;
  animate: boolean;
}) {
  const [measure, width] = useChartWidth(760);
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const height = width < 560 ? 320 : 520;
  const series = useMemo(() => {
    const values = raceSeries(data.teams, view, data.dates.length);
    return data.teams.map((t) => ({ team: t.team, values: values.get(t.team.id)! }));
  }, [data.teams, data.dates.length, view]);
  const all = series.flatMap((s) => s.values);
  // Above .500 rises upwards; games behind and rank put the leader at the top.
  const inverted = view !== 'above';
  const lo = view === 'above' ? Math.min(-5, ...all) : view === 'rank' ? 1 : 0;
  const hi =
    view === 'above' ? Math.max(5, ...all) : Math.max(view === 'rank' ? 2 : 1, ...all);
  const plotW = Math.max(60, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const count = data.dates.length;
  const x = (i: number) => PAD.left + (count <= 1 ? 0 : (i / (count - 1)) * plotW);
  const y = linear(
    [lo, hi],
    inverted ? [PAD.top, PAD.top + plotH] : [PAD.top + plotH, PAD.top],
  );
  const ticks =
    view === 'rank'
      ? [1, 6, 10, data.teams.length].filter((t, i, a) => t <= hi && a.indexOf(t) === i)
      : niceTicks(lo, hi, 5);
  const fmt = (v: number) =>
    view === 'above'
      ? signed(v, 0)
      : view === 'gb'
        ? v === 0
          ? '0'
          : v.toFixed(1)
        : `#${v}`;
  const focus = hover ?? highlighted;
  // One label per month, skipping a month whose first date would crowd the previous label.
  const months: { i: number; d: string }[] = [];
  data.dates.forEach((d, i) => {
    const previous = months.at(-1);
    if (previous && d.slice(5, 7) === previous.d.slice(5, 7)) return;
    if (previous && x(i) - x(previous.i) < 36) return;
    months.push({ i, d });
  });
  const path = (values: readonly number[]) =>
    values
      .slice(0, index + 1)
      .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join('');
  const ordered = [...series].sort(
    (a, b) => Number(a.team.id === focus) - Number(b.team.id === focus),
  );
  return (
    <div className="racechart" ref={measure}>
      <div ref={seenRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Wins minus losses for ${count} dates; the ladder beside it lists the standings on the chosen date.`}
          className="lchart__svg"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className={
                  (view === 'above' && tick === 0) ||
                  (view === 'rank' && (tick === 6 || tick === 10))
                    ? 'racechart__zero'
                    : 'ch-grid'
                }
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="ch-axis"
                x={PAD.left - 8}
                y={y(tick) + 3.5}
                textAnchor="end"
              >
                {fmt(tick)}
              </text>
            </g>
          ))}
          {months.map(({ i, d }) => (
            <text key={d} className="ch-axis" x={x(i)} y={height - 8}>
              {calendarLabel(d).slice(0, 3)}
            </text>
          ))}
          <line
            className="racechart__cursor"
            x1={x(index)}
            x2={x(index)}
            y1={PAD.top}
            y2={PAD.top + plotH}
          />
          {ordered.map(({ team, values }) => {
            const on = team.id === focus;
            const d = path(values);
            return (
              <g
                key={team.id}
                className={`racechart__team ${on ? 'is-on' : focus ? 'is-dim' : ''}`}
                onPointerEnter={() => setHover(team.id)}
                onPointerLeave={() => setHover(null)}
                onClick={() => onTeam(team.id === highlighted ? null : team.id)}
              >
                {/* One element for the life of the chart: the draw-in runs once, scrubbing
                    only changes its path data. */}
                <motion.path
                  d={d}
                  className="racechart__line"
                  initial={animate ? { pathLength: 0 } : false}
                  animate={{ pathLength: seen || !animate ? 1 : 0 }}
                  transition={{ duration: 1.4, ease: easings.arena }}
                />
                <path d={d} className="racechart__hit" />
                <circle
                  className="racechart__head"
                  cx={x(index)}
                  cy={y(values[index] ?? 0)}
                  r={on ? 4.5 : 2.5}
                />
                {on ? (
                  <text
                    className="racechart__label"
                    x={x(index) + 8}
                    y={y(values[index] ?? 0) + 4}
                  >
                    {team.abbreviation} {fmt(values[index] ?? 0)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function RaceLadder({
  rows,
  conference,
  date,
  highlighted,
  onTeam,
  allowed,
}: {
  rows: readonly RaceRow[];
  conference: string;
  date: string;
  highlighted: string | null;
  onTeam: (team: string | null) => void;
  allowed: boolean;
}) {
  return (
    <section
      className="ladder raceladder"
      aria-label={`${conference}ern Conference on ${calendarLabel(date)}`}
    >
      <h2 className="ladder__title">
        {conference}
        <span>Through {calendarLabel(date)}</span>
      </h2>
      <ol className="ladder__rows">
        {rows.map((row) => (
          <motion.li
            key={row.team.id}
            layout={allowed ? 'position' : false}
            transition={springs.data}
            className={`ladder__row raceladder__row ${row.rank === PLAYOFF_CUT ? 'is-cut-playoff' : row.rank === PLAY_IN_CUT ? 'is-cut-playin' : ''} ${row.team.id === highlighted ? 'is-picked' : ''}`}
          >
            <span className="ladder__rank">{row.rank}</span>
            <button
              type="button"
              className="reset raceladder__team"
              aria-pressed={row.team.id === highlighted}
              onClick={() => onTeam(row.team.id === highlighted ? null : row.team.id)}
            >
              <b>{row.team.abbreviation}</b>
              <span>{row.team.name}</span>
            </button>
            <span className="ladder__wl num">
              {row.wins}–{row.losses}
              {row.uncounted ? (
                <sup title={`${row.uncounted} quarantined game(s) not counted`}>†</sup>
              ) : null}
            </span>
            <span className="ladder__gbnum num">
              {row.gamesBehind === 0 ? '—' : row.gamesBehind.toFixed(1)}
            </span>
            <Link
              to={`/teams/${row.team.id}/season`}
              className="raceladder__go"
              aria-label={`${row.team.name} season`}
            >
              →
            </Link>
          </motion.li>
        ))}
      </ol>
      <p className="ladder__key">
        <span className="ladder__key-playoff">Top 6</span>
        <span className="ladder__key-playin">7–10</span>
        <span>Observed records · GB from observed records</span>
      </p>
    </section>
  );
}
