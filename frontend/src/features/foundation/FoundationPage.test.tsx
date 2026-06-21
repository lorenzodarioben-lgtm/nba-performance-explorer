import { screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

const healthUrl = 'http://localhost/api/health';

describe('foundation health status', () => {
  it('renders an accessible loading state', () => {
    server.use(
      http.get(healthUrl, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );

    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent('Checking backend status');
  });

  it('displays a valid backend health response', async () => {
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

    expect(await screen.findByText('Backend status: ok')).toBeInTheDocument();
    expect(
      screen.getByText('Service: nba-performance-explorer-api'),
    ).toBeInTheDocument();
  });

  it('renders an accessible error state for a server failure', async () => {
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend status unavailable',
    );
  });

  it('links to the two-player comparison page', () => {
    server.use(
      http.get(healthUrl, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );

    renderApp();

    expect(screen.getByRole('link', { name: 'Compare two players' })).toHaveAttribute(
      'href',
      '/compare',
    );
  });

  it('treats data that violates the shared health contract as an error', async () => {
    server.use(
      http.get(healthUrl, () =>
        HttpResponse.json({
          status: 'healthy',
          timestamp: 'not-a-timestamp',
          service: 'different-service',
        }),
      ),
    );

    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The health check could not be completed',
    );
  });
});
