import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './ExplorerPage';

describe('explorer portal', () => {
  it('labels fixture configuration and blocked sources without live claims', async () => {
    server.use(
      http.get('http://localhost/api/data-sources/status', () =>
        HttpResponse.json({
          playerSource: 'fixture',
          checkedAt: '2026-10-13T16:00:00.000Z',
          hostVerified: false,
          capabilities: [
            {
              id: 'shots',
              status: 'blocked',
              reason: 'No verified rights-cleared source.',
            },
          ],
        }),
      ),
    );
    renderApp('/explore');
    expect(
      await screen.findByText('DEMO MODE: player results are deterministic fixtures.'),
    ).toBeInTheDocument();
    expect(screen.getByText('shots: blocked')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Find a player for insights' }),
    ).toBeInTheDocument();
  });
  it('groups reported capabilities by status and links only usable ones', async () => {
    server.use(
      http.get('http://localhost/api/data-sources/status', () =>
        HttpResponse.json({
          playerSource: 'nba-stats',
          checkedAt: '2026-10-13T16:00:00.000Z',
          hostVerified: false,
          capabilities: [
            {
              id: 'player-insights',
              status: 'conditional',
              reason: 'Observed games only.',
            },
            {
              id: 'league-analytics',
              status: 'blocked',
              reason: 'No verified league-wide cohort.',
            },
          ],
        }),
      ),
    );
    renderApp('/explore');
    expect(
      await screen.findByText('Configured player source: nba-stats'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Report generated Oct 13, 2026, 4:00 PM UTC/),
    ).toBeVisible();
    const conditional = screen.getByRole('region', { name: /Conditional/ });
    expect(within(conditional).getByText('player-insights: conditional')).toBeVisible();
    expect(
      within(conditional).getByRole('link', { name: /Open Player insights/ }),
    ).toHaveAttribute('href', '/players');
    const blocked = screen.getByRole('region', { name: /Blocked/ });
    expect(within(blocked).getByText('League-wide analytics')).toBeVisible();
    expect(within(blocked).queryByRole('link')).toBeNull();
    expect(
      within(screen.getByRole('region', { name: /Available/ })).getByText(
        'None reported.',
      ),
    ).toBeVisible();
  });
  it('names every source tape with its coverage, gaps and where it is used', async () => {
    renderApp('/explore');
    const tapes = await screen.findByRole('region', { name: 'The tapes' });
    expect(within(tapes).getAllByRole('article')).toHaveLength(6);
    const shots = within(tapes).getByRole('article', { name: '2018 playoff shots' });
    expect(within(shots).getByText(/coverage ends June 3/)).toBeVisible();
    expect(within(shots).getByRole('link', { name: 'Shot Studio' })).toHaveAttribute(
      'href',
      '/lab/shots',
    );
    const offTape = screen.getByRole('region', { name: 'Not on tape' });
    expect(
      within(offTape).getByText(/Live or current-season scores/),
    ).toBeInTheDocument();
  });
  it('keeps navigation available during source outage', async () => {
    server.use(
      http.get(
        'http://localhost/api/data-sources/status',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/explore');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    // The masthead replaces the old per-page link list; home stays one link away.
    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'NBA Performance Explorer',
      }),
    ).toHaveAttribute('href', '/');
  });
});
