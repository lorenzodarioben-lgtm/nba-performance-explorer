import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './ComparisonLabPage';

const stats = {
  season: '2023-24',
  gamesPlayed: 10,
  minutesPerGame: 30,
  pointsPerGame: 22.5,
  reboundsPerGame: 6,
  assistsPerGame: 3,
  stealsPerGame: 1,
  blocksPerGame: 0,
  turnoversPerGame: 2,
  fieldGoalPercentage: 0.5,
  threePointPercentage: 0.4,
  freeThrowPercentage: 0.8,
};
function handlers() {
  server.use(
    http.get('http://localhost/api/players/:id', ({ params }) =>
      HttpResponse.json({
        player: { id: String(params.id), fullName: `Fixture player ${params.id}` },
      }),
    ),
    http.get('http://localhost/api/players/:id/seasons', () =>
      HttpResponse.json({ seasons: [{ season: '2023-24' }, { season: '2022-23' }] }),
    ),
    http.get('http://localhost/api/analytics/compare', ({ request }) => {
      const params = new URL(request.url).searchParams;
      return HttpResponse.json({
        provenance: {
          source: 'fixture',
          servedAt: '2026-10-13T16:00:00.000Z',
          retrievedAt: null,
          asOf: null,
          isLive: false,
          scope: 'regular-season',
          coverage: 'Test fixture season summaries.',
          warnings: ['DEMO FIXTURES'],
        },
        rows: (params.get('players') ?? '').split(',').map((playerId, i) => ({
          playerId,
          player: { id: playerId, fullName: `Fixture player ${playerId}` },
          season: params.get('seasons')?.split(',')[i],
          stats:
            i === 1 ? null : { ...stats, season: params.get('seasons')?.split(',')[i] },
          status: i === 1 ? 'season-unavailable' : 'available',
        })),
      });
    }),
  );
}

describe('comparison lab', () => {
  it('restores three-player direct links and preserves unavailable slots as missing', async () => {
    handlers();
    renderApp(
      '/lab/compare?players=2544,201939,1641705&seasons=2023-24,2022-23,2023-24',
    );
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable (season-unavailable)')).toHaveLength(11);
    expect(screen.getByLabelText('Season for NBA player 201939')).toHaveValue(
      '2022-23',
    );
    expect(
      screen.getByText('DEMO FIXTURES — not real NBA results'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Shareable comparison URL')).toHaveValue(
      'http://localhost:3000/lab/compare?players=2544%2C201939%2C1641705&seasons=2023-24%2C2022-23%2C2023-24',
    );
  });
  it('updates metric independently of fetching and preserves seasons', async () => {
    handlers();
    renderApp('/lab/compare?players=2544,201939&seasons=2023-24,2022-23');
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Comparison metric'), {
      target: { value: 'fieldGoalPercentage' },
    });
    expect(await screen.findByRole('cell', { name: '50.0%' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(
      screen.getByLabelText('Shareable comparison URL').getAttribute('value'),
    ).toContain('metric=fieldGoalPercentage');
  });
  it('removes one slot, preserves other picks and hides obsolete comparison data', async () => {
    handlers();
    renderApp('/lab/compare?players=2544,201939&seasons=2023-24,2022-23');
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Remove NBA player 2544' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Season for NBA player 201939')).toHaveValue(
      '2022-23',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Add at least two players');
  });
  it('requires season picks before calling the comparison API', async () => {
    handlers();
    let comparisons = 0;
    server.use(
      http.get('http://localhost/api/analytics/compare', () => {
        comparisons++;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    renderApp('/lab/compare?players=2544,201939&seasons=,');
    await screen.findByRole('option', { name: '2023-24' });
    expect(comparisons).toBe(0);
    fireEvent.change(screen.getByLabelText('Season for NBA player 2544'), {
      target: { value: '2023-24' },
    });
    fireEvent.change(screen.getByLabelText('Season for NBA player 201939'), {
      target: { value: '2022-23' },
    });
    await waitFor(() => expect(comparisons).toBe(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No substitute statistics',
    );
  });
  it('does not fetch invalid duplicate-player links', async () => {
    renderApp('/lab/compare?players=2544,2544&seasons=2023-24,2023-24');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid comparison URL',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
