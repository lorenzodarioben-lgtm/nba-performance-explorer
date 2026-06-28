import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from './test/renderApp';
import { server } from './test/server';

const healthUrl = 'http://localhost/api/health';

// Hold the health check open so the home route renders without a post-render state update during
// the synchronous shell assertions. The shell, not the live status, is under test here.
function mockHealthPending() {
  server.use(
    http.get(healthUrl, async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  );
}

describe('application shell', () => {
  it('renders a single banner header with the product identity linking home and a Compare link', () => {
    mockHealthPending();
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(
      within(banner).getByRole('link', { name: 'NBA Performance Explorer' }),
    ).toHaveAttribute('href', '/');
    expect(within(banner).getByRole('link', { name: 'Compare' })).toHaveAttribute(
      'href',
      '/compare',
    );
  });

  it('renders a single contentinfo footer carrying the non-affiliation notice', () => {
    mockHealthPending();
    renderApp('/');

    const footers = screen.getAllByRole('contentinfo');
    expect(footers).toHaveLength(1);
    expect(footers[0]).toHaveTextContent('not affiliated with the NBA');
  });

  it('keeps exactly one route-level heading and one main on the home route', () => {
    mockHealthPending();
    renderApp('/');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'NBA Performance Explorer',
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
    // The header identity is a link, not a second page heading.
    expect(
      screen.getByRole('link', { name: 'NBA Performance Explorer' }),
    ).toBeInTheDocument();
  });

  it('shows the shared shell on the comparison route with its own route heading', () => {
    renderApp('/compare');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Compare players');
  });

  it('shows the shared shell on a profile route while the route heading stays the page heading', async () => {
    server.use(
      http.get('http://localhost/api/players/201939', () =>
        HttpResponse.json({
          player: {
            id: '201939',
            fullName: 'Stephen Curry',
            team: { abbreviation: 'GSW', name: 'Warriors', city: 'Golden State' },
            position: 'G',
          },
        }),
      ),
      http.get('http://localhost/api/players/201939/seasons', () =>
        HttpResponse.json({ seasons: [] }),
      ),
      http.get('http://localhost/api/players/201939/season-trends', () =>
        HttpResponse.json({ seasons: [] }),
      ),
    );
    renderApp('/players/201939');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stephen Curry' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
