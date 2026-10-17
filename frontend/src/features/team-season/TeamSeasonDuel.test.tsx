import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { server } from '../../test/server';
import { teamSeasonFixture } from './team-season-fixtures';
import { TeamSeasonDuel } from './TeamSeasonDuel';

const denver = {
  id: 'nba:1610612743',
  sourceId: '1610612743',
  abbreviation: 'DEN',
  name: 'Denver Nuggets',
};

function renderDuel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <TeamSeasonDuel teams={['nba:1610612747', 'nba:1610612743']} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('two-team season duel', () => {
  it('compares every shared split for both teams with identical definitions', async () => {
    const lakers = teamSeasonFixture();
    const nuggets = {
      ...teamSeasonFixture(),
      team: denver,
      splits: teamSeasonFixture().splits.filter((s) => s.key !== 'overtime'),
    };
    const requested: string[] = [];
    server.use(
      http.get('http://localhost/api/recorded/team-season', ({ request }) => {
        const team = new URL(request.url).searchParams.get('team')!;
        requested.push(team);
        return HttpResponse.json(team === denver.id ? nuggets : lakers);
      }),
    );
    renderDuel();
    const table = await screen.findByRole('group', { name: 'Split comparison' });
    expect(requested.sort()).toEqual(['nba:1610612743', 'nba:1610612747']);
    const rows = within(table).getAllByRole('row');
    // Only splits both teams have: the fixture's five minus Denver's missing overtime split.
    expect(rows).toHaveLength(1 + 4);
    expect(within(table).queryByText(/Overtime games/)).toBeNull();
    expect(
      within(table).getByText(/Second of a back-to-back \(small sample\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DEN season in full' })).toHaveAttribute(
      'href',
      '/teams/nba:1610612743/season',
    );
  });

  it('reports a failure without drawing a partial comparison', async () => {
    server.use(
      http.get('http://localhost/api/recorded/team-season', ({ request }) =>
        new URL(request.url).searchParams.get('team') === denver.id
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json(teamSeasonFixture()),
      ),
    );
    renderDuel();
    expect(await screen.findByRole('alert')).toHaveTextContent('Data unavailable');
    expect(screen.queryByRole('group', { name: 'Split comparison' })).toBeNull();
  });
});
