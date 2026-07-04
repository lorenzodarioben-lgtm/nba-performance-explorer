import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { playerSearchDebounceMilliseconds } from '../player-search/useDebouncedSearchTerm';

interface TestPlayer {
  profile: {
    id: string;
    fullName: string;
    team: { abbreviation: string; name: string; city: string };
    position?: string;
  };
  seasons: { season: string; team: { abbreviation: string } }[];
  stats: Record<string, Record<string, unknown>>;
}

function makeStats(
  season: string,
  team: string,
  overrides: Record<string, number> = {},
) {
  return {
    season,
    team: { abbreviation: team },
    gamesPlayed: 70,
    minutesPerGame: 35,
    pointsPerGame: 27,
    reboundsPerGame: 7,
    assistsPerGame: 7,
    stealsPerGame: 1,
    blocksPerGame: 0.5,
    turnoversPerGame: 3,
    fieldGoalPercentage: 0.5,
    threePointPercentage: 0.4,
    freeThrowPercentage: 0.8,
    ...overrides,
  };
}

const players: Record<string, TestPlayer> = {
  '2544': {
    profile: {
      id: '2544',
      fullName: 'LeBron James',
      team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
      position: 'F',
    },
    seasons: [
      { season: '2023-24', team: { abbreviation: 'LAL' } },
      { season: '2018-19', team: { abbreviation: 'LAL' } },
      { season: '2017-18', team: { abbreviation: 'CLE' } },
    ],
    stats: {
      '2023-24': makeStats('2023-24', 'LAL', { gamesPlayed: 71, pointsPerGame: 25.7 }),
      '2018-19': makeStats('2018-19', 'LAL', { gamesPlayed: 55, pointsPerGame: 27.4 }),
      '2017-18': makeStats('2017-18', 'CLE', { gamesPlayed: 82, pointsPerGame: 27.5 }),
    },
  },
  '201939': {
    profile: {
      id: '201939',
      fullName: 'Stephen Curry',
      team: { abbreviation: 'GSW', name: 'Warriors', city: 'Golden State' },
      position: 'G',
    },
    seasons: [
      { season: '2023-24', team: { abbreviation: 'GSW' } },
      { season: '2022-23', team: { abbreviation: 'GSW' } },
      { season: '2017-18', team: { abbreviation: 'GSW' } },
    ],
    stats: {
      '2023-24': makeStats('2023-24', 'GSW', { gamesPlayed: 74, pointsPerGame: 26.4 }),
      '2022-23': makeStats('2022-23', 'GSW', { gamesPlayed: 56, blocksPerGame: 0 }),
      '2017-18': makeStats('2017-18', 'GSW', { gamesPlayed: 51, pointsPerGame: 26.4 }),
    },
  },
  '1641705': {
    profile: {
      id: '1641705',
      fullName: 'Victor Wembanyama',
      team: { abbreviation: 'SAS', name: 'Spurs', city: 'San Antonio' },
      position: 'C',
    },
    seasons: [{ season: '2023-24', team: { abbreviation: 'SAS' } }],
    stats: {
      '2023-24': makeStats('2023-24', 'SAS', { gamesPlayed: 71, blocksPerGame: 3.6 }),
    },
  },
  '201142': {
    profile: {
      id: '201142',
      fullName: 'Kevin Durant',
      team: { abbreviation: 'PHX', name: 'Suns', city: 'Phoenix' },
      position: 'F',
    },
    seasons: [{ season: '2021-22', team: { abbreviation: 'BKN' } }],
    stats: {
      '2021-22': makeStats('2021-22', 'BKN', { gamesPlayed: 55 }),
    },
  },
  '1629611': {
    profile: {
      id: '1629611',
      fullName: 'Terance Mann',
      team: { abbreviation: 'ATL', name: 'Hawks', city: 'Atlanta' },
    },
    seasons: [],
    stats: {},
  },
  '203507': {
    profile: {
      id: '203507',
      fullName: 'Giannis Antetokounmpo',
      team: { abbreviation: 'MIL', name: 'Bucks', city: 'Milwaukee' },
    },
    seasons: [],
    stats: {},
  },
};

