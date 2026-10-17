import type { ArchiveRankingResponse } from '@nba-performance-explorer/contracts';
export function recordedRankingCsv(data: ArchiveRankingResponse) {
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${(typeof value === 'string' && /^[=+@\-\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const line = (values: (string | number)[]) => values.map(cell).join(',');
  return (
    [
      line([
        'Adapted historical Wikipedia data',
        'CC BY-SA4.0',
        'https://creativecommons.org/licenses/by-sa/4.0/',
      ]),
      line([
        'Scope',
        data.query.season,
        data.query.scope,
        data.query.position
          ? `Listed position family ${data.query.position}`
          : 'All listed positions',
        'Recorded cohort, not official/current NBA rankings',
      ]),
      line([
        'Snapshot assembled',
        data.snapshotCreatedAt,
        'Source fetched range',
        data.sourceFetchedFrom,
        data.sourceFetchedTo,
      ]),
      line([
        'Source attribution',
        'Wikipedia contributors; source revisions link to contributor history. Exact NBA-ID facts from Wikidata CC0.',
      ]),
      line([
        'Coverage',
        `Qualified cohort ${data.qualifiedPopulation}; missing-ID rows ${data.missingIdentityRows}; unsupported metric players ${data.missingMetricPlayers}; unknown-scope rows ${data.unknownScopeRows}`,
      ]),
      line([
        'Rank',
        'Player',
        'NBA ID',
        'Listed positions',
        'Source teams',
        'Recorded GP',
        data.query.metric,
        'Cohort percentile',
        'Source revisions',
      ]),
      ...data.rows.map((r) =>
        line([
          r.rank,
          r.name,
          r.playerId,
          (r.positions ?? []).join(';'),
          r.teams.map((t) => t.abbreviation).join(';'),
          r.gamesPlayed,
          r.value,
          r.percentile,
          r.sources.map((s) => s.url).join(';'),
        ]),
      ),
    ].join('\r\n') + '\r\n'
  );
}
