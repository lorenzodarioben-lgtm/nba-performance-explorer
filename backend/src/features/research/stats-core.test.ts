import { describe, expect, it } from 'vitest';
import {
  InsightQuerySchema,
  type PlayerGame,
} from '@nba-performance-explorer/contracts';

import { analyzeGames, summarizeGames } from './stats-core.js';

const game = (
  id: string,
  date: string,
  points: number,
  location: 'home' | 'away' = 'home',
  result: 'W' | 'L' = 'W',
): PlayerGame => ({
  id,
  date,
  points,
  location,
  result,
  team: { abbreviation: 'LAL' },
  opponent: { abbreviation: 'BOS' },
  minutes: 30,
  rebounds: 6,
  assists: 3,
});
const games = [
  game('a', '2024-01-01', 10),
  game('b', '2024-01-02', 20, 'away', 'L'),
  game('c', '2024-01-03', 30),
  game('d', '2024-01-04', 30, 'away'),
];

describe('observed-game analysis', () => {
  it('reports empty values as null, preserving recorded zero', () => {
    expect(summarizeGames([])).toMatchObject({
      sample: 0,
      points: null,
      winPercentage: null,
    });
    expect(summarizeGames([game('a', '2024-01-01', 0)]).points).toBe(0);
  });
  it('calculates hand-checked cohort averages and win ratio', () => {
    expect(summarizeGames(games)).toMatchObject({
      sample: 4,
      points: 22.5,
      wins: 3,
      losses: 1,
      winPercentage: 0.75,
    });
  });
  it('sorts chronological windows without mutating input', () => {
    const copy = [...games];
    const result = analyzeGames(games, InsightQuerySchema.parse({ window: '2' }));
    expect(result.recent.points).toBe(30);
    expect(result.rolling.map((r) => r.summary.points)).toEqual([10, 15, 25, 30]);
    expect(result.rolling.map((r) => r.summary.sample)).toEqual([1, 2, 2, 2]);
    expect(games).toEqual(copy);
  });
  it('labels partial windows with their actual sample', () => {
    const result = analyzeGames(
      games.slice(0, 1),
      InsightQuerySchema.parse({ window: '20' }),
    );
    expect(result.recent.sample).toBe(1);
    expect(result.extrema[0]).toMatchObject({ high: 10, low: 10 });
  });
  it('computes home/away, W/L and opponent cohorts', () => {
    const result = analyzeGames(games, InsightQuerySchema.parse({}));
    expect(result.splits.find((s) => s.label === 'Home')?.summary.points).toBe(20);
    expect(result.splits.find((s) => s.label === 'Away')?.summary.points).toBe(25);
    expect(result.splits.find((s) => s.label === 'Losses')?.summary.points).toBe(20);
    expect(result.splits.find((s) => s.label === 'Opponent BOS')?.summary.sample).toBe(
      4,
    );
  });
  it('applies inclusive date/opponent/location/result filters before all calculations', () => {
    const result = analyzeGames(
      games,
      InsightQuerySchema.parse({
        from: '2024-01-02',
        to: '2024-01-04',
        opponent: 'BOS',
        location: 'away',
        result: 'W',
      }),
    );
    expect(result.filteredGames).toBe(1);
    expect(result.games[0]?.id).toBe('d');
    expect(result.summary.points).toBe(30);
  });
  it('orders numeric values correctly and paginates only the ledger', () => {
    const result = analyzeGames(
      games,
      InsightQuerySchema.parse({
        sort: 'points',
        order: 'asc',
        page: '2',
        pageSize: '2',
      }),
    );
    expect(result.games.map((g) => g.id)).toEqual(['d', 'c']);
    expect(result.filteredGames).toBe(4);
    expect(result.summary.points).toBe(22.5);
  });
  it('retains all ties in observed extrema', () => {
    const result = analyzeGames(games, InsightQuerySchema.parse({}));
    expect(result.extrema[0]).toMatchObject({
      high: 30,
      low: 10,
      highGames: ['d', 'c'],
      lowGames: ['a'],
    });
  });
  it('keeps empty cohorts distinct from missing source games', () => {
    const result = analyzeGames(games, InsightQuerySchema.parse({ opponent: 'DEN' }));
    expect(result.observedGames).toBe(4);
    expect(result.filteredGames).toBe(0);
    expect(result.summary.points).toBeNull();
    expect(result.extrema).toEqual([]);
  });
  it('rejects duplicate identifiers and same-date contradictory games', () => {
    expect(() =>
      analyzeGames([...games, games[0]!], InsightQuerySchema.parse({})),
    ).toThrow();
    expect(() =>
      analyzeGames(
        [game('a', '2024-01-01', 10), game('b', '2024-01-01', 20)],
        InsightQuerySchema.parse({}),
      ),
    ).toThrow();
  });
  it('handles traded teams without conflating opponent or location', () => {
    const traded = { ...games[1]!, team: { abbreviation: 'DAL' } };
    const result = analyzeGames([games[0]!, traded], InsightQuerySchema.parse({}));
    expect(result.observedGames).toBe(2);
    expect(result.summary.points).toBe(15);
  });
  it.each([
    { window: '0' },
    { pageSize: '999' },
    { from: '2024-02-30' },
    { from: '2024-03-01', to: '2024-02-01' },
    { season: '2023-25' },
    { window: ['5', '10'] },
    { sort: 'usage' },
    { unexpected: 'yes' },
  ])('rejects invalid query %j', (query) => {
    expect(InsightQuerySchema.safeParse(query).success).toBe(false);
  });
});
