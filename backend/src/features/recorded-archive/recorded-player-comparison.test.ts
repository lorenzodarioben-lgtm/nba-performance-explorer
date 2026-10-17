import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { RecordedPlayerComparisonResponseSchema } from '@nba-performance-explorer/contracts';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
const compare = (players: string[], minGames = 20) =>
  p.playerComparison({ season: '2023-24', players, minGames });

describe('recorded player comparison', () => {
  it('uses exactly the player-room values and orders gaps by standardised spread', () => {
    const r = RecordedPlayerComparisonResponseSchema.parse(
      compare(['203999', '203507', '1628983']),
    );
    for (const player of r.players) {
      const card = p.playerSeason({
        season: '2023-24',
        player: player.playerId,
        minGames: 20,
      });
      expect(player.values).toEqual(
        r.metrics.map((m) => card.categories.find((c) => c.metric === m)!.value),
      );
      expect(player.zScores).toEqual(
        r.metrics.map((m) => card.categories.find((c) => c.metric === m)!.zScore),
      );
    }
    const spreads = r.gaps.map((g) => g.zSpread!);
    expect(spreads).toEqual([...spreads].sort((a, b) => b - a));
    const rebounds = r.gaps.find((g) => g.metric === 'reboundsPerGame')!;
    const i = r.metrics.indexOf('reboundsPerGame');
    const values = r.players.map((x) => x.values[i]!);
    expect(rebounds.rawSpread).toBeCloseTo(Math.max(...values) - Math.min(...values));
    expect(rebounds.leaders).toEqual(['203999']);
    expect(r.statements[0]).toMatchObject({ kind: 'scope' });
    expect(r.statements[0]!.text).toMatch(/^All 3 players .* 363 players\.$/);
    expect(
      r.statements.some(
        (s) =>
          s.kind === 'leader' &&
          /Nikola Jokić leads in rebounds per game: 12\.4/.test(s.text),
      ),
    ).toBe(true);
    expect(r.statements.find((s) => s.kind === 'gap')!.text).toMatch(
      /^The widest gap is in /,
    );
  });

  it('keeps players outside the cohort visible without comparing them', () => {
    const r = compare(['203999', '1628384']);
    const anunoby = r.players.find((x) => x.playerId === '1628384')!;
    expect(anunoby).toMatchObject({
      qualified: false,
      shooting: null,
      teams: ['NYK', 'TOR'],
    });
    expect(anunoby.values.every((v) => v === null)).toBe(true);
    // Only one qualified player: no leaders, gaps or gap statements are invented.
    expect(r.gaps.every((g) => g.leaders.length === 0 && g.zSpread === null)).toBe(
      true,
    );
    expect(
      r.statements.filter((s) => s.kind === 'leader' || s.kind === 'gap'),
    ).toHaveLength(0);
    expect(r.statements.map((s) => s.kind)).toEqual([
      'scope',
      'missing',
      'sample',
      'missing',
    ]);
    expect(r.statements[0]!.text).toMatch(/^1 of 2 players/);
  });

  it('flags sample sizes only when they differ by a fifth or more', () => {
    // Embiid 39 games against Jokić 79: flagged.
    const uneven = compare(['203954', '203999']);
    expect(uneven.statements.find((s) => s.kind === 'sample')!.text).toMatch(
      /Joel Embiid 39 games and Nikola Jokić 79 games/,
    );
    // Curry 74 against LeBron 71: within tolerance, no sample statement.
    const even = compare(['201939', '2544']);
    expect(even.statements.some((s) => s.kind === 'sample')).toBe(false);
  });

  it('validates the query strictly', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get(
      '/api/recorded/player-comparison?players=203999,201939',
    );
    expect(ok.status).toBe(200);
    expect(RecordedPlayerComparisonResponseSchema.parse(ok.body).players).toHaveLength(
      2,
    );
    for (const bad of [
      'players=203999',
      'players=203999,203999',
      'players=1,2,3,4,5',
      'players=203999,abc',
      'players=203999,201939&minGames=0',
      'players=203999,201939&extra=1',
      'players=203999,201939&players=2544,1',
    ])
      expect(
        (await request(app).get(`/api/recorded/player-comparison?${bad}`)).status,
        bad,
      ).toBe(400);
    expect(
      (await request(app).post('/api/recorded/player-comparison?players=203999,201939'))
        .status,
    ).toBe(405);
  });
});
