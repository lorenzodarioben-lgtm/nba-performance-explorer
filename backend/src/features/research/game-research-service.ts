import {
  PlayerGameLogResponseSchema,
  RawPlayerGameSchema,
  RAW_GAME_METRICS,
  type RawPlayerGame,
  type GameResearchQuery,
  type SeasonTotals,
} from '@nba-performance-explorer/contracts';
import { efficiencyMetrics } from './efficiency.js';

function metric(
  game: RawPlayerGame,
  key: (typeof RAW_GAME_METRICS)[number],
): number | null {
  return key === 'steals' || key === 'blocks' || key === 'turnovers'
    ? game.raw[key]
    : game.game[key];
}
export function rawGameSummary(
  games: RawPlayerGame[],
  playerId: string,
  season: string,
  minSample = 1,
) {
  const sum = (values: (number | null)[]) =>
    !values.length || values.some((n) => n === null)
      ? null
      : values.reduce<number>((total, n) => total + n!, 0);
  const base = { playerId, season, gamesPlayed: games.length };
  const totals: SeasonTotals = {
    ...base,
    ...Object.fromEntries(
      ['points', 'rebounds', 'assists', 'minutes'].map((key) => [
        key,
        sum(games.map((g) => g.game[key as 'points'])),
      ]),
    ),
    ...Object.fromEntries(
      [
        'fieldGoalsMade',
        'fieldGoalsAttempted',
        'threesMade',
        'threesAttempted',
        'freeThrowsMade',
        'freeThrowsAttempted',
        'turnovers',
      ].map((key) => [key, sum(games.map((g) => g.raw[key as 'fieldGoalsMade']))]),
    ),
  } as SeasonTotals;
  const wins = games.filter((g) => g.game.result === 'W').length;
  const qualified = games.length >= minSample;
  const derived = efficiencyMetrics(totals);
  return {
    qualified,
    minSample,
    sample: games.length,
    wins,
    losses: games.length - wins,
    totals,
    metrics: qualified
      ? derived
      : Object.fromEntries(Object.keys(derived).map((key) => [key, null])),
    perGame: Object.fromEntries(
      RAW_GAME_METRICS.map((key) => {
        const total = sum(games.map((g) => metric(g, key)));
        return [key, !qualified || total === null ? null : total / games.length];
      }),
    ),
  };
}
export function analyzeResearchGames(
  input: RawPlayerGame[],
  playerId: string,
  query: GameResearchQuery,
) {
  const observed = input
    .map((g) => RawPlayerGameSchema.parse(g))
    .sort((a, b) => b.game.date.localeCompare(a.game.date));
  if (observed.length > 150) throw new Error('Too many games.');
  PlayerGameLogResponseSchema.shape.games.parse(observed.map((g) => g.game));
  const filtered = observed.filter(
    ({ game: g }) =>
      (!query.from || g.date >= query.from) &&
      (!query.to || g.date <= query.to) &&
      (!query.opponent || g.opponent.abbreviation === query.opponent) &&
      (!query.location || g.location === query.location) &&
      (!query.result || g.result === query.result) &&
      (query.minPoints === undefined || g.points >= query.minPoints) &&
      (query.minRebounds === undefined || g.rebounds >= query.minRebounds) &&
      (query.minAssists === undefined || g.assists >= query.minAssists) &&
      (query.minMinutes === undefined || g.minutes >= query.minMinutes),
  );
  const summarize = (games: RawPlayerGame[]) =>
    rawGameSummary(games, playerId, query.season, query.minSample);
  const chronological = [...filtered].reverse();
  const sorted = [...filtered].sort((a, b) => {
    const av = query.sort === 'date' ? a.game.date : metric(a, query.sort);
    const bv = query.sort === 'date' ? b.game.date : metric(b, query.sort);
    if (av === null || bv === null)
      return av === bv ? b.game.date.localeCompare(a.game.date) : av === null ? 1 : -1;
    const delta =
      typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : Number(av) - Number(bv);
    return (
      (query.order === 'asc' ? delta : -delta) || b.game.date.localeCompare(a.game.date)
    );
  });
  const cohorts = [
    { label: 'Home', games: filtered.filter((g) => g.game.location === 'home') },
    { label: 'Away', games: filtered.filter((g) => g.game.location === 'away') },
    { label: 'Wins', games: filtered.filter((g) => g.game.result === 'W') },
    { label: 'Losses', games: filtered.filter((g) => g.game.result === 'L') },
    ...[...new Set(filtered.map((g) => g.game.opponent.abbreviation))]
      .sort()
      .map((abbr) => ({
        label: `Opponent ${abbr}`,
        games: filtered.filter((g) => g.game.opponent.abbreviation === abbr),
      })),
  ];
  return {
    observedGames: observed.length,
    filteredGames: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    window: query.window,
    games: sorted.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    summary: summarize(filtered),
    recent: summarize(filtered.slice(0, query.window)),
    splits: cohorts.map((c) => ({ label: c.label, summary: summarize(c.games) })),
    rolling: chronological.map((g, i) => ({
      gameId: g.game.id,
      date: g.game.date,
      summary: summarize(chronological.slice(Math.max(0, i + 1 - query.window), i + 1)),
    })),
    extrema: RAW_GAME_METRICS.map((key) => {
      const values = filtered.flatMap((g) =>
        metric(g, key) === null ? [] : [metric(g, key)!],
      );
      const high = values.length ? Math.max(...values) : null,
        low = values.length ? Math.min(...values) : null;
      return {
        metric: key,
        high,
        low,
        highGames:
          high === null
            ? []
            : filtered.filter((g) => metric(g, key) === high).map((g) => g.game),
        lowGames:
          low === null
            ? []
            : filtered.filter((g) => metric(g, key) === low).map((g) => g.game),
      };
    }),
  };
}
