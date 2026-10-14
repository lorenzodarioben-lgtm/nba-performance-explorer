import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { RecordedPlayerSeasonResponseSchema } from '@nba-performance-explorer/contracts';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { SIMILAR_SEASONS } from './recorded-player-season.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
const season = (player: string, minGames = 20) =>
  p.playerSeason({ season: '2023-24', player, minGames });

describe('recorded player season card', () => {
  it('agrees exactly with the percentile profiles for the same cohort', () => {
    const card = RecordedPlayerSeasonResponseSchema.parse(season('201939'));
    const profile = p.profiles({
      season: '2023-24',
      scope: 'regular-season',
      minGames: 20,
      metrics: [...card.metrics],
      players: ['201939'],
    });
    expect(card).toMatchObject({
      name: 'Stephen Curry',
      qualified: true,
      exclusion: null,
    });
    expect(card.population).toBe(profile.population);
    expect(card.categories).toEqual(profile.profiles[0]!.categories);
    expect(card.stints.map((s) => s.team.abbreviation)).toEqual(['GSW']);
  });

  it('lists the nearest seasons by equally weighted z-score distance, excluding the player', () => {
    const card = season('203999');
    expect(card.similar).toHaveLength(SIMILAR_SEASONS);
    expect(card.similar.some((s) => s.playerId === '203999')).toBe(false);
    for (const s of card.similar)
      expect(s.distance).toBeCloseTo(
        Math.sqrt(s.zDifferences.reduce((sum, d) => sum + d * d, 0)),
      );
    const distances = card.similar.map((s) => s.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    // The nearest season's own card lists a distance back to this player no smaller than its
    // nearest neighbour (distance is symmetric).
    const nearest = season(card.similar[0]!.playerId);
    const back = nearest.similar.find((s) => s.playerId === '203999');
    if (back) expect(back.distance).toBeCloseTo(card.similar[0]!.distance);
    expect(nearest.similar[0]!.distance).toBeLessThanOrEqual(card.similar[0]!.distance);
  });

  it('explains every way a player can sit outside the cohort', () => {
    expect(season('201939', 80)).toMatchObject({
      qualified: false,
      exclusion: 'Played 74 recorded games, below the 80-game minimum.',
      categories: [],
      similar: [],
    });
    const traded = season('1628384');
    expect(traded.qualified).toBe(false);
    expect(traded.exclusion).toMatch(/raw totals/);
    expect(traded.stints.map((s) => s.team.abbreviation).sort()).toEqual([
      'NYK',
      'TOR',
    ]);
    expect(season('999999999')).toMatchObject({
      name: null,
      stints: [],
      exclusion: 'No 2023-24 team page in the archive lists this NBA identity.',
    });
    // A traded player whose every row has raw totals stays in the cohort.
    expect(season('1627783').qualified).toBe(true);
  });

  it('serves the card with strict inputs', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get(
      '/api/recorded/player-season?player=2544&minGames=40',
    );
    expect(ok.status).toBe(200);
    expect(RecordedPlayerSeasonResponseSchema.parse(ok.body).name).toBe('LeBron James');
    for (const bad of [
      '',
      'player=abc',
      'player=2544&minGames=0',
      'player=2544&minGames=83',
      'player=2544&x=1',
      'player=2544&player=201939',
    ])
      expect(
        (await request(app).get(`/api/recorded/player-season?${bad}`)).status,
      ).toBe(400);
    expect(
      (await request(app).put('/api/recorded/player-season?player=2544')).status,
    ).toBe(405);
  });
});
