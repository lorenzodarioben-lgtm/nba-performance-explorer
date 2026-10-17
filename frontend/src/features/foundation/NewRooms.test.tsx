import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { InternalResearchPathSchema } from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subjects before assertion timers; the app still renders the actual lazy routes.
import './TourPage';

describe('homepage band for the new rooms', () => {
  it('links every new room and falls back to static figures when the bracket is down', async () => {
    server.use(
      http.get(
        'http://localhost/api/games/bracket',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/');
    const band = await screen.findByRole('region', { name: 'New in the film room' });
    const links = within(band).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/tour',
      '/games/series/r4-BOS-DAL',
      '/my-nba/stories',
      '/lab/workbench',
      '/compare/recorded?players=203999,203507',
      '/lab/shots?players=201939&view=density&region=-8,-6,8,8',
      '/games/bracket',
    ]);
    expect(
      within(band).getByRole('link', { name: /Series film room/ }),
    ).toHaveTextContent('15series');
  });
});

describe('guided tour', () => {
  it('walks explore, investigate, compare and create through real research routes', async () => {
    renderApp('/tour');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The five-minute tour' }),
    ).toBeInTheDocument();
    const stops = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('href')!)
      .filter((h) =>
        [
          '/games/bracket',
          '/standings/race',
          '/games/series/r4-BOS-DAL?game=4',
          '/lab/shots?players=201939&view=density',
          '/compare/recorded?players=203999,203507',
          '/lab/workbench?view=relationship&metric=pointsPerGame&y=assistsPerGame',
          '/my-nba/stories',
        ].includes(h),
      );
    expect(new Set(stops).size).toBe(7);
    // Every stop except the local stories page is a saveable research route.
    for (const h of stops.filter((x) => x !== '/my-nba/stories'))
      expect(InternalResearchPathSchema.safeParse(h).success, h).toBe(true);
    expect(
      screen.getByText(/explore, investigate, compare, create/),
    ).toBeInTheDocument();
  });
});
