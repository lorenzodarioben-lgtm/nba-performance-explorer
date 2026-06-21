import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const trendsUrl = 'http://localhost/api/players/:playerId/season-trends';

const lebronProfile = {
  id: '2544',
  fullName: 'LeBron James',
  team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
  position: 'F',
};

const seasons = {
  seasons: [
    { season: '2023-24', team: { abbreviation: 'LAL' } },
    { season: '2018-19', team: { abbreviation: 'LAL' } },
    { season: '2017-18', team: { abbreviation: 'CLE' } },
  ],
};

const currentGames = [
  {
    id: 'lal-2024-04-14-nop',
    date: '2024-04-14',
    team: { abbreviation: 'LAL' },
    opponent: { abbreviation: 'NOP' },
    location: 'home',
    result: 'W',
    minutes: 38,
    points: 28,
    rebounds: 11,
    assists: 17,
  },
  {
    id: 'lal-2024-04-09-gsw',
    date: '2024-04-09',
    team: { abbreviation: 'LAL' },
    opponent: { abbreviation: 'GSW' },
    location: 'away',
    result: 'L',
    minutes: 40,
    points: 33,
    rebounds: 9,
    assists: 0,
  },
] as const;

const olderGame = {
  id: 'cle-2018-04-11-nyk',
  date: '2018-04-11',
  team: { abbreviation: 'CLE' },
  opponent: { abbreviation: 'NYK' },
  location: 'home',
  result: 'W',
  minutes: 30,
  points: 24,
  rebounds: 8,
  assists: 9,
} as const;

function statsFor(season: string) {
  return {
    stats: {
      season,
      team: { abbreviation: season === '2017-18' ? 'CLE' : 'LAL' },
      gamesPlayed: season === '2017-18' ? 82 : 71,
      minutesPerGame: 35.3,
      pointsPerGame: season === '2017-18' ? 27.5 : 25.7,
      reboundsPerGame: 7.3,
      assistsPerGame: 8.3,
      stealsPerGame: 1.3,
      blocksPerGame: 0.5,
      turnoversPerGame: 3.5,
      fieldGoalPercentage: 0.54,
      threePointPercentage: 0.41,
      freeThrowPercentage: 0.75,
    },
  };
}

function gameLogFor(season: string) {
  return {
    season,
    games:
      season === '2023-24' ? currentGames : season === '2017-18' ? [olderGame] : [],
  };
}

beforeEach(() => {
  server.use(
    http.get(profileUrl, () => HttpResponse.json({ player: lebronProfile })),
    http.get(seasonsUrl, () => HttpResponse.json(seasons)),
    http.get(statsUrl, ({ params }) =>
      HttpResponse.json(statsFor(String(params.season))),
    ),
    http.get(gamesUrl, ({ params }) =>
      HttpResponse.json(gameLogFor(String(params.season))),
    ),
    http.get(trendsUrl, () => HttpResponse.json({ seasons: [] })),
  );
});

async function getSeasonSelect(): Promise<HTMLSelectElement> {
  return (await screen.findByRole('combobox', {
    name: 'Season',
  })) as HTMLSelectElement;
}

