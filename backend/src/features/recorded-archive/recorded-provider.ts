import {
  RecordedCalendarResponseSchema,
  RecordedProgressionResponseSchema,
  type RecordedProgressionQuery,
  type RecordedCalendarQuery,
  type RecordedDiscoveryQuery,
  RecordedDatasetSchema,
  ArchiveRankingResponseSchema,
  type RecordedDataset,
  type ArchiveRankingQuery,
  type ArchiveRankingResponse,
  type TeamArchiveResponse,
  RecordedRecordsResponseSchema,
  type VerifiedRecordedGame,
  type RecordedRecordsResponse,
  RecordedDirectorySchema,
  HypotheticalGroupSchema,
  RecordedTeamComparisonSchema,
  type HypotheticalGroup,
  type RecordedTeamComparison,
  RecordedAnalyticsResponseSchema,
  type RecordedAnalyticsQuery,
} from '@nba-performance-explorer/contracts';
import { discoverRecorded } from './recorded-discovery.js';
import { observedProgression } from './recorded-progression.js';
import data from './recorded-snapshot.json' with { type: 'json' };
import { analyzeRecordedPairs } from './recorded-statistics.js';
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
  const frequencies = new Map<number, number>();
  for (const row of qualified)
    frequencies.set(row.value, (frequencies.get(row.value) ?? 0) + 1);
  let previous: number | undefined,
    rank = 0;
  const ranked = qualified.map((r, i) => {
    if (previous !== r.value) rank = i + 1;
    previous = r.value;
    const equal = frequencies.get(r.value)!,
      lower = qualified.length - (rank - 1) - equal;
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
  analytics(q: RecordedAnalyticsQuery) {
    const collect = (metric: RecordedAnalyticsQuery['x']) => {
      const base = {
        season: q.season,
        scope: q.scope,
        metric,
        minGames: q.minGames,
        page: 1,
        pageSize: 50,
      };
      const first = this.rank(base),
        rows = [...first.rows];
      for (let page = 2; (page - 1) * 50 < first.total; page++)
        rows.push(...this.rank({ ...base, page }).rows);
      return { first, rows };
    };
    const x = collect(q.x),
      y = collect(q.y),
      byId = new Map(y.rows.map((r) => [r.playerId, r]));
    const values = x.rows.flatMap((r) => {
      const other = byId.get(r.playerId);
      return other
        ? [
            {
              playerId: r.playerId,
              name: r.name,
              gamesPlayed: r.gamesPlayed,
              x: r.value,
              y: other.value,
            },
          ]
        : [];
    });
    return RecordedAnalyticsResponseSchema.parse({
      season: '2023-24',
      scope: q.scope,
      x: q.x,
      y: q.y,
      minGames: q.minGames,
      weightX: q.weightX,
      weightY: q.weightY,
      ...analyzeRecordedPairs(values, q.weightX, q.weightY),
      target: q.target ?? null,
      targetAvailable: !!q.target && values.some((r) => r.playerId === q.target),
      singleMetricQualifiedX: x.rows.length,
      singleMetricQualifiedY: y.rows.length,
      sourceRows: x.first.sourceRows,
      unknownScopeRows: x.first.unknownScopeRows,
      snapshotCreatedAt: this.dataset.createdAt,
      attributions: x.first.attributions,
      provenance: {
        ...x.first.provenance,
        coverage:
          'Recorded2023-24 jointly qualified supported-metric source cohort. Not complete/official/current league distributions.',
        warnings: [
          'Both metric values must be available after explicit GP/identity/trade qualification. Intersection is the common ranking/distribution denominator.',
          'Population z-scores use this common cohort; constant axes have z=0. Custom six-decimal scores define competition ties. Negative weights favor lower values.',
          'Quantiles use linear interpolation at (n-1)*p; histogram bins are equal-width, last bin includes maximum. Percentiles use midrank within common cohort.',
          'Correlation is descriptive, not causal; unavailable for fewer than3 pairs or constant axes. Missing/excluded targets are not plotted at0.',
        ],
      },
    });
  }
  directory() {
    const players = new Map<
      string,
      {
        playerId: string;
        name: string;
        teams: RecordedDataset['snapshots'][number]['team'][];
      }
    >();
    for (const t of this.dataset.snapshots)
      for (const p of [
        ...t.roster,
        ...t.statistics['regular-season'],
        ...t.statistics.playoffs,
        ...t.statistics['source-unspecified'],
      ]) {
        if (!p.nbaPlayerId) continue;
        const item = players.get(p.nbaPlayerId) ?? {
          playerId: p.nbaPlayerId,
          name: p.name,
          teams: [],
        };
        if (!item.teams.some((team) => team.id === t.team.id)) item.teams.push(t.team);
        players.set(p.nbaPlayerId, item);
      }
    return RecordedDirectorySchema.parse({
      season: '2023-24',
      teams: this.dataset.snapshots.map((s) => s.team),
      players: [...players.values()].sort(
        (a, b) => a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId),
      ),
      attributions: this.dataset.snapshots.map((s) => s.attribution),
      provenance: {
        source: 'wikipedia',
        servedAt: new Date().toISOString(),
        retrievedAt: null,
        asOf: null,
        isLive: false,
        scope: 'directory',
        coverage:
          'Recorded2023-24 identities with explicit CC0 NBA ID facts; source-listed team membership only, not a current roster.',
        warnings: [
          'Community-maintained recorded source; exact IDs rather than name guesses. No observed lineup possessions or current availability metadata.',
        ],
      },
    });
  }
  hypothetical(
    ids: readonly string[],
    scope: 'regular-season' | 'playoffs',
  ): HypotheticalGroup {
    const directory = this.directory();
    const members = ids.map((playerId) => {
      const identity = directory.players.find((p) => p.playerId === playerId);
      const entries = this.dataset.snapshots.flatMap((t) =>
        t.statistics[scope]
          .filter((p) => p.nbaPlayerId === playerId)
          .map((p) => ({ p, team: t.team, credit: t.attribution })),
      );
      const rows = entries.map((e) => e.p);
      return {
        playerId,
        name: identity?.name ?? null,
        status: !identity
          ? ('identity-unavailable' as const)
          : rows.length
            ? ('available' as const)
            : ('scope-records-unavailable' as const),
        teams: identity?.teams ?? [],
        gamesPlayed: rows.length ? rows.reduce((s, r) => s + r.gamesPlayed, 0) : null,
        pointsPerGame: rows.length ? metricValue(rows, 'pointsPerGame') : null,
        reboundsPerGame: rows.length ? metricValue(rows, 'reboundsPerGame') : null,
        assistsPerGame: rows.length ? metricValue(rows, 'assistsPerGame') : null,
        individualRecordedPoints: rows.length ? metricValue(rows, 'points') : null,
        sources: entries.map((e) => e.credit),
      };
    });
    return HypotheticalGroupSchema.parse({
      kind: 'hypothetical',
      season: '2023-24',
      scope,
      observedLineup: false,
      jointPerformance: null,
      members,
      availableMembers: members.filter((m) => m.status === 'available').length,
      sumOfIndividualRecordedPoints: members.every(
        (m) => m.individualRecordedPoints !== null,
      )
        ? members.reduce((s, m) => s + m.individualRecordedPoints!, 0)
        : null,
      provenance: {
        source: 'wikipedia',
        servedAt: new Date().toISOString(),
        retrievedAt: null,
        asOf: null,
        isLive: false,
        scope,
        coverage:
          'Hypothetical five identities; independent recorded2023-24 individual summaries only.',
        warnings: [
          'No joint games/minutes/possessions/on-off/ratings supplied or inferred, even if members share a source-listed team.',
          'Any sum is a sum of independent individual season counts across separate games, not performance together. Missing raw counts remain unavailable.',
          'Unknown scope/missing identities/unsupported trade metrics remain unavailable; no average-to-total multiplication.',
        ],
      },
    });
  }
  compareTeams(ids: readonly string[]): RecordedTeamComparison {
    const { verified, conflictingGameIds, unpairedGameIds } = this.reconcileGames();
    const rows = ids.map((id) => {
      const source = this.dataset.snapshots.find((t) => t.team.id === id)!;
      const games = verified.filter((g) => g.home.id === id || g.away.id === id);
      const own = (g: VerifiedRecordedGame) =>
          g.home.id === id ? g.homeScore : g.awayScore,
        opp = (g: VerifiedRecordedGame) =>
          g.home.id === id ? g.awayScore : g.homeScore;
      const wins = games.filter((g) => own(g) > opp(g)).length;
      const avg = (fn: (g: VerifiedRecordedGame) => number) =>
        games.length ? games.reduce((s, g) => s + fn(g), 0) / games.length : null;
      return {
        team: source.team,
        observedGames: games.length,
        wins,
        losses: games.length - wins,
        winPercentage: games.length ? wins / games.length : null,
        pointsPerGame: avg(own),
        opponentPointsPerGame: avg(opp),
        finalMarginPerGame: avg((g) => own(g) - opp(g)),
        source: source.attribution,
      };
    });
    return RecordedTeamComparisonSchema.parse({
      season: '2023-24',
      scope: 'regular-season',
      rows,
      headToHead: verified
        .filter((g) => ids.includes(g.home.id) && ids.includes(g.away.id))
        .sort((a, b) => a.date.localeCompare(b.date)),
      quarantinedGameIds: [...conflictingGameIds, ...unpairedGameIds],
      provenance: {
        source: 'wikipedia',
        servedAt: new Date().toISOString(),
        retrievedAt: null,
        asOf: null,
        isLive: false,
        scope: 'regular-season',
        coverage:
          'Equal2023-24 regular-season definitions; both-source-agreed game cohorts only. Observed GP can differ after quarantine.',
        warnings: [
          'W/L and scoring averages refer only to observed source-agreed games, not official complete-season standings. Sample counts retained.',
          'Final margin is not net rating; possession, shooting-attempt and in-game event metrics absent.',
          'Head-to-head games use actual source IDs and agreement on teams/date/final scores; conflicts are not corrected by guessing.',
        ],
      },
    });
  }
  private reconcileGames() {
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
    return { verified, conflictingGameIds, unpairedGameIds };
  }
  discovery(q: RecordedDiscoveryQuery) {
    return discoverRecorded(
      this.analytics({
        season: q.season,
        scope: q.scope,
        x: q.x,
        y: q.y,
        minGames: q.minGames,
        weightX: 1,
        weightY: 1,
        ...(q.target ? { target: q.target } : {}),
      }),
      q,
    );
  }
  calendar(q: RecordedCalendarQuery) {
    const { verified, conflictingGameIds, unpairedGameIds } = this.reconcileGames();
    return RecordedCalendarResponseSchema.parse({
      season: q.season,
      day: q.day,
      team: q.team ?? null,
      games: verified
        .filter(
          (g) =>
            g.date.slice(5) === q.day &&
            (!q.team || g.home.id === q.team || g.away.id === q.team),
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
      reconciledGames: verified.length,
      quarantinedGameIds: [...conflictingGameIds, ...unpairedGameIds],
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
          'Calendar lookup within recorded2023-24 regular-season source-agreed finals only. Not a complete all-time archive or daily/live scoreboard.',
        warnings: [
          'Month/day is a calendar label, not a converted UTC tipoff. Local today is resolved in browser and frozen in shared links.',
          'Globally quarantined conflicting/unpaired IDs do not enter these calendar matches.',
          'Source revisions/CC BY-SA4.0 attribution preserved; no missing scores or unknown games inferred.',
        ],
      },
    });
  }
  progression(q: RecordedProgressionQuery) {
    const { verified, conflictingGameIds, unpairedGameIds } = this.reconcileGames(),
      dates = verified.map((g) => g.date).sort(),
      from = q.from ?? (q.to && q.to < dates[0]! ? q.to : dates[0]!),
      to = q.to ?? (q.from && q.from > dates.at(-1)! ? q.from : dates.at(-1)!);
    return RecordedProgressionResponseSchema.parse({
      season: q.season,
      metric: q.metric,
      team: q.team ?? null,
      from,
      to,
      minDailyGames: q.minDailyGames,
      ...observedProgression(verified, q, from, to),
      reconciledGames: verified.length,
      quarantinedGameIds: [...conflictingGameIds, ...unpairedGameIds],
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
          'Calendar-date progression and daily means inside source-agreed2023-24 regular-season finals/window only. Not complete/all-time/live/possession/era-adjusted league records.',
        warnings: [
          'Within-day tipoff ordering is unknown: report highest value through each date and all tied games at that value, not an invented intra-day sequence.',
          'Record maxima reset at the selected window start. Conflicting/unpaired IDs are excluded globally.',
          'Missing dates/low daily sample retain raw game counts and null means; chart gaps are not connected.',
          'teamPoints without a team means the higher final team score in each game; finalMargin is absolute final-score difference, not largest in-game lead.',
        ],
      },
    });
  }
  records(query: {
    team?: string | undefined;
    metric: RecordedRecordsResponse['metric'];
  }): RecordedRecordsResponse {
    const { verified, conflictingGameIds, unpairedGameIds } = this.reconcileGames();
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
