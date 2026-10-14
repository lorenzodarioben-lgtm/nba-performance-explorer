import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import type { CohortResponse } from '@nba-performance-explorer/contracts';
const fixture: CohortResponse = {
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T21:00:00.000Z',
    retrievedAt: null,
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Synthetic selected pool only.',
    warnings: ['DEMO FIXTURES'],
  },
  rows: ['2544', '201939', '1641705'].map((playerId, i) => ({
    playerId,
    season: '2023-24',
    status: 'available' as const,
    player: { id: playerId, fullName: `Fixture ${playerId}` },
    stats: {
      season: '2023-24',
      gamesPlayed: 30,
      minutesPerGame: 30,
      pointsPerGame: 30 - i * 10,
      reboundsPerGame: 9 - i * 3,
      assistsPerGame: 3,
      stealsPerGame: 1,
      blocksPerGame: 1,
      turnoversPerGame: 2,
      fieldGoalPercentage: 0.5,
      threePointPercentage: 0.4,
      freeThrowPercentage: 0.8,
    },
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
    rows: ['2544', '201939', '1641705'].map((playerId, i) => ({
      playerId,
      x: 30 - i * 10,
      y: 9 - i * 3,
      zX: (1 - i) * Math.sqrt(1.5),
      zY: (1 - i) * Math.sqrt(1.5),
      score: (1 - i) * 2.44949,
      rank: i + 1,
    })),
  },
};
const route =
  '/discover?players=2544,201939,1641705&seasons=2023-24,2023-24,2023-24&target=201939';
describe('discovery view', () => {
  it('explains the selected population and preserves equal-distance ties with exact evidence links', async () => {
    let query = new URLSearchParams();
    server.use(
      http.get('http://localhost/api/analytics/cohort', ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(fixture);
      }),
    );
    renderApp(route);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('1.732051')).toHaveLength(2);
    // The distance chart draws the same evidence: one bar per peer, shorter is closer.
    const distances = screen.getByRole('list', { name: /Similarity distance from/ });
    expect(within(distances).getAllByText('1.732')).toHaveLength(2);
    expect(
      screen.getByText(/cannot identify the closest NBA peer across the league/),
    ).toBeInTheDocument();
    expect(query.has('target')).toBe(false);
    expect(
      screen.getByRole('link', {
        name: 'Inspect exact metric and standardization evidence',
      }),
    ).toHaveAttribute('href', expect.stringContaining('/lab/analytics?players='));
    expect(
      within(table).getAllByRole('link', { name: 'Recorded-season evidence' })[0],
    ).toHaveAttribute('href', '/players/1641705/insights?season=2023-24');
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0);
    fireEvent.click(screen.getByRole('button', { name: 'Random qualifying target' }));
    expect(screen.getByLabelText('Similarity target')).toHaveValue('2544');
    rng.mockRestore();
    expect(
      (screen.getByLabelText('Shareable discovery URL') as HTMLInputElement).value,
    ).toContain('target=2544');
  });
  it('shares metric/sample filters and refuses excluded targets without fabricated neighbors', async () => {
    let query = new URLSearchParams();
    server.use(
      http.get('http://localhost/api/analytics/cohort', ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          ...fixture,
          analysis: {
            ...fixture.analysis,
            sample: 2,
            rows: fixture.analysis.rows.filter((r) => r.playerId !== '201939'),
            excluded: [{ playerId: '201939', reason: 'Raw attempts unavailable' }],
          },
        });
      }),
    );
    renderApp(route);
    await screen.findByText(/No qualifying peer for this target/);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/Raw attempts unavailable/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minimum recorded games'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('First similarity metric'), {
      target: { value: 'trueShooting' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply discovery filters' }));
    await waitFor(() => expect(query.get('minGames')).toBe('25'));
    expect(query.get('x')).toBe('trueShooting');
    expect(query.has('target')).toBe(false);
  });
  it('does not fetch invalid states and renders explicit source failure', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/analytics/cohort', read));
    const view = renderApp(route + '&target=2544');
    await screen.findByText(/Unsupported, duplicate or invalid discovery state/);
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp(route);
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