function errorJson(status: number, code: string) {
  return HttpResponse.json(
    { error: { code, message: 'fixture error', status } },
    { status },
  );
}

function toSummary(profile: TestPlayer['profile']) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    team: { abbreviation: profile.team.abbreviation },
    ...(profile.position ? { position: profile.position } : {}),
  };
}

beforeEach(() => {
  server.use(
    http.get('http://localhost/api/players', ({ request }) => {
      const term = (
        new URL(request.url).searchParams.get('search') ?? ''
      ).toLowerCase();
      const results = Object.values(players)
        .map((player) => toSummary(player.profile))
        .filter((summary) => summary.fullName.toLowerCase().includes(term));
      return HttpResponse.json({ players: results });
    }),
    http.get('http://localhost/api/players/:playerId', ({ params }) => {
      const player = players[String(params.playerId)];
      if (!player) {
        return errorJson(404, 'PLAYER_NOT_FOUND');
      }
      return HttpResponse.json({ player: player.profile });
    }),
    http.get('http://localhost/api/players/:playerId/seasons', ({ params }) => {
      const player = players[String(params.playerId)];
      if (!player) {
        return errorJson(404, 'PLAYER_NOT_FOUND');
      }
      return HttpResponse.json({ seasons: player.seasons });
    }),
    http.get(
      'http://localhost/api/players/:playerId/seasons/:season/stats',
      ({ params }) => {
        const player = players[String(params.playerId)];
        if (!player) {
          return errorJson(404, 'PLAYER_NOT_FOUND');
        }
        const stats = player.stats[String(params.season)];
        if (!stats) {
          return errorJson(404, 'SEASON_NOT_FOUND');
        }
        return HttpResponse.json({ stats });
      },
    ),
    http.get('http://localhost/api/players/:playerId/season-trends', ({ params }) => {
      const player = players[String(params.playerId)];
      if (!player) {
        return errorJson(404, 'PLAYER_NOT_FOUND');
      }
      // The career arc reuses the same per-season stats fixtures, ordered oldest-first as the
      // season-trends contract requires.
      const seasons = Object.entries(player.stats)
        .sort(([a], [b]) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)))
        .map(([, stats]) => stats);
      return HttpResponse.json({ seasons });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

function statCells(label: string): string[] {
  const rowHeader = screen.getByRole('rowheader', { name: label });
  const row = rowHeader.closest('tr');
  if (!row) {
    throw new Error(`Row for ${label} not found`);
  }
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

// The detailed statistics table is collapsed by default; open the disclosure and return the table.
async function revealTable(): Promise<HTMLElement> {
  const toggle = await screen.findByRole('button', {
    name: /detailed statistics table/i,
  });
  fireEvent.click(toggle);
  return screen.findByRole('table');
}

async function typeDebounced(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, playerSearchDebounceMilliseconds + 20);
    });
  });
}

