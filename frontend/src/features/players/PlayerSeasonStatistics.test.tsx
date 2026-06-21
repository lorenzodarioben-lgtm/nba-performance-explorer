import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { PlayerSeasonStatistics } from './PlayerSeasonStatistics';

const profileUrl = 'http://localhost/api/players/:playerId';
const seasonsUrl = 'http://localhost/api/players/:playerId/seasons';
const statsUrl = 'http://localhost/api/players/:playerId/seasons/:season/stats';
const gamesUrl = 'http://localhost/api/players/:playerId/seasons/:season/games';

const lebronProfile = {
  id: '2544',
  fullName: 'LeBron James',
  team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
  position: 'F',
};

const threeSeasons = {
  seasons: [
    { season: '2023-24', team: { abbreviation: 'LAL' } },
    { season: '2018-19', team: { abbreviation: 'LAL' } },
    { season: '2017-18', team: { abbreviation: 'CLE' } },
  ],
};

// A complete, contract-valid stats object for a season, with a couple of season-specific
// values so changing the selection is observable.
function statsFor(season: string): Record<string, unknown> {
  const base = {
    season,
    team: { abbreviation: season === '2017-18' ? 'CLE' : 'LAL' },
    gamesPlayed: 71,
    minutesPerGame: 35.3,
    pointsPerGame: 25.7,
    reboundsPerGame: 7.3,
    assistsPerGame: 8.3,
    stealsPerGame: 1.3,
    blocksPerGame: 0,
    turnoversPerGame: 3.5,
    fieldGoalPercentage: 0.542,
    threePointPercentage: 0.41,
    freeThrowPercentage: 0.75,
  };

  if (season === '2018-19') {
    return { ...base, gamesPlayed: 55, pointsPerGame: 27.4, blocksPerGame: 0.6 };
  }

  return base;
}

function statsResponse(season: string, overrides: Record<string, unknown> = {}) {
  return { stats: { ...statsFor(season), ...overrides } };
}

// Read a value from the season-statistics list specifically (the profile metadata and the
// season selector also use labels like "Team" and "Season").
function statValue(label: string): string {
  const section = screen.getByRole('region', { name: 'Season statistics' });
  const term = within(section)
    .getAllByText(label)
    .find((element) => element.tagName === 'DT');
  return term?.parentElement?.querySelector('dd')?.textContent ?? '';
}

beforeEach(() => {
  // The profile success view also mounts the career-trends section; default it to empty so
  // these season-statistics tests issue no unhandled trends request.
  server.use(
    http.get(profileUrl, () => HttpResponse.json({ player: lebronProfile })),
    http.get('http://localhost/api/players/:playerId/season-trends', () =>
      HttpResponse.json({ seasons: [] }),
    ),
    http.get(gamesUrl, ({ params }) =>
      HttpResponse.json({
        season: String(params.season),
        games: [],
      }),
    ),
  );
});

async function getSeasonSelect(): Promise<HTMLSelectElement> {
  return (await screen.findByLabelText('Season')) as HTMLSelectElement;
}

