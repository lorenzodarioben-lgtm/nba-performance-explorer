import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './PlayersLanding';

describe('players landing photography', () => {
  it('shows the editorial board with responsive, id-mapped photos', async () => {
    renderApp('/players');
    const board = await screen.findByRole('heading', { name: 'On the board' });
    const section = board.closest('section')!;
    const kyrie = within(section).getByRole('link', { name: /Kyrie Irving/ });
    const img = kyrie.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/images/players/action/irving-1500.webp');
    expect(img.getAttribute('srcset')).toContain(
      '/images/players/action/irving-960.webp 960w',
    );
    expect(img).toHaveAttribute('sizes');
  });

  it('adds current stars and archive legends from the NBA.com headshot packs', async () => {
    renderApp('/players');
    const stars = (
      await screen.findByRole('heading', { name: 'Around the league' })
    ).closest('section')!;
    expect(within(stars).getAllByRole('link')).toHaveLength(19);
    expect(within(stars).getByRole('link', { name: 'Jayson Tatum' })).toHaveAttribute(
      'href',
      '/players/1628369',
    );
    const legends = screen
      .getByRole('heading', { name: 'Legends in the archive' })
      .closest('section')!;
    expect(within(legends).getAllByRole('link')).toHaveLength(39);
    // Legends open the archive record room, which works without NBA.com.
    const jordan = within(legends).getByRole('link', { name: 'Michael Jordan' });
    expect(jordan).toHaveAttribute('href', '/players/893/records');
    expect(jordan.querySelector('img')).toHaveAttribute(
      'src',
      '/images/players/headshots/893-1040.webp',
    );
    // Patrick Ewing was not delivered (the source returned a silhouette), so he is not listed.
    expect(within(legends).queryByRole('link', { name: 'Patrick Ewing' })).toBeNull();
  });
});
