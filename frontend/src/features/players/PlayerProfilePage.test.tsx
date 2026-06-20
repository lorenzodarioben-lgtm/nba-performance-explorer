import { fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const profileUrl = 'http://localhost/api/players/:playerId';
const healthUrl = 'http://localhost/api/health';

const completeProfile = {
  id: '2544',
  fullName: 'LeBron James',
  team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
  position: 'F',
  jerseyNumber: '23',
  heightInches: 81,
  weightPounds: 250,
  country: 'USA',
  draft: { year: 2003, round: 1, pick: 1 },
};

const minimalProfile = {
  id: '203999',
  fullName: 'Nikola Jokic',
  team: { abbreviation: 'DEN', name: 'Nuggets', city: 'Denver' },
};

const noDraftProfile = {
  id: '1629611',
  fullName: 'Terance Mann',
  team: { abbreviation: 'ATL', name: 'Hawks', city: 'Atlanta' },
  position: 'G-F',
  jerseyNumber: '14',
  heightInches: 77,
  weightPounds: 215,
  country: 'USA',
};

function rowValue(label: string): string {
  const term = screen.getByText(label);
  return term.parentElement?.querySelector('dd')?.textContent ?? '';
}

describe('player profile page', () => {
  it('requests the player id taken from the route', async () => {
    let receivedId = '';
    server.use(
      http.get(profileUrl, ({ params }) => {
        receivedId = String(params.playerId);
        return HttpResponse.json({ player: completeProfile });
      }),
    );

    renderApp('/players/2544');

    await screen.findByRole('heading', { name: 'LeBron James' });
    expect(receivedId).toBe('2544');
  });

  it('passes an abort signal to the request', async () => {
    let hadSignal = false;
    server.use(
      http.get(profileUrl, ({ request }) => {
        hadSignal = request.signal instanceof AbortSignal;
        return HttpResponse.json({ player: completeProfile });
      }),
    );

    renderApp('/players/2544');

    await screen.findByRole('heading', { name: 'LeBron James' });
    expect(hadSignal).toBe(true);
  });

  it('renders an accessible loading state while fetching', async () => {
    server.use(
      http.get(profileUrl, async () => {
        await delay(80);
        return HttpResponse.json({ player: completeProfile });
      }),
    );

    renderApp('/players/2544');

    expect(screen.getByRole('status')).toHaveTextContent('Loading player profile');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    await screen.findByRole('heading', { name: 'LeBron James' });
  });

  it('renders a complete profile with identity, team, and all metadata', async () => {
    server.use(
      http.get(profileUrl, () => HttpResponse.json({ player: completeProfile })),
    );

    const { container } = renderApp('/players/2544');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'LeBron James' }),
    ).toBeInTheDocument();
    expect(rowValue('Team')).toBe('Los Angeles Lakers');
    expect(rowValue('Abbreviation')).toBe('LAL');
    expect(rowValue('Position')).toBe('F');
    expect(rowValue('Jersey number')).toBe('23');
    expect(rowValue('Height')).toBe('6′ 9″');
    expect(rowValue('Weight')).toBe('250 lb');
    expect(rowValue('Country')).toBe('USA');
    expect(rowValue('Draft')).toBe('2003, Round 1, Pick 1');

    // Metadata uses a semantic description list.
    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelectorAll('dl dt').length).toBeGreaterThanOrEqual(2);
  });

  it('preserves a jersey number such as 00', async () => {
    server.use(
      http.get(profileUrl, () =>
        HttpResponse.json({ player: { ...minimalProfile, jerseyNumber: '00' } }),
      ),
    );

    renderApp('/players/203999');

    await screen.findByRole('heading', { name: 'Nikola Jokic' });
    expect(rowValue('Jersey number')).toBe('00');
  });

  it('omits optional rows that are absent without rendering undefined', async () => {
    server.use(
      http.get(profileUrl, () => HttpResponse.json({ player: minimalProfile })),
    );

    const { container } = renderApp('/players/203999');

    await screen.findByRole('heading', { name: 'Nikola Jokic' });
    expect(rowValue('Team')).toBe('Denver Nuggets');
    expect(screen.queryByText('Position')).not.toBeInTheDocument();
    expect(screen.queryByText('Jersey number')).not.toBeInTheDocument();
    expect(screen.queryByText('Height')).not.toBeInTheDocument();
    expect(screen.queryByText('Weight')).not.toBeInTheDocument();
    expect(screen.queryByText('Country')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/undefined|null/);
  });

  it('omits the draft row when draft information is absent', async () => {
    server.use(
      http.get(profileUrl, () => HttpResponse.json({ player: noDraftProfile })),
    );

    renderApp('/players/1629611');

    await screen.findByRole('heading', { name: 'Terance Mann' });
    expect(rowValue('Country')).toBe('USA');
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('renders an accessible not-found state for an unknown player', async () => {
    server.use(
      http.get(profileUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'PLAYER_NOT_FOUND',
              message: 'Player not found.',
              status: 404,
            },
          },
          { status: 404 },
        ),
      ),
    );

    renderApp('/players/999999');

    expect(
      await screen.findByRole('heading', { name: 'Player not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders the invalid-link state without making a request', async () => {
    let requestCount = 0;
    server.use(
      http.get(profileUrl, () => {
        requestCount += 1;
        return HttpResponse.json({ player: completeProfile });
      }),
    );

    renderApp('/players/abc');

    expect(
      await screen.findByRole('heading', { name: 'Invalid player link' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to search' })).toBeInTheDocument();
    expect(requestCount).toBe(0);
  });

  it('renders an accessible generic error state for a server failure', async () => {
    server.use(
      http.get(profileUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred.',
              status: 500,
            },
          },
          { status: 500 },
        ),
      ),
    );

    renderApp('/players/2544');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(
      screen.getByRole('heading', { name: 'Player profile unavailable' }),
    ).toBeInTheDocument();
  });

  it('treats a contract-invalid success response as a generic error', async () => {
    server.use(
      http.get(profileUrl, () =>
        HttpResponse.json({ player: { id: '2544', name: 'LeBron James' } }),
      ),
    );

    renderApp('/players/2544');

    expect(
      await screen.findByRole('heading', { name: 'Player profile unavailable' }),
    ).toBeInTheDocument();
  });

  it('navigates back to search', async () => {
    server.use(
      http.get(profileUrl, () => HttpResponse.json({ player: completeProfile })),
      http.get(healthUrl, () =>
        HttpResponse.json({
          status: 'ok',
          timestamp: '2026-06-21T00:00:00.000Z',
          service: 'nba-performance-explorer-api',
        }),
      ),
    );

    renderApp('/players/2544');

    await screen.findByRole('heading', { name: 'LeBron James' });
    fireEvent.click(screen.getByRole('link', { name: 'Back to search' }));

    expect(
      await screen.findByRole('combobox', { name: 'Search NBA players' }),
    ).toBeInTheDocument();
  });

  it('moves focus to the heading after the profile loads', async () => {
    server.use(
      http.get(profileUrl, () => HttpResponse.json({ player: completeProfile })),
    );

    renderApp('/players/2544');

    const heading = await screen.findByRole('heading', { name: 'LeBron James' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });
});
