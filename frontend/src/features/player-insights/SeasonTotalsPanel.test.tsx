import { screen, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { server } from '../../test/server';
import { SeasonTotalsPanel } from './SeasonTotalsPanel';

const provenance = {
  source: 'fixture',
  servedAt: '2026-10-13T16:00:00.000Z',
  retrievedAt: '2026-10-13T15:00:00.000Z',
  asOf: null,
  isLive: false,
  scope: 'regular-season',
  coverage: 'Explicit raw test fixture.',
  warnings: ['DEMO FIXTURES'],
};
function view() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {/* The panel always renders inside the app router; its failure notice links to coverage. */}
      <MemoryRouter>
        <SeasonTotalsPanel playerId="2544" season="2023-24" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('raw totals panel', () => {
  it('shows raw attempts, formulas, derived ratios and genuine fetch-time context', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/totals', () =>
        HttpResponse.json({
          status: 'available',
          provenance,
          totals: {
            playerId: '2544',
            season: '2023-24',
            gamesPlayed: 5,
            minutes: 180,
            points: 100,
            rebounds: 40,
            assists: 30,
            turnovers: 10,
            fieldGoalsMade: 35,
            fieldGoalsAttempted: 70,
            threesMade: 10,
            threesAttempted: 25,
            freeThrowsMade: 20,
            freeThrowsAttempted: 20,
          },
          metrics: {
            trueShooting: 100 / 157.6,
            effectiveFieldGoal: 40 / 70,
            assistTurnover: 3,
            pointsPer36: 20,
            fieldGoalPercentage: 0.5,
            threePointPercentage: 0.4,
            freeThrowPercentage: 1,
          },
        }),
      ),
    );
    view();
    expect(
      await screen.findByRole('rowheader', { name: 'fieldGoalsAttempted' }),
    ).toBeInTheDocument();
    expect(screen.getByText('63.5%')).toBeInTheDocument();
    expect(screen.getByText('57.1%')).toBeInTheDocument();
    expect(screen.getByText(/published as-of time is unknown/)).toBeInTheDocument();
  });
  it('has an explicit unsupported state without inferred zeros', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/totals', () =>
        HttpResponse.json({
          status: 'unsupported',
          provenance,
          totals: null,
          metrics: null,
        }),
      ),
    );
    view();
    expect(
      await screen.findByText(/Raw totals unavailable \(unsupported\)/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('sanitizes source errors independently of other insights', async () => {
    server.use(
      http.get(
        'http://localhost/api/players/2544/totals',
        () => new HttpResponse('private body', { status: 403 }),
      ),
    );
    const result = view();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No substitute statistics',
    );
    expect(result.container).not.toHaveTextContent('private body');
  });
});
