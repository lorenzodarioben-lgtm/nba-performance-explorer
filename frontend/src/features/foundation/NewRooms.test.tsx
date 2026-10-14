import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';

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
      '/standings/race',
      '/games/bracket',
      '/teams',
      '/lab/shots?view=zones',
      '/lab/formulas',
    ]);
    expect(
      within(band).getByRole('link', { name: /Playoff bracket/ }),
    ).toHaveTextContent('15series');
  });
});
