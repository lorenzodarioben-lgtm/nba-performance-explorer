import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { RecordedProfilesResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
const metrics: RecordedProfilesResponse['metrics'] = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
];
const body: RecordedProfilesResponse = {
  season: '2023-24',
  scope: 'regular-season',
  minGames: 20,
  population: 3,
  metrics,
  metricPopulations: metrics.map((metric) => ({
    metric,
    qualified: 4,
    mean: 2,
    standardDeviation: 1,
  })),
  profiles: [
    {
      playerId: '201939',
      name: 'Fixture Curry',
      gamesPlayed: 40,
      available: true,
      categories: metrics.map((metric, i) => ({
        metric,
        value: i + 1,
        rank: 2,
        percentile: 50,
        zScore: 0,
      })),
    },
    {
      playerId: '999',
      name: null,
      gamesPlayed: null,
      available: false,
      categories: [],
    },
  ],
  sourceRows: 5,
  unknownScopeRows: 1,
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  attributions: Array.from({ length: 30 }, (_, i) => ({
    ...leagueFixture.attribution,
    revision: 1234 + i,
    url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
  })),
  provenance: leagueFixture.provenance,
};
const directory = {
  season: '2023-24',
  teams: Array.from({ length: 30 }, () => leagueFixture.standings[0]!.team),
  players: [
    {
      playerId: '201939',
      name: 'Fixture Curry',
      teams: [leagueFixture.standings[0]!.team],
    },
    {
      playerId: '2544',
      name: 'Fixture James',
      teams: [leagueFixture.standings[0]!.team],
    },
  ],
  attributions: body.attributions,
  provenance: leagueFixture.provenance,
};
describe('percentile profiles UI', () => {
  it('has exact table/strip parity and never plots an excluded identity at zero', async () => {
    server.use(
      http.get('http://localhost/api/recorded/directory', () =>
        HttpResponse.json(directory),
      ),
      http.get('http://localhost/api/recorded/profiles', () => HttpResponse.json(body)),
    );
    const { container } = renderApp('/lab/profiles?players=201939,999');
    await screen.findByRole('group', { name: 'Percentile profile exact values' });
    expect(container.querySelectorAll('[data-profile]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-profile="999"]')).toHaveLength(0);
    expect(container.querySelectorAll('tbody')[0]?.querySelectorAll('tr')).toHaveLength(
      3,
    );
    expect(
      screen.getByText(/no values or zero-percentile marks imputed/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Common cohort: 3 players/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('updates known-player selection and category URLs while keeping invalid selections editable', async () => {
    let latest = '';
    const read = vi.fn(({ request }: { request: Request }) => {
      latest = request.url;
      return HttpResponse.json(body);
    });
    server.use(
      http.get('http://localhost/api/recorded/directory', () =>
        HttpResponse.json(directory),
      ),
      http.get('http://localhost/api/recorded/profiles', read),
    );
    renderApp('/lab/profiles?metrics=pointsPerGame,reboundsPerGame,assistsPerGame');
    await screen.findByRole('option', { name: 'Fixture James (2544)' });
    await screen.findByRole('group', { name: 'Percentile profile exact values' });
    fireEvent.change(screen.getByLabelText('Add known historical player'), {
      target: { value: '2544' },
    });
    await waitFor(() => expect(latest).toContain('players=201939%2C2544'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'PPG — pointsPerGame' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.getByLabelText('Profile NBA player IDs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'PPG — pointsPerGame' }));
    await waitFor(() => expect(latest).toContain('assistsPerGame%2CpointsPerGame'));
  });
  it('blocks repeated queries before reads and shows unavailable source without synthetic profiles', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/recorded/profiles', read));
    const v = renderApp('/lab/profiles?players=201939&players=2544');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    v.unmount();
    renderApp('/lab/profiles');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(
      screen.queryByRole('img', { name: /Common-cohort/ }),
    ).not.toBeInTheDocument();
  });
});
