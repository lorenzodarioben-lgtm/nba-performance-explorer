import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
const totals = {
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
const metrics = {
  trueShooting: 800 / (2 * (600 + 0.44 * 120)),
  effectiveFieldGoal: 350 / 600,
  assistTurnover: 2,
  pointsPer36: 24,
  fieldGoalPercentage: 0.5,
  threePointPercentage: 100 / 240,
  freeThrowPercentage: 100 / 120,
};
const body = {
  player: { id: '2544', fullName: 'Fixture shooting player' },
  status: 'available',
  seasons: [
    { totals, metrics, pointsPerGame: 20, reboundsPerGame: 5, assistsPerGame: 4 },
  ],
  aggregate: {
    ...Object.fromEntries(
      Object.entries(totals).filter(([key]) => !['playerId', 'season'].includes(key)),
    ),
    seasonsReported: 1,
    metrics,
  },
  milestones: [],
  peak: {
    metric: 'trueShooting',
    minGames: 1,
    qualifiedSeasons: 1,
    excludedSeasons: 0,
    value: metrics.trueShooting,
    seasons: ['2023-24'],
  },
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T22:00:00.000Z',
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Synthetic raw-count test only.',
    warnings: ['DEMO FIXTURES'],
  },
};
describe('shooting counts page', () => {
  it('shows sourced type counts, weighted ratios, missing-map coverage and stable saved selection', async () => {
    let requested = '';
    server.use(
      http.get('http://localhost/api/players/2544/career', ({ request }) => {
        requested = new URL(request.url).searchParams.get('scope') ?? '';
        return HttpResponse.json(body);
      }),
    );
    renderApp('/players/2544/shooting');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Two-point field goals')).toBeInTheDocument();
    expect(within(table).getByText('55.56%')).toBeInTheDocument();
    expect(within(table).getByText('Separate from field goals')).toBeInTheDocument();
    expect(
      screen.getByText(/Shot locations, distances, court zones/),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable shooting URL') as HTMLInputElement).value,
    ).toContain('season=2023-24');
    fireEvent.change(screen.getByLabelText('Minimum attempts per shot type'), {
      target: { value: '300' },
    });
    expect(within(table).getAllByText('Below selected attempt minimum')).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Shooting scope'), {
      target: { value: 'playoffs' },
    });
    await waitFor(() => expect(requested).toBe('playoffs'));
  });
  it('rejects invalid state, keeps unavailable seasons empty and withholds inconsistent math', async () => {
    const read = vi.fn(() => HttpResponse.json(body));
    server.use(http.get('http://localhost/api/players/2544/career', read));
    const bad = renderApp('/players/2544/shooting?scope=bad');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    bad.unmount();
    const absent = renderApp('/players/2544/shooting?season=2022-23');
    await screen.findByText(/Raw totals unavailable for this season and scope/);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    absent.unmount();
    server.use(
      http.get('http://localhost/api/players/2544/career', () =>
        HttpResponse.json({
          ...body,
          seasons: [{ ...body.seasons[0], totals: { ...totals, points: 801 } }],
        }),
      ),
    );
    renderApp('/players/2544/shooting');
    expect(await screen.findByRole('alert')).toHaveTextContent('inconsistent');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
