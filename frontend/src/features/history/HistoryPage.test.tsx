import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
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
  it('blocks invalid direct state before fetching and renders source failure without invented facts', async () => {
    renderApp('/history?champion=evil');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid historical selection',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
