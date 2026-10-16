import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueEraPlayersResponseSchema,
  LeagueErasResponseSchema,
  type LeagueEnvironment,
  type LeagueEraPlayersResponse,
  type LeagueErasResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './LeagueErasPage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'committed-snapshot' as const,
  servedAt: '2026-10-16T00:00:00.000Z',
  retrievedAt: '2026-10-15T20:00:00.000Z',
  sourceUpdatedAt: null,
  coverage: 'Fixture.',
  warnings: [],
};
const env = (
  season: string,
  points: number,
  pace: number | null,
  rebounds: number | null,
): LeagueEnvironment => ({
  season,
  teams: 30,
  teamGames: 2460,
  points,
  fieldGoalAttempts: 85,
  threePointAttempts: rebounds === null ? null : 20,
  freeThrowAttempts: 22,
  rebounds,
  assists: 23,
  turnovers: 14,
  fieldGoalPct: 0.46,
  threePointPct: 0.35,
  freeThrowPct: 0.76,
  effectiveFieldGoalPct: 0.5,
  trueShootingPct: 0.54,
  threePointRate: 0.2,
  freeThrowRate: 0.26,
  pace,
  offensiveRating: pace === null ? null : 106,
  per36: { points: 15, rebounds: 6, assists: 3, steals: 1, blocks: 0.7, threesMade: 1 },
});
const eras: LeagueErasResponse = {
  seasons: [
    env('1984-85', 110.8, null, null),
    env('1998-99', 91.6, 88.9, 42.1),
    env('2025-26', 115.6, 100.3, 44.1),
  ],
  model: 'League-relative index: 100 is exactly the league rate that season.',
  caveats: ['It does not rank players across eras.'],
  provenance,
};
const players: LeagueEraPlayersResponse = {
  minMinutes: 500,
  players: [
    {
      playerId: '893',
      name: 'Fixture Guard',
      mayPredateArchive: false,
      seasons: [
        {
          season: '1998-99',
          teams: ['CHI'],
          gamesPlayed: 50,
          minutes: 1900,
          raw: {
            points: 30.1,
            rebounds: 6,
            assists: 5,
            steals: 2,
            blocks: 0.5,
            threesMade: 0.5,
            trueShooting: 0.57,
          },
          index: {
            points: 190,
            rebounds: 92,
            assists: 140,
            steals: 170,
            blocks: 70,
            threesMade: 50,
            trueShooting: 108,
          },
          inSummary: true,
        },
      ],
      summary: {
        seasons: 1,
        minutes: 1900,
        raw: {
          points: 30.1,
          rebounds: 6,
          assists: 5,
          steals: 2,
          blocks: 0.5,
          threesMade: 0.5,
          trueShooting: 0.57,
        },
        index: {
          points: 190,
          rebounds: 92,
          assists: 140,
          steals: 170,
          blocks: 70,
          threesMade: 50,
          trueShooting: 108,
        },
      },
    },
  ],
  missing: [],
  model: eras.model,
  provenance,
};

describe('eras page', () => {
  it('uses contract-valid fixtures', () => {
    expect(LeagueErasResponseSchema.safeParse(eras).error?.issues ?? []).toEqual([]);
    expect(
      LeagueEraPlayersResponseSchema.safeParse(players).error?.issues ?? [],
    ).toEqual([]);
  });

  it('compares two seasons, shows gaps as unknown and toggles raw against era-adjusted', async () => {
    server.use(
      http.get('http://localhost/api/league/eras', () => HttpResponse.json(eras)),
      http.get('http://localhost/api/league/era-players', () =>
        HttpResponse.json(players),
      ),
    );
    renderApp('/history/eras?players=893&a=1984-85&b=2025-26');
    const compare = await screen.findByRole('group', { name: 'Season comparison' });
    const pace = within(compare).getByRole('row', { name: /^Pace/ });
    expect(pace).toHaveTextContent('—');
    expect(
      within(compare).getByRole('row', { name: /^Points per team game/ }),
    ).toHaveTextContent('+4.8');
    expect(screen.getByText(/100 is exactly the league rate/)).toBeInTheDocument();
    const summary = await screen.findByRole('group', {
      name: 'Era comparison summary',
    });
    expect(
      within(summary).getByRole('row', { name: /Fixture Guard/ }),
    ).toHaveTextContent('190');
    fireEvent.click(screen.getByRole('button', { name: 'Raw (per game)' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('group', { name: 'Era comparison summary' })).getByRole(
          'row',
          { name: /Fixture Guard/ },
        ),
      ).toHaveTextContent('30.1'),
    );
    expect(
      screen.getByRole('group', { name: 'Era comparison summary' }),
    ).toHaveTextContent('57.0%');
  });

  it('rejects malformed links', async () => {
    renderApp('/history/eras?players=abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});
