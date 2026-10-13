import { fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { type PlayerInsightsResponse } from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

// Explicit synthetic UI fixture. Real computations are tested in backend stats-core tests.
const summary = {
  sample: 1,
  points: 25,
  rebounds: 7,
  assists: 8,
  minutes: 35,
  wins: 1,
  losses: 0,
  winPercentage: 1,
};
const fixture: PlayerInsightsResponse = {
  player: { id: '2544', fullName: 'LeBron James' },
  seasons: [{ season: '2023-24' }],
  season: '2023-24',
  stats: {
    season: '2023-24',
    gamesPlayed: 71,
    minutesPerGame: 35,
    pointsPerGame: 25,
    reboundsPerGame: 7,
    assistsPerGame: 8,
    stealsPerGame: 1,
    blocksPerGame: 1,
    turnoversPerGame: 3,
    fieldGoalPercentage: 0.5,
    threePointPercentage: 0.4,
    freeThrowPercentage: 0.7,
  },
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T16:00:00.000Z',
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Observed games only.',
    warnings: ['DEMO FIXTURES: deterministic local/test data, not NBA results.'],
  },
  observedGames: 1,
  filteredGames: 1,
  page: 1,
  pageSize: 20,
  games: [
    {
      id: 'test-game',
      date: '2023-12-25',
      team: { abbreviation: 'LAL' },
      opponent: { abbreviation: 'BOS' },
      location: 'home',
      result: 'W',
      points: 25,
      rebounds: 7,
      assists: 8,
      minutes: 35,
    },
  ],
  summary,
  recent: summary,
  window: 5,
  rolling: [{ gameId: 'test-game', date: '2023-12-25', summary }],
  splits: [{ label: 'Home', summary }],
  extrema: [
    {
      metric: 'points',
      high: 25,
      low: 25,
      highGames: ['test-game'],
      lowGames: ['test-game'],
    },
  ],
};

describe('player insights page', () => {
  it('renders source, sample labels, tables, profile link and heading focus', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/insights', () =>
        HttpResponse.json(fixture),
      ),
    );
    renderApp('/players/2544/insights?season=2023-24');
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'LeBron James: player insights',
    });
    expect(
      screen.getByText('DEMO FIXTURES — not real NBA results'),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 matching games of 1 observed/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Original player profile' }),
    ).toHaveAttribute('href', '/players/2544');
    expect(screen.getAllByRole('table')).toHaveLength(4);
    await waitFor(() => expect(heading).toHaveFocus());
  });
  it('persists rolling, opponent and date controls through API query URL', async () => {
    const requests: URL[] = [];
    server.use(
      http.get('http://localhost/api/players/2544/insights', ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json({
          ...fixture,
          window: Number(new URL(request.url).searchParams.get('window') ?? 5),
        });
      }),
    );
    renderApp('/players/2544/insights?season=2023-24');
    await screen.findByRole('heading', { name: 'LeBron James: player insights' });
    fireEvent.change(screen.getByLabelText('Rolling window'), {
      target: { value: '10' },
    });
    await screen.findByRole('rowheader', { name: 'Last 10 matching games' });
    fireEvent.change(screen.getByLabelText('Opponent abbreviation'), {
      target: { value: 'bos' },
    });
    fireEvent.change(screen.getByLabelText('From date'), {
      target: { value: '2023-12-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('opponent')).toBe('BOS'),
    );
    expect(requests.at(-1)?.searchParams.get('window')).toBe('10');
    expect(requests.at(-1)?.searchParams.get('from')).toBe('2023-12-01');
    expect(requests.at(-1)?.searchParams.get('season')).toBe('2023-24');
  });
  it('shows empty/missing seasons without rendering zero averages', async () => {
    const empty = {
      sample: 0,
      points: null,
      rebounds: null,
      assists: null,
      minutes: null,
      wins: 0,
      losses: 0,
      winPercentage: null,
    };
    server.use(
      http.get('http://localhost/api/players/2544/insights', () =>
        HttpResponse.json({
          ...fixture,
          season: null,
          seasons: [],
          stats: null,
          games: [],
          observedGames: 0,
          filteredGames: 0,
          summary: empty,
          recent: empty,
          rolling: [],
          splits: [],
          extrema: [],
        }),
      ),
    );
    renderApp('/players/2544/insights');
    await screen.findByText(
      'No recorded statistics for this season. Choose another recorded season.',
    );
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(
      screen.getByText('No observed games match these filters.'),
    ).toBeInTheDocument();
  });
  it('has loading and sanitized source failure states', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/insights', async () => {
        await delay(30);
        return new HttpResponse('private upstream details', { status: 503 });
      }),
    );
    const { container } = renderApp('/players/2544/insights');
    expect(await screen.findByText('Loading research data…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No substitute statistics',
    );
    expect(container).not.toHaveTextContent('private upstream');
  });
  it('rejects repeated filters without contacting the API', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost/api/players/2544/insights', () => {
        calls++;
        return HttpResponse.json(fixture);
      }),
    );
    renderApp('/players/2544/insights?window=5&window=10');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid research URL');
    expect(calls).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await screen.findByRole('heading', { name: 'LeBron James: player insights' });
    expect(calls).toBe(1);
  });
});
