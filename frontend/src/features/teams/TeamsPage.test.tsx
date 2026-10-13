import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const team = {
  id: 'nba:1610612744',
  sourceId: '1610612744',
  abbreviation: 'GSW',
  name: 'Golden State Warriors',
};
const provenance = {
  source: 'nba-api-static',
  servedAt: '2026-10-13T16:00:00.000Z',
  retrievedAt: null,
  asOf: null,
  isLive: false,
  scope: 'directory',
  coverage: 'Current identity facts only.',
  warnings: ['MIT-licensed directory, Swar Patel.'],
};

describe('team pages', () => {
  it('filters via shareable URL and links namespaced current identities', async () => {
    let search = '';
    server.use(
      http.get('http://localhost/api/teams', ({ request }) => {
        search = new URL(request.url).searchParams.get('search') ?? '';
        return HttpResponse.json({ teams: [team], provenance });
      }),
    );
    renderApp('/teams');
    expect(await screen.findByRole('link', { name: team.name })).toHaveAttribute(
      'href',
      '/teams/nba:1610612744',
    );
    fireEvent.change(screen.getByLabelText('Team name or abbreviation'), {
      target: { value: 'GSW' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find teams' }));
    await waitFor(() => expect(search).toBe('GSW'));
  });
  it('discloses missing rosters/schedules instead of rendering fake records', async () => {
    server.use(
      http.get('http://localhost/api/teams/:teamId', () =>
        HttpResponse.json({
          team,
          provenance,
          availability: {
            roster: false,
            schedule: false,
            statistics: false,
            reason: 'No rights-cleared season source.',
          },
        }),
      ),
    );
    renderApp('/teams/nba:1610612744');
    await screen.findByRole('heading', { name: team.name, level: 1 });
    expect(screen.getByText('Season data unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to My NBA' })).toBeInTheDocument();
  });
  it('handles empty matches and source failures', async () => {
    server.use(
      http.get('http://localhost/api/teams', () =>
        HttpResponse.json({ teams: [], provenance }),
      ),
    );
    const view = renderApp('/teams?search=unknown');
    expect(
      await screen.findByText('No current teams match this search.'),
    ).toBeInTheDocument();
    view.unmount();
    server.use(
      http.get(
        'http://localhost/api/teams',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/teams');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
