import type { DataProvenance, DataSource } from '@nba-performance-explorer/contracts';

export function researchProvenance(
  source: DataSource,
  coverage: string,
  warnings: string[] = [],
  now = new Date(),
): DataProvenance {
  return {
    source,
    servedAt: now.toISOString(),
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage,
    warnings: [
      ...(source === 'fixture'
        ? ['DEMO FIXTURES: deterministic local/test data, not NBA results.']
        : []),
      ...(source === 'unknown' ? ['Provider provenance was not configured.'] : []),
      'Upstream retrieval time is unavailable; served time does not indicate data freshness.',
      ...warnings,
    ],
  };
}
