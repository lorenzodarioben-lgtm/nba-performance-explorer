import type { CohortQuery, CohortResponse } from '@nba-performance-explorer/contracts';

export function analyzeCohort(
  values: readonly { playerId: string; x: number; y: number }[],
  query: Pick<CohortQuery, 'x' | 'y' | 'weightX' | 'weightY' | 'minGames'>,
  excluded: CohortResponse['analysis']['excluded'] = [],
): CohortResponse['analysis'] {
  const sample = values.length;
  const mean = (key: 'x' | 'y') =>
    sample ? values.reduce((sum, r) => sum + r[key], 0) / sample : 0;
  const meanX = mean('x'),
    meanY = mean('y');
  const sd = (key: 'x' | 'y', m: number) =>
    sample
      ? Math.sqrt(values.reduce((sum, r) => sum + (r[key] - m) ** 2, 0) / sample)
      : 0;
  const sdX = sd('x', meanX),
    sdY = sd('y', meanY);
  const ranked = values
    .map((r) => {
      const zX = sdX ? (r.x - meanX) / sdX : 0,
        zY = sdY ? (r.y - meanY) / sdY : 0;
      return {
        ...r,
        zX,
        zY,
        score: Math.round((query.weightX * zX + query.weightY * zY) * 1e6) / 1e6,
      };
    })
    .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));
  let previous: number | undefined,
    rank = 0;
  const rows = ranked.map((r, i) => {
    if (previous !== r.score) rank = i + 1;
    previous = r.score;
    return { ...r, rank };
  });
  const correlation =
    sample >= 3 && sdX > 0 && sdY > 0
      ? Math.max(
          -1,
          Math.min(
            1,
            values.reduce((sum, r) => sum + (r.x - meanX) * (r.y - meanY), 0) /
              (sample * sdX * sdY),
          ),
        )
      : null;
  return {
    x: query.x,
    y: query.y,
    weightX: query.weightX,
    weightY: query.weightY,
    minGames: query.minGames,
    rows,
    excluded,
    sample,
    correlation,
  };
}
