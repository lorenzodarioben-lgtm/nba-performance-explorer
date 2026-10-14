import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const profileUrl = 'http://localhost/api/players/:playerId';
const seasonsUrl = 'http://localhost/api/players/:playerId/seasons';
const trendsUrl = 'http://localhost/api/players/:playerId/season-trends';
const healthUrl = 'http://localhost/api/health';

const lebronProfile = {
  id: '2544',
  fullName: 'LeBron James',
  team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
  position: 'F',
};

function statsFor(
  season: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    season,
    team: { abbreviation: 'LAL' },
    gamesPlayed: 70,
    minutesPerGame: 35,
    pointsPerGame: 25,
    reboundsPerGame: 7,
    assistsPerGame: 8,
    stealsPerGame: 1,
    blocksPerGame: 0.5,
    turnoversPerGame: 3,
    fieldGoalPercentage: 0.5,
    threePointPercentage: 0.4,
    freeThrowPercentage: 0.8,
    ...overrides,
  };
}

const threeTrendSeasons = {
  seasons: [
    statsFor('2017-18', {
      pointsPerGame: 27.5,
      reboundsPerGame: 8.6,
      assistsPerGame: 9.1,
    }),
    statsFor('2018-19', {
      pointsPerGame: 27.4,
      reboundsPerGame: 8.5,
      assistsPerGame: 8.3,
    }),
    statsFor('2023-24', {
      pointsPerGame: 25.7,
      reboundsPerGame: 7.3,
      assistsPerGame: 8.3,
    }),
  ],
};

// The profile must load (so the trends section mounts); the season section defaults to empty.
beforeEach(() => {
  server.use(
    http.get(profileUrl, () => HttpResponse.json({ player: lebronProfile })),
    http.get(seasonsUrl, () => HttpResponse.json({ seasons: [] })),
  );
});

function trendTable() {
  return screen.getByRole('table', {
    name: /points, rebounds, and assists per game by season/i,
  });
}

