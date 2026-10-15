import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './FoundationPage';

const healthUrl = 'http://localhost/api/health';

function mockHealthPending() {
  server.use(
    http.get(healthUrl, async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  );
}

describe('landing page', () => {
  it('presents the product hero with a clear value proposition', () => {
    mockHealthPending();
    renderApp();

    expect(
      // The h1 carries the product name with the "Read the game." headline.
      screen.getByRole('heading', { level: 1, name: /NBA Performance Explorer/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Search any NBA player and explore/i)).toBeInTheDocument();
    // The supported capabilities are listed.
    expect(screen.getByText('Two-player season comparisons')).toBeInTheDocument();
  });

  it('does not present itself as a development scaffold', () => {
    mockHealthPending();
    renderApp();

    expect(screen.queryByText(/Project foundation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Backend status/i)).not.toBeInTheDocument();
    // No raw backend service identifier is exposed in the UI.
    expect(screen.queryByText(/nba-performance-explorer-api/)).not.toBeInTheDocument();
  });

  it('keeps the player search as the primary action', () => {
    mockHealthPending();
    renderApp();

    expect(
      screen.getByRole('combobox', { name: 'Search NBA players' }),
    ).toBeInTheDocument();
  });

  it('moves focus to the page heading on entry', async () => {
    mockHealthPending();
    renderApp();

    const heading = screen.getByRole('heading', {
      level: 1,
      name: /NBA Performance Explorer/,
    });
    await waitFor(() => expect(heading).toHaveFocus());
    // The heading is programmatically focusable but must not be a permanent tab stop.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('links to the two-player comparison page', () => {
    mockHealthPending();
    renderApp();

    expect(screen.getByRole('link', { name: 'Compare two players' })).toHaveAttribute(
      'href',
      '/compare',
    );
  });

  it('shows an accessible connecting state while the data service responds', () => {
    mockHealthPending();
    renderApp();

    const status = screen.getByRole('status');
    // Plain-language status: the data service, never "live data".
    expect(status).toHaveTextContent('Connecting to the data service');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('reports the data service as available on a successful health check', async () => {
    server.use(
      http.get(healthUrl, () =>
        HttpResponse.json({
          status: 'ok',
          timestamp: '2026-06-20T12:00:00.000Z',
          service: 'nba-performance-explorer-api',
        }),
      ),
    );

    renderApp();

    expect(await screen.findByText('Data service available')).toBeInTheDocument();
    // The raw service identifier is never rendered, even though the response contains it.
    expect(screen.queryByText(/nba-performance-explorer-api/)).not.toBeInTheDocument();
  });

  it('reports a temporarily unavailable data service on a failed health check', async () => {
    server.use(
      http.get(healthUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Unexpected error',
              status: 500,
            },
          },
          { status: 500 },
        ),
      ),
    );

    renderApp();

    expect(
      await screen.findByText(/Data service temporarily unavailable/),
    ).toBeInTheDocument();
    // A failed health check must not block or disable the player search.
    expect(
      screen.getByRole('combobox', { name: 'Search NBA players' }),
    ).toBeInTheDocument();
  });
});
