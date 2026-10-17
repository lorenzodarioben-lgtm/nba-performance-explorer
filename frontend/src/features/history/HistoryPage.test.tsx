import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './HistoryPage';
const body = {
  status: 'available',
  sourceSeasons: 2,
  navigation: { previous: null, next: '2001-02' },
  coverage: { rawRows: 3, excludedRows: 1, missingWinners: 1, capped: false },
  seasons: [
    {
      id: 'wd:Q1',
      season: '1999-00',
      sourceLabel: '1999–2000 NBA season',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1',
      winners: [
        {
          id: 'wd:Q10',
          label: 'Fixture modern franchise name',
          sourceUrl: 'https://www.wikidata.org/wiki/Q10',
        },
      ],
    },
    {
      id: 'wd:Q2',
      season: '2001-02',
      sourceLabel: '2001-02 NBA season',
      sourceUrl: 'https://www.wikidata.org/wiki/Q2',
      winners: [],
    },
  ],
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T19:00:00.000Z',
    retrievedAt: '2026-10-13T18:00:00.000Z',
    asOf: null,
    isLive: false,
    scope: 'history',
    coverage: 'Test facts only.',
    warnings: ['DEMO FIXTURES'],
  },
};
describe('historical navigator', () => {
  it('shows the archive photograph on the index only, never on a single season', async () => {
    server.use(
      http.get('http://localhost/api/history/seasons', () => HttpResponse.json(body)),
      http.get('http://localhost/api/history/seasons/:season', () =>
        HttpResponse.json(body),
      ),
    );
    const { container, unmount } = renderApp('/history');
    await screen.findByRole('heading', {
      level: 1,
      name: 'Historical season navigator',
    });
    const shot = container.querySelector('.histshot img');
    expect(shot).toHaveAttribute('src', '/images/scenes/kobe-shaq-1672.webp');
    // Decorative inside an aria-hidden backdrop; retain subject metadata without a caption.
    expect(shot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(shot).toHaveAttribute('alt', expect.stringContaining('Kobe Bryant'));
    expect(container.querySelector('.histshot figcaption')).toBeNull();
    unmount();
    const season = renderApp('/history/1999-00');
    await screen.findByRole('table');
    expect(season.container.querySelector('.histshot')).toBeNull();
  });
  it('preserves entity source links, missing winners and record-backed navigation', async () => {
    server.use(
      http.get('http://localhost/api/history/seasons/:season', () =>
        HttpResponse.json(body),
      ),
    );
    renderApp('/history/1999-00');
    await screen.findByRole('table');
    expect(screen.getByText('Champion unavailable in source')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fixture modern franchise name' }),
    ).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q10');
    expect(
      screen.getByRole('link', { name: 'Next recorded season: 2001-02' }),
    ).toHaveAttribute('href', '/history/2001-02');
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('shares year/entity filters and retains meaningful source coverage', async () => {
    let last = '';
    server.use(
      http.get('http://localhost/api/history/seasons', ({ request }) => {
        last = new URL(request.url).search;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/history?from=1990&to=2005');
    fireEvent.click(await screen.findByText('View all 2 season records'));
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Champion source entity'), {
      target: { value: 'wd:Q10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply historical filters' }));
    await waitFor(() => expect(last).toContain('champion=wd%3AQ10'));
    expect(last).toContain('from=1990');
    expect(screen.getByText(/source seasons lack/)).toHaveTextContent(
      '1 source seasons lack champion statements',
    );
  });
  it('derives the range from returned records and switches accessible decade chapters', async () => {
    server.use(
      http.get('http://localhost/api/history/seasons', () => HttpResponse.json(body)),
    );
    renderApp('/history');
    expect(
      await screen.findByText('2 matching seasons · 1999–00 to 2001–02'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('DEMO FIXTURES — not real NBA results'),
    ).toBeInTheDocument();
    const chapters = screen.getByRole('navigation', { name: 'Explore decades' });
    expect(
      within(chapters).getByRole('button', { name: '1990s · 1 season' }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(chapters).getByRole('button', { name: '2000s · 1 season' }));
    expect(
      screen.getByRole('link', {
        name: '2001-02 season: champion unavailable in source',
      }),
    ).toHaveAttribute('href', '/history/2001-02');
    expect(screen.getByRole('button', { name: 'Next decade' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous decade' }));
    expect(
      screen.getByRole('link', {
        name: '1999-00 season: Fixture modern franchise name',
      }),
    ).toHaveAttribute('href', '/history/1999-00');
    expect(screen.getByRole('table').closest('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('View all 2 season records'));
    expect(screen.getByRole('table').closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('table')).toBeVisible();
    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Fixture modern franchise name',
      }),
    ).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q10');
  });
  it('resets URL filters and input values together without changing source meanings', async () => {
    let last = '';
    server.use(
      http.get('http://localhost/api/history/seasons', ({ request }) => {
        last = new URL(request.url).search;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/history?from=1990&to=2005&champion=wd%3AQ10');
    await screen.findByText('2 matching seasons · 1999–00 to 2001–02');
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(last).toBe(''));
    expect(screen.getByLabelText('First season start year')).toHaveValue(null);
    expect(screen.getByLabelText('Champion source entity')).toHaveValue('');
  });
  it('keeps source failure and empty selections honest and usable', async () => {
    server.use(
      http.get(
        'http://localhost/api/history/seasons',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    const { unmount } = renderApp('/history');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No substitute facts are shown',
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Apply historical filters' }),
    ).toBeEnabled();
    unmount();
    server.use(
      http.get('http://localhost/api/history/seasons', () =>
        HttpResponse.json({ ...body, status: 'records-unavailable', seasons: [] }),
      ),
    );
    renderApp('/history');
    expect(
      await screen.findByText('No recorded historical facts match this selection.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Explore decades' })).toBeNull();
    expect(screen.getByText(/Source status: records-unavailable/)).toBeInTheDocument();
  });
  it('blocks invalid direct state before fetching and renders source failure without invented facts', async () => {
    renderApp('/history?champion=evil');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid historical selection',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('2023–24 season research hub', () => {
  it('shows four research paths that fail independently, and every season tool', async () => {
    server.use(
      http.get('http://localhost/api/history/seasons/:season', () =>
        HttpResponse.json({
          ...body,
          seasons: [{ ...body.seasons[0]!, season: '2023-24' }],
        }),
      ),
      http.get(
        'http://localhost/api/recorded/team-rankings',
        () => new HttpResponse(null, { status: 503 }),
      ),
      http.get(
        'http://localhost/api/games/bracket',
        () => new HttpResponse(null, { status: 503 }),
      ),
      http.get(
        'http://localhost/api/recorded/leaders',
        () => new HttpResponse(null, { status: 503 }),
      ),
      http.get(
        'http://localhost/api/recorded/records',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/history/2023-24');
    const hub = await screen.findByRole('region', {
      name: 'Research the 2023–24 season',
    });
    for (const title of [
      'The best regular season',
      "The champion's run",
      'The top scorer in the record',
      'The highest-scoring game',
    ])
      expect(within(hub).getByRole('heading', { name: title })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(hub).getAllByText(
          'This source is unavailable right now; no substitute is shown.',
        ),
      ).toHaveLength(4),
    );
    // The champion path still points at the recorded playoff games when the bracket is down.
    expect(
      within(hub).getByRole('link', { name: 'Recorded playoff games' }),
    ).toHaveAttribute('href', '/games');
    expect(within(hub).getByRole('link', { name: /Standings race/ })).toHaveAttribute(
      'href',
      '/standings/race',
    );
    expect(
      within(hub).getAllByRole('link', { name: /./ }).length,
    ).toBeGreaterThanOrEqual(9);
  });

  it('appears only on the 2023–24 season', async () => {
    server.use(
      http.get('http://localhost/api/history/seasons/:season', () =>
        HttpResponse.json(body),
      ),
    );
    renderApp('/history/1999-00');
    await screen.findByRole('table');
    expect(
      screen.queryByRole('region', { name: 'Research the 2023–24 season' }),
    ).toBeNull();
  });
});
