import type {
  ArchiveRankingResponse,
  ComparedPlayer,
  ProfileMetric,
  RecordedDataset,
  RecordedPlayerComparisonResponse,
} from '@nba-performance-explorer/contracts';
import { buildPlayerSeason } from './recorded-player-season.js';

type Column = {
  metric: ProfileMetric;
  rows: readonly ArchiveRankingResponse['rows'][number][];
};

const LABEL: Record<ProfileMetric, string> = {
  pointsPerGame: 'points per game',
  reboundsPerGame: 'rebounds per game',
  assistsPerGame: 'assists per game',
  stealsPerGame: 'steals per game',
  blocksPerGame: 'blocks per game',
  minutesPerGame: 'minutes per game',
};
/** Games-played gap (as a share of the larger sample) worth flagging. */
export const SAMPLE_GAP_SHARE = 0.2;

const one = (n: number) => n.toFixed(1);
const list = (names: readonly string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/**
 * Compares two to four players inside one cohort. Values, percentiles and z-scores come from the
 * same per-player computation as the player rooms; statements only restate those numbers.
 */
export function buildPlayerComparison(
  dataset: RecordedDataset,
  columns: readonly Column[],
  ids: readonly string[],
  minGames: number,
) {
  const metrics = columns.map((c) => c.metric);
  let population = 0;
  const players: ComparedPlayer[] = ids.map((id) => {
    const card = buildPlayerSeason(dataset, columns, id, minGames);
    population = card.population;
    const byMetric = new Map(card.categories.map((c) => [c.metric, c]));
    const single = card.stints.length === 1 ? card.stints[0]!.row : null;
    return {
      playerId: id,
      name: card.name,
      teams: card.stints.map((s) => s.team.abbreviation),
      gamesPlayed: card.stints.reduce((s, x) => s + x.row.gamesPlayed, 0),
      qualified: card.qualified,
      exclusion: card.exclusion,
      values: metrics.map((m) => byMetric.get(m)?.value ?? null),
      percentiles: metrics.map((m) => byMetric.get(m)?.percentile ?? null),
      zScores: metrics.map((m) => byMetric.get(m)?.zScore ?? null),
      shooting: single
        ? {
            fieldGoal: single.fieldGoalPercentage,
            threePoint: single.threePointPercentage,
            freeThrow: single.freeThrowPercentage,
          }
        : null,
    };
  });
  const name = (p: ComparedPlayer) => p.name ?? `NBA player ${p.playerId}`;
  const qualified = players.filter((p) => p.qualified);

  const gaps = metrics
    .map((metric, i) => {
      if (qualified.length < 2)
        return { metric, leaders: [] as string[], rawSpread: null, zSpread: null };
      const raw = qualified.map((p) => p.values[i]!);
      const z = qualified.map((p) => p.zScores[i]!);
      const top = Math.max(...raw);
      return {
        metric,
        leaders: qualified.filter((p) => p.values[i] === top).map((p) => p.playerId),
        rawSpread: top - Math.min(...raw),
        zSpread: Math.max(...z) - Math.min(...z),
      };
    })
    .sort(
      (a, b) =>
        (b.zSpread ?? -1) - (a.zSpread ?? -1) || a.metric.localeCompare(b.metric),
    );

  const statements: RecordedPlayerComparisonResponse['statements'] = [];
  const outside = players.filter((p) => !p.qualified);
  statements.push({
    kind: 'scope',
    text: `${qualified.length === players.length ? 'All' : `${qualified.length} of`} ${players.length} players are compared inside one cohort: recorded 2023-24 regular season, ${minGames}+ games, ${population} players.`,
  });
  for (const p of outside)
    statements.push({
      kind: 'missing',
      text: `${name(p)} is outside the cohort: ${p.exclusion} Published team rows are still shown; no cohort comparison is made for this player.`,
    });
  if (qualified.length >= 2) {
    for (const gap of [...gaps].sort(
      (a, b) => metrics.indexOf(a.metric) - metrics.indexOf(b.metric),
    )) {
      const i = metrics.indexOf(gap.metric);
      const leaders = qualified.filter((p) => gap.leaders.includes(p.playerId));
      const others = qualified.filter((p) => !gap.leaders.includes(p.playerId));
      statements.push({
        kind: 'leader',
        text:
          leaders.length === qualified.length
            ? `All are level in ${LABEL[gap.metric]} at ${one(qualified[0]!.values[i]!)}.`
            : `${list(leaders.map(name))} ${leaders.length > 1 ? 'share the lead' : 'leads'} in ${LABEL[gap.metric]}: ${one(leaders[0]!.values[i]!)} against ${list(others.map((p) => `${one(p.values[i]!)} (${name(p)})`))}.`,
      });
    }
    const widest = gaps[0]!;
    const closest = gaps.at(-1)!;
    if (widest.zSpread !== null && widest.zSpread > 0) {
      statements.push({
        kind: 'gap',
        text: `The widest gap is in ${LABEL[widest.metric]}: ${one(widest.zSpread)} standard deviations of the cohort separate the highest and lowest of these players (${one(widest.rawSpread!)} ${LABEL[widest.metric]}).`,
      });
      if (closest.metric !== widest.metric)
        statements.push({
          kind: 'gap',
          text: `They are closest in ${LABEL[closest.metric]}: ${one(closest.zSpread!)} standard deviations apart (${one(closest.rawSpread!)}).`,
        });
    }
  }
  const games = players.map((p) => p.gamesPlayed);
  const most = Math.max(...games);
  if (most > 0 && (most - Math.min(...games)) / most >= SAMPLE_GAP_SHARE)
    statements.push({
      kind: 'sample',
      text: `Samples differ: ${list(players.map((p) => `${name(p)} ${p.gamesPlayed} games`))}. Per-game values from fewer games are less settled.`,
    });
  for (const p of players)
    if (!p.shooting && p.teams.length > 1)
      statements.push({
        kind: 'missing',
        text: `Shooting percentages for ${name(p)} are unavailable: traded, and the source gives no combined attempts across ${list(p.teams)}.`,
      });
  return { population, metrics, players, gaps, statements };
}
