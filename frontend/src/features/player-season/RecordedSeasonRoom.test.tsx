import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  RecordedPlayerSeasonResponseSchema,
  type RecordedPlayerSeasonResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { awayTeam, homeTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedSeasonRoom';

const API = 'http://localhost/api/recorded/player-season';
const metrics = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'minutesPerGame',
] as const;
const row = {
  name: 'Fixture Guard',
  articleUrl: 'https://en.wikipedia.org/wiki/Fixture_Guard',
  nbaPlayerId: '2544',
  identityUrl: null,
  gamesPlayed: 70,
  gamesStarted: 70,
  minutesPerGame: 34.1,
  fieldGoalPercentage: 0.512,
  threePointPercentage: 0.371,
  freeThrowPercentage: null,
  reboundsPerGame: 7.2,
  assistsPerGame: 8.1,
  stealsPerGame: 1.2,
  blocksPerGame: 0.6,
  pointsPerGame: 25.3,
  valueBasis: 'published-per-game' as const,
  rawTotals: null,
};
function card(
  overrides: Partial<RecordedPlayerSeasonResponse> = {},
): RecordedPlayerSeasonResponse {
  return {
    season: '2023-24',
    scope: 'regular-season',
    playerId: '2544',
    name: 'Fixture Guard',
    stints: [{ team: homeTeam, row, source: leagueFixture.attribution }],
    minGames: 20,
    qualified: true,
    exclusion: null,
    population: 300,
    metrics: [...metrics],
    metricPopulations: metrics.map((metric) => ({
      metric,
      mean: 5,
      standardDeviation: 2,
    })),
    categories: metrics.map((metric, i) => ({
      metric,
      value: row[metric],
      rank: i + 1,
      percentile: 99 - i * 10,
      zScore: 2 - i * 0.3,
    })),
    similar: [
      {
        playerId: '201939',
        name: 'Fixture Peer',
        gamesPlayed: 74,
        teams: [awayTeam],
        distance: 1.234,
        zDifferences: [0.5, -0.4, 0.1, 0, -1.2, 2.5],
      },
    ],
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    provenance: { ...leagueFixture.provenance },
    ...overrides,
  };
}

describe('player hub 2023–24 recorded season room', () => {
  it('uses a contract-valid fixture', () => {
    expect(RecordedPlayerSeasonResponseSchema.safeParse(card()).success).toBe(true);
  });

  it('shows cohort percentiles, the published team row and transparent similar seasons', async () => {
    let requested = '';
    server.use(
      http.get(API, ({ request }) => {
        requested = new URL(request.url).search;
        return HttpResponse.json(card());
      }),
    );
    renderApp('/players/2544/archive');
    const board = await screen.findByRole('list', {
      name: 'Cohort percentiles by category',
    });
    expect(requested).toBe('?player=2544&minGames=20');
    const rows = within(board).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent('PTS');
    expect(rows[0]).toHaveTextContent('25.3');
    expect(rows[0]).toHaveTextContent('99th percentile');
    expect(rows[1]).toHaveTextContent('89th');
    const table = screen.getByRole('group', { name: 'Published 2023-24 team rows' });
    expect(within(table).getByRole('link', { name: homeTeam.name })).toHaveAttribute(
      'href',
      `/teams/${homeTeam.id}/season`,
    );
    expect(table).toHaveTextContent('51.2%');
    expect(screen.getByRole('link', { name: 'Fixture Peer' })).toHaveAttribute(
      'href',
      '/players/201939/archive',
    );
    expect(screen.getByRole('link', { name: 'Compare profiles' })).toHaveAttribute(
      'href',
      '/lab/profiles?players=2544,201939',
    );
    expect(screen.getByText('1.23')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2023–24' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('changes the cohort minimum through the URL and refetches', async () => {
    const seen: string[] = [];
    server.use(
      http.get(API, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('minGames') ?? '');
        return HttpResponse.json(card());
      }),
    );
    renderApp('/players/2544/archive');
    fireEvent.click(await screen.findByRole('button', { name: '60+ GP' }));
    await waitFor(() => expect(seen).toContain('60'));
  });

  it('explains when a player is outside the cohort or absent from the archive', async () => {
    server.use(
      http.get(API, () =>
        HttpResponse.json(
          card({
            qualified: false,
            exclusion: 'Played 12 recorded games, below the 20-game minimum.',
            categories: [],
            similar: [],
          }),
        ),
      ),
    );
    const { unmount } = renderApp('/players/2544/archive');
    expect(await screen.findByText('Outside this cohort')).toBeInTheDocument();
    expect(screen.getByText(/Played 12 recorded games/)).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Cohort percentiles by category' }),
    ).toBeNull();
    unmount();
    server.use(
      http.get(API, () =>
        HttpResponse.json(
          card({
            name: null,
            stints: [],
            qualified: false,
            exclusion: 'No 2023-24 team page in the archive lists this NBA identity.',
            categories: [],
            similar: [],
          }),
        ),
      ),
    );
    renderApp('/players/2544/archive');
    expect(await screen.findByText('Not in the recorded archive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'recorded leaders' })).toHaveAttribute(
      'href',
      '/leaders/recorded',
    );
  });
});
