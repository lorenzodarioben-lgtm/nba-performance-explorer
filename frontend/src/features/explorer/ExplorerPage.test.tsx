import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

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