describe('player game log', () => {
  it('requests the routed player and effective season without adding another selector', async () => {
    let requestedPlayerId = '';
    let requestedSeason = '';
    server.use(
      http.get(gamesUrl, ({ params }) => {
        requestedPlayerId = String(params.playerId);
        requestedSeason = String(params.season);
        return HttpResponse.json(gameLogFor(requestedSeason));
      }),
    );

    const { container } = renderApp('/players/2544');

    expect(
      await screen.findByRole('table', {
        name: 'Game log for the 2023-24 season.',
      }),
    ).toBeInTheDocument();
    expect(requestedPlayerId).toBe('2544');
    expect(requestedSeason).toBe('2023-24');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'LeBron James' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Career trends' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to search' })).toBeInTheDocument();
  });

  it('does not mount or request a game log without an effective season', async () => {
    let gameRequestCount = 0;
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json({ seasons: [] })),
      http.get(gamesUrl, () => {
        gameRequestCount += 1;
        return HttpResponse.json({ season: '2023-24', games: [] });
      }),
    );

    renderApp('/players/2544');

    expect(
      await screen.findByText('No season statistics are available for this player.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Game log' })).not.toBeInTheDocument();
    expect(gameRequestCount).toBe(0);
  });

  it('keeps the heading visible with an accessible loading state', async () => {
    server.use(
      http.get(gamesUrl, async ({ params }) => {
        await delay(80);
        return HttpResponse.json(gameLogFor(String(params.season)));
      }),
    );

    renderApp('/players/2544');

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Game log' }),
    ).toBeInTheDocument();
    const status = screen.getByText('Loading game log...');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    await screen.findByRole('table', {
      name: 'Game log for the 2023-24 season.',
    });
  });

  it('renders a newest-first semantic table with complete game values', async () => {
    renderApp('/players/2544');

    const table = await screen.findByRole('table', {
      name: 'Game log for the 2023-24 season.',
    });
    const rowHeaders = within(table).getAllByRole('rowheader');

    expect(rowHeaders.map((header) => header.textContent)).toEqual([
      '14 Apr 2024',
      '9 Apr 2024',
    ]);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    expect(within(table).getAllByText('LAL')).toHaveLength(2);
    expect(within(table).getByText('vs NOP')).toBeInTheDocument();
    expect(within(table).getByText('@ GSW')).toBeInTheDocument();
    expect(within(table).getByLabelText('Win')).toHaveTextContent('W');
    expect(within(table).getByLabelText('Loss')).toHaveTextContent('L');
    expect(within(table).getByText('38')).toBeInTheDocument();
    expect(within(table).getByText('28')).toBeInTheDocument();
    expect(within(table).getByText('11')).toBeInTheDocument();
    expect(within(table).getByText('17')).toBeInTheDocument();
    expect(within(table).getByText('0')).toBeInTheDocument();
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.parentElement).toHaveClass('max-w-full', 'overflow-x-auto');
  });

  it('renders an accessible season-specific empty state without a table', async () => {
    server.use(
      http.get(seasonsUrl, () =>
        HttpResponse.json({
          seasons: [{ season: '2018-19', team: { abbreviation: 'LAL' } }],
        }),
      ),
    );

    renderApp('/players/2544');

    const status = await screen.findByText(
      'No fixture-backed games are available for the 2018-19 season.',
    );
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a defensive unavailable-season alert without backend wording', async () => {
    server.use(
      http.get(gamesUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'SEASON_NOT_FOUND',
              message: 'Private backend wording.',
              status: 404,
            },
          },
          { status: 404 },
        ),
      ),
    );

    renderApp('/players/2544');

    const alert = await screen.findByText(
      'The game log for that season is unavailable.',
    );
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('Private backend wording.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LeBron James' })).toBeInTheDocument();
  });

  it('renders a generic alert for a server failure', async () => {
    server.use(
      http.get(gamesUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal details.',
              status: 500,
            },
          },
          { status: 500 },
        ),
      ),
    );

    renderApp('/players/2544');

    const alert = await screen.findByText(
      'The game log is unavailable. Please try again.',
    );
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('Internal details.')).not.toBeInTheDocument();
  });

  it('maps a contract-invalid successful response to the generic error state', async () => {
    server.use(
      http.get(gamesUrl, () =>
        HttpResponse.json({
          season: '2023-24',
          games: [
            {
              id: 'invalid game id',
              date: '2024-04-14',
            },
          ],
        }),
      ),
    );

    renderApp('/players/2544');

    expect(
      await screen.findByText('The game log is unavailable. Please try again.'),
    ).toHaveAttribute('role', 'alert');
  });

  it('changes season, removes previous rows immediately, and updates stats and games', async () => {
    const requestedGameSeasons: string[] = [];
    server.use(
      http.get(gamesUrl, async ({ params }) => {
        const season = String(params.season);
        requestedGameSeasons.push(season);

        if (season === '2017-18') {
          await delay(80);
        }

        return HttpResponse.json(gameLogFor(season));
      }),
    );

    renderApp('/players/2544');

    const select = await getSeasonSelect();
    expect(await screen.findByText('14 Apr 2024')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: '2017-18' } });

    expect(select).toHaveValue('2017-18');
    expect(screen.queryByText('14 Apr 2024')).not.toBeInTheDocument();
    expect(screen.getByText('Loading game log...')).toBeInTheDocument();

    expect(await screen.findByText('11 Apr 2018')).toBeInTheDocument();
    expect(screen.getByText('vs NYK')).toBeInTheDocument();
    await waitFor(() => {
      const seasonSection = screen.getByRole('region', {
        name: 'Season statistics',
      });
      const seasonTerm = within(seasonSection)
        .getAllByText('Season')
        .find((element) => element.tagName === 'DT');
      expect(seasonTerm?.parentElement?.querySelector('dd')).toHaveTextContent(
        '2017-18',
      );
    });
    expect(requestedGameSeasons).toContain('2023-24');
    expect(requestedGameSeasons).toContain('2017-18');
  });

  it('does not render data whose response season differs from the selected season', async () => {
    server.use(
      http.get(gamesUrl, () =>
        HttpResponse.json({
          season: '2017-18',
          games: [olderGame],
        }),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByText('Loading game log...')).toBeInTheDocument();
    expect(screen.queryByText('11 Apr 2018')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('passes an AbortSignal to the game-log request', async () => {
    let hadSignal = false;
    server.use(
      http.get(gamesUrl, ({ request, params }) => {
        hadSignal = request.signal instanceof AbortSignal;
        return HttpResponse.json(gameLogFor(String(params.season)));
      }),
    );

    renderApp('/players/2544');

    await screen.findByRole('table', {
      name: 'Game log for the 2023-24 season.',
    });
    expect(hadSignal).toBe(true);
  });
});

describe('game-log season reconciliation', () => {
  it('never requests games for a removed selection after the season list refreshes', async () => {
    let availableSeasons = seasons;
    const requestedGameSeasons: string[] = [];
    server.use(
      http.get(seasonsUrl, () => HttpResponse.json(availableSeasons)),
      http.get(statsUrl, ({ params }) =>
        HttpResponse.json(statsFor(String(params.season))),
      ),
      http.get(gamesUrl, ({ params }) => {
        const season = String(params.season);
        requestedGameSeasons.push(season);
        return HttpResponse.json(gameLogFor(season));
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PlayerSeasonStatistics playerId="2544" />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const select = await getSeasonSelect();
    fireEvent.change(select, { target: { value: '2018-19' } });
    await waitFor(() => expect(requestedGameSeasons).toContain('2018-19'));

    availableSeasons = {
      seasons: [
        { season: '2024-25', team: { abbreviation: 'LAL' } },
        { season: '2023-24', team: { abbreviation: 'LAL' } },
      ],
    };
    requestedGameSeasons.length = 0;
    await queryClient.invalidateQueries({
      queryKey: ['players', 'seasons', '2544'],
    });

    await waitFor(() => expect(select).toHaveValue('2024-25'));
    await waitFor(() => expect(requestedGameSeasons).toContain('2024-25'));
    expect(requestedGameSeasons).not.toContain('2018-19');
  });
});
