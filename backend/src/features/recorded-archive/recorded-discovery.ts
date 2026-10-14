import {
  RecordedDiscoveryResponseSchema,
  type RecordedAnalyticsResponse,
  type RecordedDiscoveryQuery,
} from '@nba-performance-explorer/contracts';
export function discoverRecorded(
  data: RecordedAnalyticsResponse,
  q: RecordedDiscoveryQuery,
) {
  const target = data.rows.find((r) => r.playerId === q.target),
    base = (r: RecordedAnalyticsResponse['rows'][number]) => ({
      playerId: r.playerId,
      name: r.name,
      gamesPlayed: r.gamesPlayed,
      x: r.x,
      y: r.y,
      zX: r.zX,
      zY: r.zY,
    });
  const rows =
    q.mode === 'neighbors'
      ? target
        ? data.rows
            .filter((r) => r.playerId !== target.playerId)
            .map((r) => {
              const xSquaredDifference = (r.zX - target.zX) ** 2,
                ySquaredDifference = (r.zY - target.zY) ** 2;
              return {
                ...base(r),
                distance:
                  Math.round(Math.sqrt(xSquaredDifference + ySquaredDifference) * 1e6) /
                  1e6,
                xSquaredDifference,
                ySquaredDifference,
              };
            })
            .sort(
              (a, b) => a.distance - b.distance || a.playerId.localeCompare(b.playerId),
            )
        : []
      : data.rows
          .filter((r) => r.x <= q.maxX && r.y >= q.minY)
          .map((r) => ({
            ...base(r),
            distance: null,
            xSquaredDifference: null,
            ySquaredDifference: null,
          }))
          .sort(
            (a, b) => b.y - a.y || a.x - b.x || a.playerId.localeCompare(b.playerId),
          );
  let rank = 0,
    previous: string | undefined;
  const ranked = rows.map((r, i) => {
    const key = q.mode === 'neighbors' ? String(r.distance) : `${r.y}:${r.x}`;
    if (key !== previous) rank = i + 1;
    previous = key;
    return { ...r, rank };
  });
  return RecordedDiscoveryResponseSchema.parse({
    season: data.season,
    scope: data.scope,
    mode: q.mode,
    x: data.x,
    y: data.y,
    minGames: data.minGames,
    maxX: q.maxX,
    minY: q.minY,
    limit: q.limit,
    target: q.target ?? null,
    targetAvailable: !!target,
    targetRow: target ? base(target) : null,
    rows: ranked.slice(0, q.limit),
    totalMatches: ranked.length,
    eligiblePool: data.rows
      .map((r) => ({ playerId: r.playerId, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    xDistribution: data.xDistribution,
    yDistribution: data.yDistribution,
    sourceRows: data.sourceRows,
    unknownScopeRows: data.unknownScopeRows,
    snapshotCreatedAt: data.snapshotCreatedAt,
    attributions: data.attributions,
    provenance: {
      ...data.provenance,
      coverage:
        'Recorded2023-24 common qualified source cohort only. Transparent two-axis similarity or exact threshold queries; no league-wide/era/player-quality claim.',
      warnings: [
        'Both metrics must be available after explicit GP/identity/trade qualification; missing metrics and unknown scope are excluded without imputation.',
        'Population z-scores use the same common cohort, with constant-axis z=0. No era normalization or player-quality score.',
        'Similarity uses equal-weight Euclidean standardized axes; thresholds use raw units and retain the same qualification denominator.',
      ],
    },
  });
}