describe('player season statistics', () => {
  it('requests the seasons for the route player and selects the newest by default', async () => {
    let requestedPlayerId = '';
    let firstRequestedSeason = '';
    server.use(
      http.get(seasonsUrl, ({ params }) => {
        requestedPlayerId = String(params.playerId);
        return HttpResponse.json(threeSeasons);
      }),
      http.get(statsUrl, ({ params }) => {
        if (firstRequestedSeason === '') {
          firstRequestedSeason = String(params.season);
        }
        return HttpResponse.json(statsResponse(String(params.season)));
      }),
    );

    renderApp('/players/2544');

    const select = await getSeasonSelect();
    expect(requestedPlayerId).toBe('2544');
    expect(select).toHaveValue('2023-24');
    expect(
      within(select)
        .getAllByRole<HTMLOptionElement>('option')
        .map((option) => option.value),
    ).toEqual(['2023-24', '2018-19', '2017-18']);
    await waitFor(() => expect(firstRequestedSeason).toBe('2023-24'));
  });

  it('renders the selected season statistics with formatting and zero values', async () => {
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(threeSeasons)),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(statsResponse(String(params.season))),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByText('Season statistics')).toBeInTheDocument();
    await waitFor(() => expect(statValue('Games played')).toBe('71'));
    expect(statValue('Team')).toBe('LAL');
    expect(statValue('Points per game')).toBe('25.7');
    expect(statValue('Minutes per game')).toBe('35.3');
    expect(statValue('Blocks per game')).toBe('0.0');
    expect(statValue('Field-goal percentage')).toBe('54.2%');
    expect(statValue('Three-point percentage')).toBe('41.0%');
  });

  it('requests and renders a newly selected season without showing stale data', async () => {
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(threeSeasons)),
      http.get(statsUrl, async ({ params }) => {
        if (params.season === '2018-19') {
          await delay(60);
        }
        return HttpResponse.json(statsResponse(String(params.season)));
      }),
    );

    renderApp('/players/2544');

    const select = await getSeasonSelect();
    await waitFor(() => expect(statValue('Points per game')).toBe('25.7'));

    fireEvent.change(select, { target: { value: '2018-19' } });

    // The selector keeps the new value, old numbers vanish, and a loading state shows.
    expect(select).toHaveValue('2018-19');
    expect(screen.queryByText('25.7')).not.toBeInTheDocument();
    expect(screen.getByText('Loading season statistics...')).toBeInTheDocument();

    await waitFor(() => expect(statValue('Points per game')).toBe('27.4'));
    expect(statValue('Season')).toBe('2018-19');
    expect(statValue('Games played')).toBe('55');
  });

  it('renders an accessible empty state for a player with no seasons', async () => {
    server.use(http.get(seasonsUrl, () => HttpResponse.json({ seasons: [] })));

    renderApp('/players/2544');

    expect(
      await screen.findByText('No season statistics are available for this player.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Season')).not.toBeInTheDocument();
  });

  it('renders a single-season player', async () => {
    server.use(
      http.get(seasonsUrl, () =>
        HttpResponse.json({
          seasons: [{ season: '2023-24', team: { abbreviation: 'SAS' } }],
        }),
      ),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(
          statsResponse(String(params.season), { team: { abbreviation: 'SAS' } }),
        ),
      ),
    );

    renderApp('/players/2544');

    const select = await getSeasonSelect();
    expect(within(select).getAllByRole('option')).toHaveLength(1);
    await waitFor(() => expect(statValue('Team')).toBe('SAS'));
  });

  it('shows an accessible loading state while seasons load', async () => {
    server.use(
      http.get(seasonsUrl, async () => {
        await delay(60);
        return HttpResponse.json(threeSeasons);
      }),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(statsResponse(String(params.season))),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByText('Loading seasons...')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    await screen.findByLabelText('Season');
  });

  it('renders an unavailable-season state for a 404 SEASON_NOT_FOUND', async () => {
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(threeSeasons)),
      http.get(statsUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'SEASON_NOT_FOUND',
              message: 'Season not found.',
              status: 404,
            },
          },
          { status: 404 },
        ),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByText('That season is unavailable.')).toBeInTheDocument();
    // Profile identity stays visible during the season-section error.
    expect(screen.getByRole('heading', { name: 'LeBron James' })).toBeInTheDocument();
  });

  it('renders a generic error state when the season list request fails', async () => {
    server.use(
      http.get(seasonsUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred.',
              status: 500,
            },
          },
          { status: 500 },
        ),
      ),
    );

    renderApp('/players/2544');

    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((alert) =>
        alert.textContent?.includes('Season statistics are unavailable'),
      ),
    ).toBe(true);
    expect(screen.getByRole('heading', { name: 'LeBron James' })).toBeInTheDocument();
  });

  it('treats an invalid season-list response as a generic error', async () => {
    server.use(
      http.get(seasonsUrl, () =>
        HttpResponse.json({
          seasons: [{ season: '2023', team: { abbreviation: 'LAL' } }],
        }),
      ),
    );

    renderApp('/players/2544');

    expect(
      await screen.findByText('Season statistics are unavailable. Please try again.'),
    ).toBeInTheDocument();
  });

  it('treats an invalid statistics response as a generic error', async () => {
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(threeSeasons)),
      http.get(statsUrl, () =>
        HttpResponse.json({ stats: { season: '2023-24', points: 25 } }),
      ),
    );

    renderApp('/players/2544');

    await waitFor(() => {
      const section = screen.getByRole('region', { name: 'Season statistics' });
      expect(
        within(section).getByText(
          'Season statistics are unavailable. Please try again.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('uses a semantic section, an accessible select, and a definition list', async () => {
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(threeSeasons)),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(statsResponse(String(params.season))),
      ),
    );

    renderApp('/players/2544');

    const heading = await screen.findByRole('heading', {
      name: 'Season statistics',
      level: 2,
    });
    expect(heading.tagName).toBe('H2');
    expect(await getSeasonSelect()).toHaveAccessibleName('Season');
    await waitFor(() => {
      const section = screen.getByRole('region', { name: 'Season statistics' });
      expect(section.querySelectorAll('dl dt').length).toBeGreaterThanOrEqual(13);
    });
  });

  it('passes an abort signal to the seasons request', async () => {
    let hadSignal = false;
    server.use(
      http.get(seasonsUrl, ({ request }) => {
        hadSignal = request.signal instanceof AbortSignal;
        return HttpResponse.json(threeSeasons);
      }),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(statsResponse(String(params.season))),
      ),
    );

    renderApp('/players/2544');

    await screen.findByLabelText('Season');
    expect(hadSignal).toBe(true);
  });
});

describe('season selection reconciliation', () => {
  function renderSection() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const utils = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PlayerSeasonStatistics playerId="2544" />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    return { queryClient, ...utils };
  }

  it('keeps a valid user selection across a reload and reconciles when it disappears', async () => {
    let availableSeasons = threeSeasons;
    const requestedStatsSeasons: string[] = [];
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(availableSeasons)),
      http.get(statsUrl, ({ params }) => {
        requestedStatsSeasons.push(String(params.season));
        return HttpResponse.json(statsResponse(String(params.season)));
      }),
    );

    const { queryClient } = renderSection();

    const select = (await screen.findByLabelText('Season')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2018-19' } });
    await waitFor(() => expect(statValue('Season')).toBe('2018-19'));
    expect(select).toHaveValue('2018-19');

    // The available list refreshes and no longer contains the chosen season.
    availableSeasons = {
      seasons: [
        { season: '2024-25', team: { abbreviation: 'LAL' } },
        { season: '2023-24', team: { abbreviation: 'LAL' } },
      ],
    };
    requestedStatsSeasons.length = 0;
    await queryClient.invalidateQueries({ queryKey: ['players', 'seasons', '2544'] });

    // It falls back to the newest available season and never re-requests the removed one.
    await waitFor(() => expect(select).toHaveValue('2024-25'));
    expect(requestedStatsSeasons).not.toContain('2018-19');
    expect(requestedStatsSeasons).toContain('2024-25');
  });
});
