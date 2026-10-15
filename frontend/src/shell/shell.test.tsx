import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/renderApp';
import { server } from '../test/server';
import { hasSubnav, pageForPath, sectionForPath } from './sections';
// Compile the lazily loaded search overlay before assertion timers.
import './SearchOverlay';

const directoryProvenance = {
  source: 'nba-api-static',
  servedAt: '2026-10-13T16:00:00.000Z',
  retrievedAt: null,
  asOf: null,
  isLive: false,
  scope: 'directory',
  coverage: 'Current team identities.',
  warnings: [],
};

function holdHealth() {
  server.use(
    http.get('http://localhost/api/health', async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  );
}

describe('information architecture', () => {
  it('assigns every published route to its section', () => {
    expect(sectionForPath('/players/201939/career')?.id).toBe('players');
    expect(sectionForPath('/teams/nba:1610612744')?.id).toBe('teams');
    expect(sectionForPath('/games/nba:0042300405')?.id).toBe('games');
    expect(sectionForPath('/history/calendar')?.id).toBe('games');
    expect(sectionForPath('/history/2023-24')?.id).toBe('seasons');
    expect(sectionForPath('/standings/recorded')?.id).toBe('seasons');
    expect(sectionForPath('/lab/compare')?.id).toBe('compare');
    expect(sectionForPath('/lab/shots')?.id).toBe('labs');
    expect(sectionForPath('/my-nba')).toBeNull();
    expect(pageForPath('/history/2023-24')?.label).toBe('Seasons');
    expect(hasSubnav('/leaders')).toBe(true);
    expect(hasSubnav('/players/2544')).toBe(false);
  });
});

describe('masthead', () => {
  it('marks the active section and shows its sub-navigation', async () => {
    renderApp('/standings/recorded');
    const banner = screen.getByRole('banner');
    const primary = within(banner).getByRole('navigation', { name: 'Primary' });
    expect(within(primary).getByRole('link', { name: 'Seasons' })).toHaveClass('is-on');
    const subnav = within(banner).getByRole('navigation', { name: 'Seasons pages' });
    expect(within(subnav).getByRole('link', { name: 'Team rankings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens search with the slash key and goes to a team hub', async () => {
    holdHealth();
    server.use(
      http.get('http://localhost/api/teams', () =>
        HttpResponse.json({
          teams: [
            {
              id: 'nba:1610612744',
              sourceId: '1610612744',
              abbreviation: 'GSW',
              name: 'Golden State Warriors',
            },
          ],
          provenance: directoryProvenance,
        }),
      ),
      http.get('http://localhost/api/players', () =>
        HttpResponse.json({ players: [] }),
      ),
      http.get(
        'http://localhost/api/teams/:teamId',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/');

    // A keyboard reader who has tabbed to the masthead trigger presses the shortcut there.
    screen.getByRole('button', { name: /Search players, teams, tools/ }).focus();
    fireEvent.keyDown(document.body, { key: '/' });
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    const input = within(dialog).getByRole('combobox', {
      name: 'Search players, teams and tools',
    });
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.change(input, { target: { value: 'warriors' } });
    // The hub is the first team result; the season room follows it as its own option.
    const option = await within(dialog).findByRole('option', {
      name: /Golden State Warriors.*Team hub/,
    });
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(
      within(dialog).getByRole('option', {
        name: /Golden State Warriors · 2023–24 season/,
      }),
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument(),
    );
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Team identity');
    // Choosing a result hands focus to the destination's heading, not back to the trigger.
    // (Tests skip the overlay's exit animation; the browser ordering, where the restore ran
    // after the new heading took focus, is checked in Chromium per the verification log.)
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('lists sections and tools before anything is typed and closes on Escape', async () => {
    holdHealth();
    server.use(
      http.get('http://localhost/api/teams', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderApp('/');
    const trigger = screen.getByRole('button', {
      name: /Search players, teams, tools/,
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(
      within(dialog).getByRole('option', { name: /Shot Studio|Labs/ }),
    ).toBeTruthy();
    fireEvent.keyDown(within(dialog).getByRole('combobox'), { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument(),
    );
    // Dismissing without a choice gives focus back to the trigger.
    expect(trigger).toHaveFocus();
  });
});

describe('landings and fallbacks', () => {
  it('renders an off-the-court page for an unknown address', async () => {
    renderApp('/this-route-does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Off the court.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/this-route-does-not-exist')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('renders the players landing with search and the hub rooms', async () => {
    renderApp('/players');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Every player. One hub.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Find a player' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Stephen Curry/ })).toHaveAttribute(
      'href',
      '/players/201939',
    );
    expect(
      screen.getByRole('heading', { name: 'Inside a player hub' }),
    ).toBeInTheDocument();
  });

  it('renders the labs landing with every research bench', async () => {
    renderApp('/labs');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Study the tape.' }),
    ).toBeInTheDocument();
    const main = screen.getByRole('main');
    for (const name of [
      'Shot Studio',
      'Lineups',
      'Group analytics',
      'Group discovery',
    ]) {
      expect(
        within(main).getByRole('link', { name: new RegExp(name) }),
      ).toBeInTheDocument();
    }
  });
});

describe('search reach (3.0)', () => {
  it('folds case and accents', async () => {
    const { fold } = await import('./fold');
    expect(fold('Luka Dončić')).toBe('luka doncic');
    expect(fold('Nikola Jokić').includes(fold('JOKIC'))).toBe(true);
    expect(fold('Alperen Şengün')).toBe('alperen sengun');
  });

  it('finds recorded archive players by accent-free name and opens their 2023–24 room', async () => {
    server.use(
      http.get('http://localhost/api/recorded/directory', () =>
        HttpResponse.json({
          season: '2023-24',
          teams: Array.from({ length: 30 }, (_, i) => ({
            id: `nba:${1610612737 + i}`,
            sourceId: `${1610612737 + i}`,
            abbreviation: `T${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
            name: `Team ${i}`,
          })),
          players: [
            {
              playerId: '1629029',
              name: 'Luka Dončić',
              teams: [
                {
                  id: 'nba:1610612742',
                  sourceId: '1610612742',
                  abbreviation: 'DAL',
                  name: 'Dallas Mavericks',
                },
              ],
            },
          ],
          attributions: Array.from({ length: 30 }, () => ({
            title: '2023–24 Dallas Mavericks season',
            revision: 1,
            url: 'https://en.wikipedia.org/w/index.php?oldid=1',
            license: 'CC BY-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            adapted: true,
          })),
          provenance: {
            source: 'wikipedia',
            servedAt: '2026-10-13T16:00:00.000Z',
            retrievedAt: null,
            asOf: null,
            isLive: false,
            scope: 'regular-season',
            coverage: 'Recorded directory.',
            warnings: [],
          },
        }),
      ),
    );
    renderApp('/');
    fireEvent.keyDown(document.body, { key: '/' });
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    fireEvent.change(within(dialog).getByRole('combobox'), {
      target: { value: 'doncic' },
    });
    const option = await within(dialog).findByRole('option', {
      name: /Luka Dončić.*DAL · 2023–24 recorded season/,
    });
    fireEvent.click(option);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Search' })).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /2023–24 recorded season/ }),
    ).toBeInTheDocument();
  });

  it('matches tools by the words people use for them', async () => {
    renderApp('/');
    fireEvent.keyDown(document.body, { key: '/' });
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    const input = within(dialog).getByRole('combobox');
    fireEvent.change(input, { target: { value: 'postseason' } });
    expect(
      await within(dialog).findByRole('option', { name: /Playoff bracket/ }),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'heatmap' } });
    expect(
      await within(dialog).findByRole('option', { name: /Shot Studio/ }),
    ).toBeInTheDocument();
  });
});
