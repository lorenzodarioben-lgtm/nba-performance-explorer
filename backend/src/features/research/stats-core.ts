import {
  PlayerGameLogResponseSchema,
  type GameMetric,
  type GameSummaryStats,
  type InsightQuery,
  type PlayerGame,
} from '@nba-performance-explorer/contracts';

export const GAME_METRICS: readonly GameMetric[] = [
  'points',
  'rebounds',
  'assists',
  'minutes',
];

export function summarizeGames(games: readonly PlayerGame[]): GameSummaryStats {
  const sample = games.length;
  const average = (metric: GameMetric) =>
    sample ? games.reduce((sum, game) => sum + game[metric], 0) / sample : null;
  const wins = games.filter((g) => g.result === 'W').length;
  return {
    sample,
    points: average('points'),
    rebounds: average('rebounds'),
    assists: average('assists'),
    minutes: average('minutes'),
    wins,
    losses: sample - wins,
    winPercentage: sample ? wins / sample : null,
  };
}

export function analyzeGames(input: readonly PlayerGame[], query: InsightQuery) {
  // Reject duplicate IDs and contradictory dates instead of double counting a corrupt feed.
  const chronological = [...input].sort((a, b) => b.date.localeCompare(a.date));
  const observed = PlayerGameLogResponseSchema.shape.games.parse(chronological);
  if (observed.length > 150)
    throw new Error('Observed season exceeds the supported game bound.');
  const filtered = observed.filter(
    (game) =>
      (!query.from || game.date >= query.from) &&
      (!query.to || game.date <= query.to) &&
      (!query.opponent || game.opponent.abbreviation === query.opponent) &&
      (!query.location || game.location === query.location) &&
      (!query.result || game.result === query.result),
  );
  const recent = filtered.slice(0, query.window);
  const ascending = [...filtered].reverse();
  const rolling = ascending.map((game, index) => ({
    gameId: game.id,
    date: game.date,
    summary: summarizeGames(
      ascending.slice(Math.max(0, index + 1 - query.window), index + 1),
    ),
  }));
  const cohorts = [
    { label: 'Home', games: filtered.filter((g) => g.location === 'home') },
    { label: 'Away', games: filtered.filter((g) => g.location === 'away') },
    { label: 'Wins', games: filtered.filter((g) => g.result === 'W') },
    { label: 'Losses', games: filtered.filter((g) => g.result === 'L') },
    ...[...new Set(filtered.map((g) => g.opponent.abbreviation))]
      .sort()
      .map((abbr) => ({
        label: `Opponent ${abbr}`,
        games: filtered.filter((g) => g.opponent.abbreviation === abbr),
      })),
  ];
  const extrema =
    filtered.length === 0
      ? []
      : GAME_METRICS.map((metric) => {
          const high = Math.max(...filtered.map((g) => g[metric]));
          const low = Math.min(...filtered.map((g) => g[metric]));
          return {
            metric,
            high,
            low,
            highGames: filtered.filter((g) => g[metric] === high).map((g) => g.id),
            lowGames: filtered.filter((g) => g[metric] === low).map((g) => g.id),
          };
        });
  const sorted = [...filtered].sort((a, b) => {
    const primary =
      query.sort === 'date'
        ? a.date.localeCompare(b.date)
        : a[query.sort] - b[query.sort];
    return (
      (query.order === 'asc' ? primary : -primary) ||
      b.date.localeCompare(a.date) ||
      a.id.localeCompare(b.id)
    );
  });
  return {
    observedGames: observed.length,
    filteredGames: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    games: sorted.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    summary: summarizeGames(filtered),
    recent: summarizeGames(recent),
    window: query.window,
    rolling,
    splits: cohorts.map((c) => ({ label: c.label, summary: summarizeGames(c.games) })),
    extrema,
  };
}
