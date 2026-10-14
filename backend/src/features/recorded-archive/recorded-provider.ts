import {
  RecordedDatasetSchema,
  ArchiveRankingResponseSchema,
  type RecordedDataset,
  type ArchiveRankingQuery,
  type ArchiveRankingResponse,
  type TeamArchiveResponse,
  RecordedRecordsResponseSchema,
  type VerifiedRecordedGame,
  type RecordedRecordsResponse,
} from '@nba-performance-explorer/contracts';
import data from './recorded-snapshot.json' with { type: 'json' };
type Participant = TeamArchiveResponse['statistics']['regular-season'][number];
function metricValue(
  rows: readonly Participant[],
  metric: ArchiveRankingQuery['metric'],
): number | null {
  const totalKeys = ['points', 'rebounds', 'assists', 'steals', 'blocks'] as const;
  if (totalKeys.includes(metric as (typeof totalKeys)[number]))
    return rows.every((r) => r.rawTotals !== null)
      ? rows.reduce((s, r) => s + r.rawTotals![metric as (typeof totalKeys)[number]], 0)
      : null;
  if (metric === 'gamesPlayed') return rows.reduce((s, r) => s + r.gamesPlayed, 0);
  if (rows.length === 1) return rows[0]![metric as keyof Participant] as number | null;
  // Combine traded rows only from actual count totals, never rounded per-game values.
  const rawKey = (
    {
      minutesPerGame: 'minutes',
      pointsPerGame: 'points',
      reboundsPerGame: 'rebounds',
      assistsPerGame: 'assists',
      stealsPerGame: 'steals',
      blocksPerGame: 'blocks',
    } as const
  )[metric as 'pointsPerGame'];
  const gp = rows.reduce((s, r) => s + r.gamesPlayed, 0);
  return rawKey && gp > 0 && rows.every((r) => r.rawTotals !== null)
    ? rows.reduce((s, r) => s + r.rawTotals![rawKey], 0) / gp
    : null;
}
export function rankRecordedDataset(
  dataset: RecordedDataset,
  q: ArchiveRankingQuery,
): ArchiveRankingResponse {
  const source = dataset.snapshots.flatMap((s) =>
    s.statistics[q.scope].map((p) => ({ p, team: s.team, credit: s.attribution })),
  );
  const identified = source.filter((r) => r.p.nbaPlayerId !== null);
  const grouped = new Map<string, typeof identified>();
  for (const row of identified) {
    const id = row.p.nbaPlayerId!;
    grouped.set(id, [...(grouped.get(id) ?? []), row]);
  }
  let missingMetricPlayers = 0,
    belowMinimumPlayers = 0;
  const qualified: Omit<
    ArchiveRankingResponse['rows'][number],
    'rank' | 'percentile'
  >[] = [];
  for (const [playerId, entries] of grouped) {
    if (new Set(entries.map((r) => r.team.id)).size !== entries.length)
      throw new Error('Duplicate archived player/team scope.');
    const rows = entries.map((r) => r.p),
      gamesPlayed = rows.reduce((s, r) => s + r.gamesPlayed, 0);
    if (gamesPlayed < q.minGames || gamesPlayed === 0) {
      belowMinimumPlayers++;
      continue;
    }
    const value = metricValue(rows, q.metric);
    if (value === null) {
      missingMetricPlayers++;
      continue;
    }
    qualified.push({
      playerId,
      name: entries[0]!.p.name,
      teams: entries.map((r) => r.team),
      gamesPlayed,
      value,
      sources: entries.map((r) => r.credit),
    });
  }
  qualified.sort((a, b) => b.value - a.value || a.playerId.localeCompare(b.playerId));
  let previous: number | undefined,
    rank = 0;
  const ranked = qualified.map((r, i) => {
    if (previous !== r.value) rank = i + 1;
    previous = r.value;
    const equal = qualified.filter((other) => other.value === r.value).length,
      lower = qualified.filter((other) => other.value < r.value).length;
    return { ...r, rank, percentile: ((lower + equal * 0.5) / qualified.length) * 100 };
  });
  const filtered = ranked.filter(
    (r) =>
      (!q.team || r.teams.some((t) => t.id === q.team)) &&
      (!q.search ||
        `${r.name} ${r.teams.map((t) => t.abbreviation).join(' ')}`
          .toLowerCase()
          .includes(q.search.toLowerCase())),
  );
  const times = dataset.snapshots.map((s) => s.retrievedAt).sort();
  return ArchiveRankingResponseSchema.parse({
    query: q,
    rows: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
    total: filtered.length,
    qualifiedPopulation: ranked.length,
    sourceRows: source.length,
    sourceTeams: dataset.snapshots.filter((s) => s.statistics[q.scope].length > 0)
      .length,
    missingIdentityRows: source.length - identified.length,
    missingMetricPlayers,
    belowMinimumPlayers,
    unknownScopeRows: dataset.snapshots.reduce(
      (s, t) => s + t.statistics['source-unspecified'].length,
      0,
    ),
    snapshotCreatedAt: dataset.createdAt,
    sourceFetchedFrom: times[0],
    sourceFetchedTo: times.at(-1),
    attributions: dataset.snapshots.map((s) => s.attribution),
    provenance: {
      source: 'wikipedia',
      servedAt: new Date().toISOString(),
      retrievedAt: null,
      asOf: null,
      isLive: false,
      scope: q.scope,
      coverage:
        'Explicit recorded2023-24 source cohort, not complete/current NBA league rankings. Static genuine licensed data, not fixtures or a live fallback.',
      warnings: [
        'Ranks and midrank percentiles describe only the qualified, identifiable, supported-metric snapshot cohort. Search/team filters do not recompute the ranking population.',
        'Unknown-scope, missing-ID, low-GP and unsupported trade/metric rows are excluded and counted. Raw counts are never reconstructed from rounded averages.',
        'Publication time unknown; source fetch range and dataset assembly time shown separately. No league qualification rules, era adjustment, possessions or shot locations inferred.',
      ],
    },
  });
}
export class RecordedArchiveProvider {
  readonly dataset = RecordedDatasetSchema.parse(data);
  rank(q: ArchiveRankingQuery) {
    return rankRecordedDataset(this.dataset, q);
  }
  records(query: {
    team?: string | undefined;
    metric: RecordedRecordsResponse['metric'];
  }): RecordedRecordsResponse {
    const pairs = new Map<
      string,
      {
        team: RecordedDataset['snapshots'][number]['team'];
        game: RecordedDataset['snapshots'][number]['results'][number];
        credit: RecordedDataset['snapshots'][number]['attribution'];
      }[]
    >();
    for (const t of this.dataset.snapshots)
      for (const game of t.results)
        pairs.set(game.sourceId, [
          ...(pairs.get(game.sourceId) ?? []),
          { team: t.team, game, credit: t.attribution },
        ]);
    const verified: VerifiedRecordedGame[] = [],
      conflictingGameIds: string[] = [],
      unpairedGameIds: string[] = [];
    for (const [id, rows] of pairs) {
      if (rows.length !== 2) {
        unpairedGameIds.push(`nba:${id}`);
        continue;
      }
      const [a, b] = rows as [(typeof rows)[number], (typeof rows)[number]];
      if (
        a.game.opponent.id !== b.team.id ||
        b.game.opponent.id !== a.team.id ||
        a.game.date !== b.game.date ||
        a.game.teamScore !== b.game.opponentScore ||
        b.game.teamScore !== a.game.opponentScore ||
        a.game.location === b.game.location
      ) {
        conflictingGameIds.push(`nba:${id}`);
        continue;
      }
      const home = a.game.location === 'home' ? a : b,
        away = a.game.location === 'away' ? a : b;
      verified.push({
        id: `nba:${id}`,
        date: a.game.date,
        home: home.team,
        away: away.team,
        homeScore: home.game.teamScore,
        awayScore: away.game.teamScore,
        recapUrl: home.game.recapUrl,
        sources: [home.credit, away.credit],
      });
    }
    const filtered = verified.filter(
      (g) => !query.team || g.home.id === query.team || g.away.id === query.team,
    );
    const valueOf = (g: VerifiedRecordedGame) =>
      query.metric === 'combinedPoints'
        ? g.homeScore + g.awayScore
        : query.metric === 'finalMargin'
          ? Math.abs(g.homeScore - g.awayScore)
          : query.team
            ? g.home.id === query.team
              ? g.homeScore
              : g.awayScore
            : Math.max(g.homeScore, g.awayScore);
    const value = filtered.length ? Math.max(...filtered.map(valueOf)) : null;
    return RecordedRecordsResponseSchema.parse({
      season: '2023-24',
      metric: query.metric,
      team: query.team ?? null,
      value,
      games: filtered
        .filter((g) => valueOf(g) === value)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
      matchingSourceGames: filtered.length,
      reconciledGames: verified.length,
      conflictingGameIds,
      unpairedGameIds,
      snapshotCreatedAt: this.dataset.createdAt,
      attributions: this.dataset.snapshots.map((s) => s.attribution),
      provenance: {
        source: 'wikipedia',
        servedAt: new Date().toISOString(),
        retrievedAt: null,
        asOf: null,
        isLive: false,
        scope: 'regular-season',
        coverage:
          'Recorded2023-24 regular-season games agreed by both source team pages only. Not all-time/official/live records.',
        warnings: [
          'Conflicting or unpaired source game IDs are quarantined, not corrected by guessing. All maximum ties are retained.',
          'Final margin is the difference in final scores, not the largest in-game lead. Quarter/PBP/shot data unavailable.',
          'Adapted recorded Wikipedia data under CC BY-SA4.0, with exact revisions and contributor links. Publication time unknown.',
        ],
      },
    });
  }
}