describe('player career trends', () => {
  it('requests the trends for the routed player', async () => {
    let receivedId = '';
    server.use(
      http.get(trendsUrl, ({ params }) => {
        receivedId = String(params.playerId);
        return HttpResponse.json(threeTrendSeasons);
      }),
    );

    renderApp('/players/2544');

    await screen.findByRole('table', {
      name: /points, rebounds, and assists per game by season/i,
    });
    expect(receivedId).toBe('2544');
  });

  it('passes an abort signal to the trends request', async () => {
    let hadSignal = false;
    server.use(
      http.get(trendsUrl, ({ request }) => {
        hadSignal = request.signal instanceof AbortSignal;
        return HttpResponse.json(threeTrendSeasons);
      }),
    );

    renderApp('/players/2544');

    await screen.findByText('Career trends');
    await waitFor(() => expect(hadSignal).toBe(true));
  });

  it('renders an accessible loading state', async () => {
    server.use(
      http.get(trendsUrl, async () => {
        await delay(80);
        return HttpResponse.json(threeTrendSeasons);
      }),
    );

    renderApp('/players/2544');

    expect(await screen.findByText('Loading career trends...')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('renders the chart and an accessible table for multiple seasons', async () => {
    server.use(http.get(trendsUrl, () => HttpResponse.json(threeTrendSeasons)));

    const { container } = renderApp('/players/2544');

    const table = await screen.findByRole('table', {
      name: /points, rebounds, and assists per game by season/i,
    });

    // Series labels are the column headers.
    within(table).getByRole('columnheader', { name: 'Points per game' });
    within(table).getByRole('columnheader', { name: 'Rebounds per game' });
    within(table).getByRole('columnheader', { name: 'Assists per game' });

    // Seasons are oldest first and values are formatted to one decimal.
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['2017-18', '2018-19', '2023-24']);
    const firstDataRow = within(table).getAllByRole('row')[1] as HTMLElement;
    expect(
      within(firstDataRow)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['27.5', '8.6', '9.1']);

    // The chart renders inside an assistive-tech-hidden wrapper, using the same seasons.
    const chart = container.querySelector(
      '[data-chart="career-trends"][aria-hidden="true"]',
    );
    expect(chart).not.toBeNull();
    expect(chart?.querySelector('svg')).not.toBeNull();
    expect(
      within(chart as HTMLElement).getAllByText('Points per game').length,
    ).toBeGreaterThan(0);
  });

  it('exposes the equivalent table as a named, focusable scroll region', async () => {
    server.use(http.get(trendsUrl, () => HttpResponse.json(threeTrendSeasons)));

    renderApp('/players/2544');

    const region = await screen.findByRole('group', {
      name: 'Career averages by season',
    });
    expect(region).toHaveAttribute('tabindex', '0');
    // The equivalent data table lives inside the focusable scroll region.
    expect(
      within(region).getByRole('table', {
        name: /points, rebounds, and assists per game by season/i,
      }),
    ).toBeInTheDocument();
  });

  it('configures non-colour line patterns for the series', async () => {
    server.use(http.get(trendsUrl, () => HttpResponse.json(threeTrendSeasons)));

    const { container } = renderApp('/players/2544');
    await screen.findByRole('table', {
      name: /points, rebounds, and assists per game by season/i,
    });

    const dashPatterns = [
      ...container.querySelectorAll(
        '[data-chart="career-trends"][aria-hidden="true"] path',
      ),
    ]
      .map((node) => node.getAttribute('stroke-dasharray'))
      .filter((value): value is string => value !== null);
    expect(dashPatterns).toContain('6 3');
    expect(dashPatterns).toContain('2 4');
  });

  it('keeps the profile identity and season section visible alongside trends', async () => {
    server.use(http.get(trendsUrl, () => HttpResponse.json(threeTrendSeasons)));

    renderApp('/players/2544');

    await screen.findByRole('table', {
      name: /points, rebounds, and assists per game by season/i,
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'LeBron James' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Season statistics')).toBeInTheDocument();
    expect(screen.getByText('Career trends')).toBeInTheDocument();
  });

  it('shows an insufficient-data message and the values for a single season', async () => {
    server.use(
      http.get(trendsUrl, () =>
        HttpResponse.json({
          seasons: [statsFor('2023-24', { pointsPerGame: 25.7 })],
        }),
      ),
    );

    const { container } = renderApp('/players/2544');

    expect(
      await screen.findByText(
        'At least two seasons are needed to show a career trend.',
      ),
    ).toBeInTheDocument();
    // No chart for one season, but the value remains available in the table.
    expect(container.querySelector('[data-chart="career-trends"] svg')).toBeNull();
    expect(within(trendTable()).getByText('25.7')).toBeInTheDocument();
  });

  it('shows an accessible empty state when there are no seasons', async () => {
    server.use(http.get(trendsUrl, () => HttpResponse.json({ seasons: [] })));

    renderApp('/players/2544');

    expect(
      await screen.findByText('No season data is available to chart for this player.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('table', {
        name: /points, rebounds, and assists per game by season/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('renders a generic error state while keeping the profile visible', async () => {
    server.use(
      http.get(trendsUrl, () =>
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Career trends are unavailable',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'LeBron James' }),
    ).toBeInTheDocument();
  });

  it('treats an invalid trends response as a generic error', async () => {
    server.use(
      http.get(trendsUrl, () =>
        HttpResponse.json({ seasons: [{ season: '2023-24', points: 25 }] }),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Career trends are unavailable',
    );
  });

  it('makes no trends request for an invalid route id', async () => {
    let requestCount = 0;
    server.use(
      http.get(trendsUrl, () => {
        requestCount += 1;
        return HttpResponse.json(threeTrendSeasons);
      }),
    );

    renderApp('/players/abc');

    expect(
      await screen.findByRole('heading', { name: 'Invalid player link' }),
    ).toBeInTheDocument();
    expect(requestCount).toBe(0);
  });

  it('navigates back to search from the profile', async () => {
    server.use(
      http.get(trendsUrl, () => HttpResponse.json(threeTrendSeasons)),
      http.get(healthUrl, () =>
        HttpResponse.json({
          status: 'ok',
          timestamp: '2026-06-21T00:00:00.000Z',
          service: 'nba-performance-explorer-api',
        }),
      ),
    );

    renderApp('/players/2544');

    await screen.findByText('Career trends');
    fireEvent.click(screen.getByRole('link', { name: 'Back to search' }));

    expect(
      await screen.findByRole('combobox', { name: 'Search NBA players' }),
    ).toBeInTheDocument();
  });
});
