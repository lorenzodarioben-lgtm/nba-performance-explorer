import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const stats = {
  season: '2023-24',
  gamesPlayed: 30,
  minutesPerGame: 30,
  pointsPerGame: 20,
  reboundsPerGame: 6,
  assistsPerGame: 3,
  stealsPerGame: 1,
  blocksPerGame: 1,
  turnoversPerGame: 2,
  fieldGoalPercentage: 0.5,
  threePointPercentage: 0.4,
  freeThrowPercentage: 0.8,
};
const fixture = {
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T16:00:00.000Z',
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Explicit selected-cohort test data; not league rankings.',
    warnings: ['DEMO FIXTURES'],
  },
  rows: ['2544', '201939', '1641705'].map((playerId) => ({
    playerId,
    season: '2023-24',
    stats,
    player: { id: playerId, fullName: `Fixture ${playerId}` },
    status: 'available',
  })),
  analysis: {
    x: 'pointsPerGame',
    y: 'reboundsPerGame',
    weightX: 1,
    weightY: 1,
    minGames: 10,
    sample: 3,
    correlation: 1,
    excluded: [],
    rows: [
      {
        playerId: '2544',
        x: 30,
        y: 9,
        zX: Math.sqrt(1.5),
        zY: Math.sqrt(1.5),
        score: 2.44949,
        rank: 1,
      },
      { playerId: '201939', x: 20, y: 6, zX: 0, zY: 0, score: 0, rank: 2 },
      {
        playerId: '1641705',
        x: 10,
        y: 3,
        zX: -Math.sqrt(1.5),
        zY: -Math.sqrt(1.5),
        score: -2.44949,
        rank: 3,
      },
    ],
  },
};

describe('selected-cohort analytics lab', () => {
  it('restores selected players and has chart/table parity with explicit sample and formula', async () => {
    server.use(
      http.get('http://localhost/api/analytics/cohort', () =>
        HttpResponse.json(fixture),
      ),
    );
    const { container } = renderApp(
      '/lab/analytics?players=2544,201939,1641705&seasons=2023-24,2023-24,2023-24',
    );
    await screen.findByRole('table');
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText(/3 qualifying selected seasons/)).toBeInTheDocument();
    expect(screen.getByText(/population standard deviation/)).toBeInTheDocument();
    expect(
      screen.getByText(/does not contain a league-wide population/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fixture 2544 · 2023-24' }),
    ).toHaveAttribute('href', '/players/2544/insights?season=2023-24');
  });
  it('persists weights, metrics and qualification in the requested URL', async () => {
    let params = new URLSearchParams();
    server.use(
      http.get('http://localhost/api/analytics/cohort', ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({
          ...fixture,
          analysis: {
            ...fixture.analysis,
            weightX: Number(params.get('weightX') ?? 1),
          },
        });
      }),
    );
    renderApp(
      '/lab/analytics?players=2544,201939,1641705&seasons=2023-24,2023-24,2023-24',
    );
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('X weight'), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText('Minimum games'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply analytics' }));
    await waitFor(() => expect(params.get('weightX')).toBe('-1'));
    expect(params.get('minGames')).toBe('20');
    expect(params.get('players')).toBe('2544,201939,1641705');
  });
  it('shows no qualifying input state without fake plotted data', async () => {
    server.use(
      http.get('http://localhost/api/analytics/cohort', () =>
        HttpResponse.json({
          ...fixture,
          analysis: {
            ...fixture.analysis,
            sample: 0,
            rows: [],
            correlation: null,
            excluded: [{ playerId: '2544', reason: 'Raw inputs unavailable' }],
          },
        }),
      ),
    );
    const { container } = renderApp(
      '/lab/analytics?players=2544,201939&seasons=2023-24,2023-24&x=trueShooting',
    );
    await screen.findByText(/No qualifying seasons with both supported metric inputs/);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    expect(screen.getByText(/Raw inputs unavailable/)).toBeInTheDocument();
  });
  it('does not fetch malformed or repeated filters and keeps cohort navigation', async () => {
    renderApp(
      '/lab/analytics?players=2544,201939&seasons=2023-24,2023-24&weightX=1&weightX=3',
    );
    await screen.findByText(/Invalid or repeated analytics filters are not fetched/);
    expect(
      screen.getByRole('link', { name: 'Choose or edit player-season cohort' }),
    ).toBeInTheDocument();
  });
});
