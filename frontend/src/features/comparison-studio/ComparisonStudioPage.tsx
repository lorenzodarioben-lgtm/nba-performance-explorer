import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  RecordedDirectorySchema,
  RecordedPlayerComparisonResponseSchema,
  ResearchPlayerIdSchema,
  ShotDirectorySchema,
  type RecordedPlayerComparisonResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SavedViews } from '../my-nba/SavedViews';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { springs } from '../../motion/tokens';
import { markerPath } from '../../charts/markers';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { GapBoard, type GapScale } from './GapBoard';
import { PlayerFinder } from './PlayerFinder';
import { METRIC_LABEL, PLAYER_STYLE } from './studio-style';

const StateSchema = z
  .object({
    players: z
      .string()
      .max(60)
      .transform((s) => s.split(',').filter(Boolean))
      .pipe(
        z
          .array(ResearchPlayerIdSchema)
          .max(4)
          .refine((a) => new Set(a).size === a.length),
      )
      .optional(),
    scale: z.enum(['percentile', 'raw']).optional(),
  })
  .strict();
const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'SAME COHORT', variant: 'derived' as const },
];
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

export function ComparisonStudioPage() {
  const [params, setParams] = useSearchParams();
  const state = StateSchema.safeParse(Object.fromEntries(params));
  const valid =
    state.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const ids = (valid && state.data.players) || [];
  const scale: GapScale = (valid && state.data.scale) || 'z';
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const comparison = useQuery({
    queryKey: ['research', 'recorded-player-comparison', ids.join(',')],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/player-comparison?players=${ids.join(',')}`,
        signal,
        RecordedPlayerComparisonResponseSchema.parse,
      ),
    enabled: valid && ids.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const setPlayers = (next: string[]) => {
    const copy = new URLSearchParams(params);
    if (next.length) copy.set('players', next.join(','));
    else copy.delete('players');
    setParams(copy);
  };
  const nameOf = (id: string) =>
    directory.data?.players.find((p) => p.playerId === id)?.name ?? `NBA player ${id}`;
  const data = comparison.data && ids.length >= 2 ? comparison.data : undefined;
  return (
    <ResearchShell
      title="Comparison studio"
      lede={
        <p>
          Two to four recorded 2023–24 seasons side by side, inside one stated cohort:
          where each player sits in every category, where the gaps are widest, and what
          the numbers do and do not support.
        </p>
      }
    >
      {!valid ? (
        <p role="alert">
          This comparison link is not supported.{' '}
          <Link to="/compare/recorded">Start again</Link>.
        </p>
      ) : null}
      <section className="cs-cast" aria-label="Players in the comparison">
        <AnimatePresence initial={false}>
          {ids.map((id, i) => (
            <CastChip
              key={id}
              index={i}
              name={nameOf(id)}
              teams={
                directory.data?.players
                  .find((p) => p.playerId === id)
                  ?.teams.map((t) => t.abbreviation) ?? []
              }
              first={i === 0}
              last={i === ids.length - 1}
              onMove={(d) => {
                const next = [...ids];
                [next[i], next[i + d]] = [next[i + d]!, next[i]!];
                setPlayers(next);
              }}
              onRemove={() => setPlayers(ids.filter((x) => x !== id))}
            />
          ))}
        </AnimatePresence>
        {ids.length < 4 ? (
          <PlayerFinder
            players={directory.data?.players ?? []}
            exclude={ids}
            onPick={(id) => setPlayers([...ids, id])}
          />
        ) : null}
      </section>
      {valid && ids.length < 2 ? (
        <p className="cs-empty">
          Add {2 - ids.length} more player{ids.length === 1 ? '' : 's'} to compare. Try{' '}
          <Link to="/compare/recorded?players=203999,203507,1628983">
            Jokić, Antetokounmpo and Gilgeous-Alexander
          </Link>{' '}
          or <Link to="/compare/recorded?players=201939,2544">Curry and James</Link>.
        </p>
      ) : (
        <QueryFeedback
          pending={comparison.isPending && ids.length >= 2}
          failed={comparison.isError}
        />
      )}
      {data ? (
        <Result
          data={data}
          scale={scale}
          onScale={(value) => {
            const copy = new URLSearchParams(params);
            if (value === 'z') copy.delete('scale');
            else copy.set('scale', value);
            setParams(copy, { replace: true });
          }}
          sharePath={`/compare/recorded?${params}`}
          updating={comparison.isPlaceholderData}
        />
      ) : null}
    </ResearchShell>
  );
}

function CastChip({
  index,
  name,
  teams,
  first,
  last,
  onMove,
  onRemove,
}: {
  index: number;
  name: string;
  teams: readonly string[];
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const allowed = useMotionAllowed();
  const style = PLAYER_STYLE[index]!;
  return (
    <motion.div
      layout={allowed ? 'position' : false}
      transition={springs.data}
      initial={allowed ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={allowed ? { opacity: 0, scale: 0.96 } : { opacity: 0 }}
      className="cs-chip"
      style={{ borderTopColor: style.color }}
    >
      <svg width="16" height="16" aria-hidden="true">
        <path d={markerPath(style.shape, 8, 8, 6)} fill={style.color} />
      </svg>
      <span className="cs-chip__name">
        {name}
        <small>{teams.join(' / ')}</small>
      </span>
      <span className="cs-chip__tools">
        <button
          type="button"
          className="reset cs-tool"
          disabled={first}
          aria-label={`Move ${name} earlier`}
          onClick={() => onMove(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="reset cs-tool"
          disabled={last}
          aria-label={`Move ${name} later`}
          onClick={() => onMove(1)}
        >
          →
        </button>
        <button
          type="button"
          className="reset cs-tool"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          ×
        </button>
      </span>
    </motion.div>
  );
}

function Result({
  data,
  scale,
  onScale,
  sharePath,
  updating,
}: {
  data: RecordedPlayerComparisonResponse;
  scale: GapScale;
  onScale: (value: GapScale) => void;
  sharePath: string;
  updating: boolean;
}) {
  const shots = useQuery({
    queryKey: ['research', 'shots', 'directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/shots/directory', signal, ShotDirectorySchema.parse),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const inShots = data.players.filter((p) =>
    shots.data?.players.some((s) => s.id === p.playerId),
  );
  const name = (i: number) =>
    data.players[i]!.name ?? `NBA player ${data.players[i]!.playerId}`;
  return (
    <div className="cs-result" data-updating={updating || undefined}>
      <section className="pmod" aria-labelledby="cs-board">
        <Slate
          id="cs-board"
          title="Where they differ"
          tapes={TAPES}
          meta={[
            `Cohort: ${data.population} players, ${data.minGames}+ games`,
            'Widest gap first',
          ]}
          actions={
            <Segmented
              label="Gap scale"
              options={[
                { value: 'z', label: 'Standardised' },
                { value: 'percentile', label: 'Percentile' },
                { value: 'raw', label: 'Raw' },
              ]}
              value={scale}
              onChange={onScale}
            />
          }
        />
        <ul className="cs-legend" aria-label="Legend">
          {data.players.map((p, i) => (
            <li key={p.playerId} className={p.qualified ? undefined : 'is-out'}>
              <svg width="14" height="14" aria-hidden="true">
                <path
                  d={markerPath(PLAYER_STYLE[i]!.shape, 7, 7, 5.5)}
                  fill={PLAYER_STYLE[i]!.color}
                />
              </svg>
              {name(i)}
              {p.qualified ? '' : ' (outside the cohort)'}
            </li>
          ))}
        </ul>
        <GapBoard data={data} scale={scale} />
      </section>

      <section className="pmod" aria-labelledby="cs-read">
        <Slate
          id="cs-read"
          title="What the numbers say"
          tapes={[TAPES[1]!]}
          meta={['Restates the values above; ranks no one overall']}
        />
        <ol className="cs-statements">
          {data.statements.map((s, i) => (
            <li key={i} className={`cs-statement cs-statement--${s.kind}`}>
              <span className="cs-statement__kind">{s.kind}</span>
              {s.text}
            </li>
          ))}
        </ol>
      </section>

      <section className="pmod" aria-labelledby="cs-table">
        <Slate
          id="cs-table"
          title="Exact values"
          tapes={[TAPES[0]!]}
          meta={['Per game, published']}
        />
        <ResearchTable label="Comparison exact values">
          <table>
            <caption>
              Values, cohort percentiles and z-scores; shooting from a single team row
              only
            </caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                {data.players.map((p, i) => (
                  <th key={p.playerId} scope="col">
                    {name(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((m, mi) => (
                <tr key={m}>
                  <th scope="row">{METRIC_LABEL[m]}</th>
                  {data.players.map((p) => (
                    <td key={p.playerId}>
                      {p.values[mi] === null
                        ? '—'
                        : `${p.values[mi]!.toFixed(1)} · ${Math.round(p.percentiles[mi]!)}th · z ${p.zScores[mi]!.toFixed(2)}`}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Games</th>
                {data.players.map((p) => (
                  <td key={p.playerId}>{p.gamesPlayed}</td>
                ))}
              </tr>
              {(['fieldGoal', 'threePoint', 'freeThrow'] as const).map((k) => (
                <tr key={k}>
                  <th scope="row">
                    {k === 'fieldGoal' ? 'FG%' : k === 'threePoint' ? '3P%' : 'FT%'}
                  </th>
                  {data.players.map((p) => (
                    <td key={p.playerId}>{p.shooting ? pct(p.shooting[k]) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ResearchTable>
        <p className="intel-game__links">
          {data.players.map((p, i) => (
            <Link key={p.playerId} to={`/players/${p.playerId}/archive`}>
              {name(i)}’s recorded season
            </Link>
          ))}
          {data.players.filter((p) => p.qualified).length >= 2 ? (
            <Link
              to={`/lab/profiles?players=${data.players
                .filter((p) => p.qualified)
                .map((p) => p.playerId)
                .join(',')}`}
            >
              Percentile profiles
            </Link>
          ) : null}
          {inShots.length >= 2 ? (
            <Link
              to={`/lab/shots?players=${inShots
                .slice(0, 2)
                .map((p) => p.playerId)
                .join(',')}`}
            >
              Their 2018 playoff shots
            </Link>
          ) : null}
        </p>
        <SavedViews
          path={sharePath}
          prefix="/compare/recorded"
          title="Saved comparisons"
          placeholder="e.g. 2023-24 MVP finalists"
        />
        <SourceNote provenance={data.provenance} />
      </section>
    </div>
  );
}
