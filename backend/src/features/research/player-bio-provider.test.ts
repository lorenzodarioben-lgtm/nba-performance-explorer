import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';
import { providerUnavailable } from '../players/provider-error.js';
import { mapBirthDate, NbaPlayerBioProvider } from './player-bio-provider.js';
import { analyzeCareer } from './career-service.js';
import type { SeasonTotals } from '@nba-performance-explorer/contracts';
const envelope = (rows: unknown[][]) => ({
  resultSets: [
    { name: 'CommonPlayerInfo', headers: ['PERSON_ID', 'BIRTHDATE'], rowSet: rows },
  ],
});
const totals: SeasonTotals = {
  playerId: '2544',
  season: '2023-24',
  gamesPlayed: 40,
  minutes: 1200,
  points: 800,
  rebounds: 200,
  assists: 160,
  turnovers: 80,
  fieldGoalsMade: 300,
  fieldGoalsAttempted: 600,
  threesMade: 100,
  threesAttempted: 240,
  freeThrowsMade: 100,
  freeThrowsAttempted: 120,
};
describe('sourced age and team timeline', () => {
  it('validates actual identity and birth date without draft/locale inference', () => {
    expect(mapBirthDate(envelope([[2544, '2000-02-29T00:00:00']]), '2544')).toBe(
      '2000-02-29',
    );
    expect(mapBirthDate(envelope([[2544, null]]), '2544')).toBeNull();
    expect(mapBirthDate(envelope([]), '2544')).toBeNull();
    for (const rows of [
      [[1, '2000-02-29T00:00:00']],
      [[2544, '2001-02-29T00:00:00']],
      [[2544, '2000-02-29']],
      [
        [2544, '2000-02-29T00:00:00'],
        [2544, null],
      ],
    ])
      expect(() => mapBirthDate(envelope(rows), '2544')).toThrow();
  });
  it('calculates completed age on an explicit reference date around birthday boundaries', () => {
    const age = (birthDate: string) =>
      analyzeCareer([totals], '2544', 'pointsPerGame', 20, { birthDate }).seasons[0]
        ?.ageOnOctober1;
    expect(age('2000-10-01')).toBe(23);
    expect(age('2000-10-02')).toBe(22);
    expect(age('2000-02-29')).toBe(23);
    expect(
      analyzeCareer([totals], '2544', 'pointsPerGame', 20).seasons[0]?.ageOnOctober1,
    ).toBeNull();
    expect(age('2024-01-01')).toBeNull();
    expect(() => age('2000-02-30')).toThrow();
  });
  it('preserves distinct team stints, rejects unknown seasons/duplicates, keeps aggregate once', () => {
    const stints = [
      {
        season: '2023-24',
        teamId: 'nba:1610612747',
        abbreviation: 'LAL',
        gamesPlayed: 20,
      },
      {
        season: '2023-24',
        teamId: 'nba:1610612742',
        abbreviation: 'DAL',
        gamesPlayed: 20,
      },
    ];
    const result = analyzeCareer([totals], '2544', 'pointsPerGame', 20, { stints });
    expect(result.seasons[0]?.teams).toHaveLength(2);
    expect(result.aggregate?.gamesPlayed).toBe(40);
    expect(() =>
      analyzeCareer([totals], '2544', 'pointsPerGame', 20, {
        stints: [stints[0]!, stints[0]!],
      }),
    ).toThrow();
    expect(() =>
      analyzeCareer([totals], '2544', 'pointsPerGame', 20, {
        stints: [{ ...stints[0]!, season: '2022-23' }],
      }),
    ).toThrow();
  });
  it('deduplicates cached birth data, rejects future dates and never caches failure', async () => {
    const client = {
      fetchEndpoint: vi
        .fn()
        .mockResolvedValueOnce(envelope([[2544, '2099-01-01T00:00:00']]))
        .mockResolvedValue(envelope([[2544, '2000-02-29T00:00:00']])),
    };
    const provider = new NbaPlayerBioProvider(
      client,
      () => new Date('2026-10-13T20:00:00.000Z'),
    );
    await expect(provider.getBirthDate('2544')).rejects.toThrow();
    const rows = await Promise.all([
      provider.getBirthDate('2544'),
      provider.getBirthDate('2544'),
    ]);
    expect(rows[0]?.birthDate).toBe('2000-02-29');
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(2);
  });
  it('isolates unavailable birth data from career raw totals and exposes verified timestamps when available', async () => {
    const getBirthDate = vi
      .fn()
      .mockRejectedValueOnce(providerUnavailable())
      .mockResolvedValue({
        birthDate: '2000-10-02',
        retrievedAt: '2026-10-13T20:00:00.000Z',
      });
    const app = createApp(fixturePlayerProvider, {
      bioProvider: { getBirthDate },
      totalsProvider: {
        getSeasonTotals: vi.fn(),
        getCareerTotals: vi.fn().mockResolvedValue({
          records: [totals],
          retrievedAt: '2026-10-13T19:00:00.000Z',
        }),
      },
    });
    const first = await request(app).get('/api/players/2544/career');
    expect(first.status).toBe(200);
    expect(first.body.birthDate).toBeNull();
    expect(first.body.aggregate.points).toBe(800);
    const next = await request(app).get('/api/players/2544/career');
    expect(next.body.seasons[0].ageOnOctober1).toBe(22);
    expect(next.body.birthDateRetrievedAt).toBe('2026-10-13T20:00:00.000Z');
  });
});
