import {
  CohortQuerySchema,
  ResearchPlayerIdSchema,
  type CohortResponse,
} from '@nba-performance-explorer/contracts';
export function readDiscoveryState(params: URLSearchParams) {
  const api = new URLSearchParams(params);
  api.delete('target');
  const parsed = CohortQuerySchema.safeParse(Object.fromEntries(api));
  const target = params.get('target');
  const invalid =
    !parsed.success ||
    [...params.keys()].some((k) => params.getAll(k).length !== 1) ||
    params.has('weightX') ||
    params.has('weightY') ||
    (parsed.success && parsed.data.x === parsed.data.y) ||
    (target !== null &&
      (!ResearchPlayerIdSchema.safeParse(target).success ||
        !parsed.success ||
        !parsed.data.players.split(',').includes(target)));
  return { valid: !invalid, api, parsed, target };
}
export function nearestWithinCohort(
  rows: CohortResponse['analysis']['rows'],
  target: string,
) {
  const reference = rows.find((r) => r.playerId === target);
  if (!reference) return [];
  if (
    rows.length > 4 ||
    new Set(rows.map((r) => r.playerId)).size !== rows.length ||
    rows.some((r) => ![r.zX, r.zY].every(Number.isFinite))
  )
    throw new Error('Invalid similarity cohort.');
  const distances = rows
    .filter((r) => r.playerId !== target)
    .map((r) => {
      const xSquared = (r.zX - reference.zX) ** 2,
        ySquared = (r.zY - reference.zY) ** 2;
      return {
        ...r,
        xSquared,
        ySquared,
        distance: Math.round(Math.sqrt(xSquared + ySquared) * 1e6) / 1e6,
      };
    })
    .sort((a, b) => a.distance - b.distance || a.playerId.localeCompare(b.playerId));
  let rank = 0,
    previous: number | undefined;
  return distances.map((r, i) => {
    if (previous !== r.distance) rank = i + 1;
    previous = r.distance;
    return { ...r, rank };
  });
}