describe('player comparison page', () => {
  it('renders one page heading and an empty Player A search', () => {
    renderApp('/compare');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Compare players' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Search for Player A' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Player B' })).toBeInTheDocument();
    expect(screen.getByText(/Select two distinct players/)).toBeInTheDocument();
  });

  it('moves focus to the page heading on entry', async () => {
    renderApp('/compare');

    const heading = screen.getByRole('heading', { level: 1, name: 'Compare players' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it('restores a full comparison from a direct URL', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    expect(await revealTable()).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /LeBron James/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Stephen Curry/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Regular-season comparison for the 2023-24 season/),
    ).toBeInTheDocument();
    expect(statCells('Points per game')).toEqual(['25.7', '26.4']);
    expect(statCells('Games played')).toEqual(['71', '74']);
  });

  it('renders the visual stat matchup graph alongside the table for a valid comparison', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    const graphHeading = screen.getByRole('heading', { name: 'Statistical matchup' });
    expect(graphHeading).toBeInTheDocument();
    expect(screen.getByText(/Each metric uses its own scale/)).toBeInTheDocument();

    // The graph shows the same raw values as the table (LeBron 25.7 and Curry 26.4 points).
    const graphSection = graphHeading.closest('section') as HTMLElement;
    expect(within(graphSection).getByText('25.7')).toBeInTheDocument();
    expect(within(graphSection).getByText('26.4')).toBeInTheDocument();

    // Neutral: no winner labelling anywhere on the page.
    expect(screen.queryByText(/winner|leads|wins/i)).not.toBeInTheDocument();
  });

  it('does not render the stat graph before two players are compared', async () => {
    renderApp('/compare');

    expect(await screen.findByText(/Select two distinct players/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Statistical matchup' }),
    ).not.toBeInTheDocument();
  });

  it('does not render the stat graph when the players share no season', async () => {
    renderApp('/compare?player1=1641705&player2=201142');

    expect(
      await screen.findByText(/have no regular-season in common/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Statistical matchup' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not render the stat graph when comparison statistics fail to load', async () => {
    server.use(
      http.get('http://localhost/api/players/:playerId/seasons/:season/stats', () =>
        errorJson(500, 'INTERNAL_SERVER_ERROR'),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    expect(
      await screen.findByText(/could not load the comparison statistics/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Statistical matchup' }),
    ).not.toBeInTheDocument();
  });

  it('renders all eleven statistic rows', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    const labels = [
      'Games played',
      'Minutes per game',
      'Points per game',
      'Rebounds per game',
      'Assists per game',
      'Steals per game',
      'Blocks per game',
      'Turnovers per game',
      'Field-goal percentage',
      'Three-point percentage',
      'Free-throw percentage',
    ];
    for (const label of labels) {
      expect(screen.getByRole('rowheader', { name: label })).toBeInTheDocument();
    }
  });

  it('shows the season team abbreviation in the column heading', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2017-18');

    await revealTable();
    // 2017-18 is a season both share but on different teams; LeBron was on CLE that year.
    expect(
      screen.getByRole('columnheader', { name: /LeBron James/ }),
    ).toHaveTextContent('CLE');
    expect(
      screen.getByRole('columnheader', { name: /Stephen Curry/ }),
    ).toHaveTextContent('GSW');
  });

  it('renders a zero-valued statistic as a real value', async () => {
    server.use(
      http.get('http://localhost/api/players/201939/seasons/2023-24/stats', () =>
        HttpResponse.json({
          stats: makeStats('2023-24', 'GSW', { blocksPerGame: 0 }),
        }),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    expect(statCells('Blocks per game')).toEqual(['0.5', '0.0']);
  });

  it('shows "Multiple teams" in a column heading for a traded season', async () => {
    server.use(
      http.get('http://localhost/api/players/2544/seasons/2023-24/stats', () =>
        HttpResponse.json({
          stats: {
            season: '2023-24',
            gamesPlayed: 71,
            minutesPerGame: 35,
            pointsPerGame: 25.7,
            reboundsPerGame: 7,
            assistsPerGame: 7,
            stealsPerGame: 1,
            blocksPerGame: 0.5,
            turnoversPerGame: 3,
            fieldGoalPercentage: 0.5,
            threePointPercentage: 0.4,
            freeThrowPercentage: 0.8,
          },
        }),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    expect(
      screen.getByRole('columnheader', { name: /LeBron James/ }),
    ).toHaveTextContent('Multiple teams');
  });

  it('wraps the table in a keyboard-reachable scroll region', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    const table = await revealTable();
    const region = screen.getByRole('group', { name: /Comparison statistics/ });
    expect(region).toContainElement(table);
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('auto-selects the newest common season when the URL omits it', async () => {
    renderApp('/compare?player1=2544&player2=201939');

    await revealTable();
    expect(
      screen.getByText(/Regular-season comparison for the 2023-24 season/),
    ).toBeInTheDocument();
  });

  it('offers only the seasons both players share', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    const selector = screen.getByRole('combobox', { name: 'Comparison season' });
    const optionValues = within(selector)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(optionValues).toEqual(['2023-24', '2017-18']);
  });

  it('updates both players when the season changes', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    expect(statCells('Points per game')).toEqual(['25.7', '26.4']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Comparison season' }), {
      target: { value: '2017-18' },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Regular-season comparison for the 2017-18 season/),
      ).toBeInTheDocument();
    });
    // Changing the season reloads the stats and re-collapses the detailed table; reopen it.
    await revealTable();
    expect(statCells('Points per game')).toEqual(['27.5', '26.4']);
  });

  it('shows a no-common-season state for disjoint seasons', async () => {
    renderApp('/compare?player1=201142&player2=1641705');

    expect(
      await screen.findByText(/have no regular-season in common/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('identifies a single player with no season data', async () => {
    renderApp('/compare?player1=2544&player2=1629611');

    expect(
      await screen.findByText(/Terance Mann has no regular-season data/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a combined empty state when neither player has seasons', async () => {
    renderApp('/compare?player1=203507&player2=1629611');

    expect(
      await screen.findByText(/Neither Giannis Antetokounmpo nor Terance Mann/),
    ).toBeInTheDocument();
  });

  it('rejects a duplicate direct URL and offers replacement', async () => {
    renderApp('/compare?player1=2544&player2=2544');

    expect(
      await screen.findByText(/selected the same player for both slots/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Search for Player B' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a slot-specific invalid-link state without requesting the slot', async () => {
    let player1Requests = 0;
    server.use(
      http.get('http://localhost/api/players/abc', () => {
        player1Requests += 1;
        return HttpResponse.json({ player: players['2544']?.profile });
      }),
    );
    renderApp('/compare?player1=abc&player2=201939');

    expect(
      await screen.findByText(/That player link is not valid/),
    ).toBeInTheDocument();
    expect(await screen.findByText('Stephen Curry')).toBeInTheDocument();
    expect(player1Requests).toBe(0);
  });

  it('shows a slot-specific unknown-player state and keeps the valid player', async () => {
    renderApp('/compare?player1=999999&player2=201939');

    expect(
      await screen.findByText(/We could not find that player/),
    ).toBeInTheDocument();
    expect(await screen.findByText('Stephen Curry')).toBeInTheDocument();
  });

  it('shows an invalid-link alert for a malformed season and keeps the selector', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-26');

    expect(
      await screen.findByText(/That season link is not valid/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Comparison season' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not silently replace a valid but unavailable season', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2018-19');

    expect(
      await screen.findByText(/not available for both players/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('selecting Player A stages Player B selection', async () => {
    renderApp('/compare');

    await typeDebounced(
      screen.getByRole('combobox', { name: 'Search for Player A' }),
      'lebron',
    );
    fireEvent.click(await screen.findByText('LeBron James'));

    expect(
      await screen.findByRole('combobox', { name: 'Search for Player B' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'LeBron James' }),
    ).toBeInTheDocument();
  });

  it('prevents picking the player already selected in the other slot', async () => {
    renderApp('/compare?player1=2544');

    await typeDebounced(
      screen.getByRole('combobox', { name: 'Search for Player B' }),
      'lebron',
    );

    expect(
      await screen.findByText('That player is already selected.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /LeBron James/ }),
    ).not.toBeInTheDocument();
  });

  it('replaces Player A in place', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    fireEvent.click(screen.getByRole('button', { name: 'Replace Player A' }));

    expect(
      screen.getByRole('combobox', { name: 'Search for Player A' }),
    ).toBeInTheDocument();
  });

  it('clears Player B while preserving Player A and dropping the season', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Player B' }));

    await waitFor(() => {
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'LeBron James' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Search for Player B' }),
    ).toBeInTheDocument();
  });

  it('shows a generic error when one side fails and never a half-valid table', async () => {
    server.use(
      http.get('http://localhost/api/players/201939/seasons/2023-24/stats', () =>
        errorJson(500, 'INTERNAL_SERVER_ERROR'),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    expect(
      await screen.findByText(/could not load the comparison statistics/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('treats a contract-invalid statistics response as a generic error', async () => {
    server.use(
      http.get('http://localhost/api/players/201939/seasons/2023-24/stats', () =>
        HttpResponse.json({ stats: { season: '2023-24', points: 26 } }),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    expect(
      await screen.findByText(/could not load the comparison statistics/),
    ).toBeInTheDocument();
  });

  it('does not show stale statistics while a new season loads', async () => {
    server.use(
      http.get(
        'http://localhost/api/players/:playerId/seasons/2017-18/stats',
        async ({ params }) => {
          await delay(60);
          const stats = players[String(params.playerId)]?.stats['2017-18'];
          return HttpResponse.json({ stats });
        },
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    fireEvent.change(screen.getByRole('combobox', { name: 'Comparison season' }), {
      target: { value: '2017-18' },
    });

    // The previous season's table disappears immediately and a loading status appears.
    await screen.findByText('Loading comparison statistics...');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await revealTable();
    expect(statCells('Points per game')).toEqual(['27.5', '26.4']);
  });

  it('passes an abort signal to the comparison requests', async () => {
    let hadSignal = false;
    server.use(
      http.get('http://localhost/api/players/2544', ({ request }) => {
        hadSignal = request.signal instanceof AbortSignal;
        return HttpResponse.json({ player: players['2544']?.profile });
      }),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    expect(hadSignal).toBe(true);
  });

  it('links each selected player to their profile and back to search', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await revealTable();
    expect(screen.getByRole('link', { name: 'LeBron James' })).toHaveAttribute(
      'href',
      '/players/2544',
    );
    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('keeps the detailed statistics table collapsed until the disclosure is opened', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    const toggle = await screen.findByRole('button', {
      name: /view detailed statistics table/i,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // The matchup graph is visible by default; the exact-value table is not.
    expect(
      screen.getByRole('heading', { name: 'Statistical matchup' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: /Regular-season comparison/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const table = await screen.findByRole('table', {
      name: /Regular-season comparison/,
    });
    // Table semantics and exact values are intact once revealed.
    expect(
      within(table).getByRole('rowheader', { name: 'Points per game' }),
    ).toBeInTheDocument();
    expect(statCells('Points per game')).toEqual(['25.7', '26.4']);
  });

  it('shows no graph, career arc, or table scaffolding in the empty comparison state', async () => {
    renderApp('/compare');

    await screen.findByText(/Select two distinct players/);
    expect(
      screen.queryByRole('heading', { name: 'Statistical matchup' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Career arc' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /detailed statistics table/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the career arc with points per game selected by default', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    // The metric options appear once both players' career data has loaded.
    const points = await screen.findByRole('radio', { name: 'Points per game' });
    expect(points).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Career arc' })).toBeInTheDocument();
    expect(screen.getByText(/Missing seasons are omitted/)).toBeInTheDocument();
  });

  it('changes the career arc metric when another option is chosen', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    const rebounds = await screen.findByRole('radio', {
      name: 'Rebounds per game',
    });
    fireEvent.click(rebounds);

    expect(rebounds).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Points per game' })).not.toBeChecked();
  });

  it('includes both players in the career arc with no winner labelling', async () => {
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    const heading = await screen.findByRole('heading', { name: 'Career arc' });
    const section = heading.closest('section') as HTMLElement;
    // Wait for the arc to finish loading (its metric options and summary render together).
    await within(section).findByRole('radio', { name: 'Points per game' });
    expect(within(section).getAllByText(/LeBron James/).length).toBeGreaterThan(0);
    expect(within(section).getAllByText(/Stephen Curry/).length).toBeGreaterThan(0);
    expect(
      within(section).queryByText(/winner|ranking|better|worse|leads|wins/i),
    ).not.toBeInTheDocument();
  });

  it('shows a restrained empty state when career data is insufficient for the arc', async () => {
    server.use(
      http.get('http://localhost/api/players/:playerId/season-trends', () =>
        HttpResponse.json({ seasons: [] }),
      ),
    );
    renderApp('/compare?player1=2544&player2=201939&season=2023-24');

    await screen.findByRole('heading', { name: 'Statistical matchup' });
    expect(
      await screen.findByText(/Career arc is unavailable for this matchup/),
    ).toBeInTheDocument();
    // The matchup graph and the detailed-table disclosure still work.
    expect(
      screen.getByRole('button', { name: /detailed statistics table/i }),
    ).toBeInTheDocument();
  });

  it('does not render the career arc when players share no common season', async () => {
    renderApp('/compare?player1=201142&player2=1641705');

    expect(
      await screen.findByText(/have no regular-season in common/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Career arc' }),
    ).not.toBeInTheDocument();
  });
});
