import type {
  PlayoffSeries,
  SeriesAnalysis,
  SeriesGameAnalysis,
} from '@nba-performance-explorer/contracts';

type Pair = [number, number];
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'] as const;

/**
 * Everything the series film room derives, from the recorded final and period scores alone.
 * Numbers are from teams[0]'s side first. Only quarter totals exist, so nothing here describes a
 * run, a lead change inside a quarter or a possession.
 */
export function analyzeSeries(series: PlayoffSeries): SeriesAnalysis {
  const [a] = series.teams;
  const lastNumber = series.games.length;
  const games: SeriesGameAnalysis[] = series.games.map((entry) => {
    const g = entry.game;
    const aHome = g.home.id === a.id;
    const side = (home: number, away: number): Pair =>
      aHome ? [home, away] : [away, home];
    let running = 0;
    const periods = g.quarters.map((q) => {
      const points = side(q.home, q.away);
      running += points[0] - points[1];
      return { period: q.period, points, cumulativeMargin: running };
    });
    const [aFinal, bFinal] = side(g.homeScore, g.awayScore);
    const sum = (from: number, to: number): Pair =>
      periods
        .filter((p) => p.period >= from && p.period <= to)
        .reduce<Pair>((t, p) => [t[0] + p.points[0], t[1] + p.points[1]], [0, 0]);
    const afterThree = periods[2]!.cumulativeMargin;
    const margin = aFinal - bFinal;
    return {
      gameId: g.id,
      number: entry.number,
      margin,
      total: aFinal + bFinal,
      homeTeamId: g.home.id,
      winnerId: entry.winner.id,
      periods,
      halves: {
        first: sum(1, 2),
        second: sum(3, 4),
        overtime: periods.length > 4 ? sum(5, 8) : null,
      },
      wonFromBehindAfterThree:
        afterThree !== 0 && Math.sign(afterThree) !== Math.sign(margin),
      clinching: series.winner !== null && entry.number === lastNumber,
    };
  });
  const periodTotals = PERIODS.flatMap((label, i) => {
    const points = games.reduce<Pair>(
      (t, g) => {
        for (const p of g.periods)
          if (label === 'OT' ? p.period > 4 : p.period === i + 1) {
            t[0] += p.points[0];
            t[1] += p.points[1];
          }
        return t;
      },
      [0, 0],
    );
    // Overtime is listed only when a recorded game went beyond four quarters.
    return label === 'OT' && !games.some((g) => g.periods.length > 4)
      ? []
      : [{ period: label, points }];
  });
  const n = games.length;
  const totals = games.reduce<Pair>(
    (t, g) => {
      const aPts = (g.total + g.margin) / 2;
      return [t[0] + aPts, t[1] + (g.total - aPts)];
    },
    [0, 0],
  );
  const absolute = games.map((g) => Math.abs(g.margin));
  const closestMargin = Math.min(...absolute);
  const largestMargin = Math.max(...absolute);
  const largest = games.find((g) => Math.abs(g.margin) === largestMargin)!;
  const widest = periodTotals.reduce((best, p) =>
    Math.abs(p.points[0] - p.points[1]) > Math.abs(best.points[0] - best.points[1])
      ? p
      : best,
  );
  return {
    games,
    periodTotals,
    pointsPerGame: [totals[0] / n, totals[1] / n],
    averageMargin: games.reduce((s, g) => s + g.margin, 0) / n,
    averageTotal: games.reduce((s, g) => s + g.total, 0) / n,
    closest: {
      margin: closestMargin,
      gameIds: games
        .filter((g) => Math.abs(g.margin) === closestMargin)
        .map((g) => g.gameId),
    },
    largest: {
      margin: largestMargin,
      gameId: largest.gameId,
      winnerId: largest.winnerId,
    },
    widestPeriod: {
      period: widest.period,
      margin: widest.points[0] - widest.points[1],
    },
    comebacksAfterThree: games.filter((g) => g.wonFromBehindAfterThree).length,
  };
}

/** The series each team arrived from (by feeder), and the one the winner played next. */
export function seriesNeighbours(series: PlayoffSeries, all: readonly PlayoffSeries[]) {
  const previous: [string | null, string | null] = series.feeders ?? [null, null];
  const next =
    series.winner && series.round !== null
      ? (all.find(
          (s) =>
            s.round === series.round! + 1 &&
            s.teams.some((t) => t.id === series.winner!.id),
        )?.id ?? null)
      : null;
  return { previous, next };
}
