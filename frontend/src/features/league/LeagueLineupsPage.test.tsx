import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueLineupsResponseSchema,
  LeagueSeasonsResponseSchema,
  type LeagueLineupsResponse,
  type LeagueSeasonsResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './LeagueLineupsPage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'live' as const,
  servedAt: '2026-10-16T00:00:00.000Z',
  retrievedAt: '2026-10-15T20:00:00.000Z',
  sourceUpdatedAt: null,
  coverage: 'Fixture.',
  warnings: [],
};
const seasons: LeagueSeasonsResponse = {
  seasons: ['2005-06', '2023-24'].map((season) => ({
    season,
    status: 'complete' as const,
    notes: [],
    teams: 30,
    regularSeasonGames: 1230,
    playoffGames: 80,
    incompleteBoxScores: 0,
    quarantinedGames: 0,
    firstDate: `${season.slice(0, 4)}-10-20`,
    lastDate: `${Number(season.slice(0, 4)) + 1}-06-15`,
    retrievedAt: '2026-10-15T20:00:00.000Z',
    capabilities: {
      teamResults: true,
      playerStats: true,
      teamRatings: true,
      playerPossessions: true,
      publishedStandings: true,
    },
  })),
  provenance,
};
const ratings = (
  minutes: number,
  possessions: number,
  offRating: number | null,
  defRating: number | null,
) => ({
  minutes,
  possessions,
  offRating,
  defRating,
  netRating:
    offRating === null || defRating === null
      ? null
      : Math.round((offRating - defRating) * 10) / 10,
});
const player = (playerId: string, name: string) => ({ playerId, name });
const lineups: LeagueLineupsResponse = {
  season: '2023-24',
  team: { id: 'nba:1610612738', abbreviation: 'BOS', name: 'Boston Celtics' },
  minMinutes: 50,
  totalLineups: 391,
  lineups: [
    {
      id: '-1-2-3-4-5-',
      players: [
        player('1', 'Ann Alpha'),
        player('2', 'Ben Beta'),
        player('3', 'Cy Gamma'),
        player('4', 'Di Delta'),
        player('5', 'Ed Epsilon'),
      ],
      gamesPlayed: 37,
      pace: 101.3,
      ratings: ratings(623, 1317, 120.3, 109.4),
    },
    {
      id: '-1-2-3-4-6-',
      players: [
        player('1', 'Ann Alpha'),
        player('2', 'Ben Beta'),
        player('3', 'Cy Gamma'),
        player('4', 'Di Delta'),
        player('6', 'Fay Zeta'),
      ],
      gamesPlayed: 22,
      pace: null,
      ratings: ratings(96, 188, 126.6, null),
    },
  ],
  onOff: [
    {
      playerId: '1',
      name: 'Ann Alpha',
      on: ratings(2300, 4800, 122.1, 110.9),
      off: ratings(1600, 3300, 118.0, 105.6),
      netDifference: -1.2,
    },
  ],
  definitions: ['Net rating is the difference.'],
  provenance,
};

describe('NBA.com lineups page', () => {
  it('uses contract-valid fixtures', () => {
    expect(LeagueSeasonsResponseSchema.safeParse(seasons).error?.issues ?? []).toEqual(
      [],
    );
    expect(LeagueLineupsResponseSchema.safeParse(lineups).error?.issues ?? []).toEqual(
      [],
    );
  });

  it('lists lineups with their samples, compares two and shows on/off splits', async () => {
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/league/seasons', () => HttpResponse.json(seasons)),
      http.get('http://localhost/api/league/lineups', ({ request }) => {
        requests.push(new URL(request.url).search);
        return HttpResponse.json(lineups);
      }),
    );
    renderApp('/lab/lineups/nba?season=2023-24&team=nba:1610612738');
    const table = await screen.findByRole('group', { name: 'Lineups' });
    expect(table).toHaveTextContent('2 of 391 lineups with at least 50 minutes');
    const first = within(table).getByRole('row', { name: /Ed Epsilon/ });
    expect(first).toHaveTextContent('623');
    expect(first).toHaveTextContent('+10.9');
    // A rating NBA.com did not publish stays unknown rather than becoming zero.
    expect(within(table).getByRole('row', { name: /Fay Zeta/ })).toHaveTextContent('—');
    expect(requests[0]).toContain('season=2023-24');
    // Only the 2007-08 seasons on are offered.
    expect(screen.queryByRole('option', { name: '2005–06' })).toBeNull();

    expect(screen.queryByRole('group', { name: 'Lineup comparison' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /Ed Epsilon/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Fay Zeta/ }));
    const compare = await screen.findByRole('group', { name: 'Lineup comparison' });
    expect(
      within(compare).getByRole('row', { name: /^Minutes together/ }),
    ).toHaveTextContent('+527');
    expect(
      within(compare).getByRole('row', { name: /^Offensive rating/ }),
    ).toHaveTextContent('-6.3');
    expect(
      within(compare).getByRole('row', { name: /^Defensive rating/ }),
    ).toHaveTextContent('—');

    const onOff = screen.getByRole('group', { name: 'On/off splits' });
    expect(within(onOff).getByRole('row', { name: /Ann Alpha/ })).toHaveTextContent(
      '-1.2',
    );
    expect(screen.getByText('Net rating is the difference.')).toBeInTheDocument();
  });

  it('explains when NBA.com cannot be reached', async () => {
    server.use(
      http.get('http://localhost/api/league/seasons', () => HttpResponse.json(seasons)),
      http.get('http://localhost/api/league/lineups', () =>
        HttpResponse.json(
          {
            error: {
              code: 'LEAGUE_LINEUPS_UNAVAILABLE',
              message: 'NBA.com’s 2023-24 lineup data could not be reached.',
            },
          },
          { status: 404 },
        ),
      ),
    );
    renderApp('/lab/lineups/nba?season=2023-24&team=nba:1610612738');
    expect(await screen.findByText(/could not be reached/)).toBeInTheDocument();
  });

  it('rejects malformed links', async () => {
    renderApp('/lab/lineups/nba?team=celtics');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});
