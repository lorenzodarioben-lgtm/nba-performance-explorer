import type {
  Distribution,
  RecordedAnalyticsResponse,
} from '@nba-performance-explorer/contracts';
export function distribution(values: readonly number[]): Distribution {
  if (values.length > 650 || values.some((v) => !Number.isFinite(v)))
    throw new Error('Invalid recorded distribution.');
  const sorted = [...values].sort((a, b) => a - b),
    n = values.length;
  if (!n)
    return {
      sample: 0,
      min: null,
      max: null,
      mean: null,
      standardDeviation: null,
      q25: null,
      median: null,
      q75: null,
      bins: [],
    };
  const min = sorted[0]!,
    max = sorted.at(-1)!,
    mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const quantile = (p: number) => {
    const index = (n - 1) * p,
      lo = Math.floor(index),
      fraction = index - lo;
    return sorted[lo]! + (sorted[Math.min(lo + 1, n - 1)]! - sorted[lo]!) * fraction;
  };
  const count = max === min ? 1 : Math.min(12, Math.max(1, Math.ceil(Math.sqrt(n)))),
    width = (max - min) / count;
  const bins = Array.from({ length: count }, (_, i) => ({
    from: min + i * width,
    to: i === count - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));
  for (const value of values)
    bins[max === min ? 0 : Math.min(count - 1, Math.floor((value - min) / width))]!
      .count++;
  return {
    sample: n,
    min,
    max,
    mean,
    standardDeviation: sd,
    q25: quantile(0.25),
    median: quantile(0.5),
    q75: quantile(0.75),
    bins,
  };
}
export function analyzeRecordedPairs(
  values: readonly {
    playerId: string;
    name: string;
    gamesPlayed: number;
    x: number;
    y: number;
  }[],
  weightX: number,
  weightY: number,
) {
  const x = distribution(values.map((r) => r.x)),
    y = distribution(values.map((r) => r.y));
  const percentile = (v: number, axis: 'x' | 'y') =>
    (100 *
      (values.filter((r) => r[axis] < v).length +
        values.filter((r) => r[axis] === v).length * 0.5)) /
    values.length;
  const ranked = values
    .map((r) => {
      const zX = x.standardDeviation ? (r.x - x.mean!) / x.standardDeviation : 0,
        zY = y.standardDeviation ? (r.y - y.mean!) / y.standardDeviation : 0;
      return {
        ...r,
        zX,
        zY,
        score: Math.round((weightX * zX + weightY * zY) * 1e6) / 1e6,
        xPercentile: percentile(r.x, 'x'),
        yPercentile: percentile(r.y, 'y'),
      };
    })
    .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));
  let previous: number | undefined,
    rank = 0;
  const rows: RecordedAnalyticsResponse['rows'] = ranked.map((r, i) => {
    if (previous !== r.score) rank = i + 1;
    previous = r.score;
    return { ...r, rank };
  });
  const correlation =
    values.length >= 3 && x.standardDeviation && y.standardDeviation
      ? Math.max(
          -1,
          Math.min(
            1,
            values.reduce((s, r) => s + (r.x - x.mean!) * (r.y - y.mean!), 0) /
              (values.length * x.standardDeviation * y.standardDeviation),
          ),
        )
      : null;
  return { rows, xDistribution: x, yDistribution: y, correlation };
}
