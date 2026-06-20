import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { playerSearchDebounceMilliseconds } from './useDebouncedSearchTerm';

const healthUrl = 'http://localhost/api/health';
const playerSearchUrl = 'http://localhost/api/players';

const leBronJames = {
  id: '2544',
  fullName: 'LeBron James',
  team: {
    abbreviation: 'LAL',
  },
  position: 'F',
};

const kyrieIrving = {
  id: '202681',
  fullName: 'Kyrie Irving',
  team: {
    abbreviation: 'DAL',
  },
};

const stephenCurry = {
  id: '201939',
  fullName: 'Stephen Curry',
  team: {
    abbreviation: 'GSW',
  },
  position: 'G',
};

function getSearchInput() {
  return screen.getByRole('combobox', {
    name: 'Search NBA players',
  });
}

async function findOptionByPlayerName(playerName: string) {
  const playerNameElement = await screen.findByText(playerName);
  const option = playerNameElement.closest<HTMLElement>('[role="option"]');

  expect(option).not.toBeNull();

  return option as HTMLElement;
}

async function submitDebouncedSearch(value: string) {
  fireEvent.change(getSearchInput(), {
    target: {
      value,
    },
  });

  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, playerSearchDebounceMilliseconds + 20);
    });
  });
}

beforeEach(() => {
  server.use(
    http.get(healthUrl, () =>
      HttpResponse.json({
        status: 'ok',
        timestamp: '2026-06-21T00:00:00.000Z',
        service: 'nba-performance-explorer-api',
      }),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('player search', () => {
  it('does not request below two trimmed characters', async () => {
    let requestCount = 0;
    server.use(
      http.get(playerSearchUrl, () => {
        requestCount += 1;
        return HttpResponse.json({
          players: [],
        });
      }),
    );
    renderApp();
    vi.useFakeTimers();

    fireEvent.change(getSearchInput(), {
      target: {
        value: ' a ',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(requestCount).toBe(0);
    expect(screen.queryByText('No players found.')).not.toBeInTheDocument();
  });

  it('waits 300 milliseconds before requesting eligible searches', async () => {
    let requestCount = 0;
    server.use(
      http.get(playerSearchUrl, () => {
        requestCount += 1;
        return HttpResponse.json({
          players: [],
        });
      }),
    );
    renderApp();
    vi.useFakeTimers();

    fireEvent.change(getSearchInput(), {
      target: {
        value: 'le',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(playerSearchDebounceMilliseconds - 1);
    });
    expect(requestCount).toBe(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(requestCount).toBe(1);
    });
  });

  it('trims and encodes the query sent to the backend', async () => {
    let receivedSearchTerm = '';
    server.use(
      http.get(playerSearchUrl, ({ request }) => {
        receivedSearchTerm = new URL(request.url).searchParams.get('search') ?? '';
        return HttpResponse.json({
          players: [leBronJames],
        });
      }),
    );
    renderApp();

    await submitDebouncedSearch('  LeBron James  ');

    expect(await screen.findByText('LeBron James')).toBeInTheDocument();
    expect(receivedSearchTerm).toBe('LeBron James');
  });

  it('clears displayed search state immediately below eligibility', async () => {
    let requestCount = 0;
    server.use(
      http.get(playerSearchUrl, () => {
        requestCount += 1;
        return HttpResponse.json({
          players: [leBronJames],
        });
      }),
    );
    renderApp();

    await submitDebouncedSearch('lebron');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    fireEvent.change(getSearchInput(), {
      target: {
        value: 'x',
      },
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(getSearchInput()).toHaveAttribute('aria-expanded', 'false');
    expect(requestCount).toBe(1);
  });

  it('renders an accessible loading state', async () => {
    server.use(
      http.get(playerSearchUrl, async () => {
        await delay(150);
        return HttpResponse.json({
          players: [leBronJames],
        });
      }),
    );
    renderApp();

    await submitDebouncedSearch('lebron');

    expect(screen.getByText('Searching players...')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(await screen.findByText('LeBron James')).toBeInTheDocument();
  });

  it('renders names, teams, positions, and optional positions', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [kyrieIrving, leBronJames],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('ir');

    expect(await screen.findByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('LAL | F')).toBeInTheDocument();
    expect(screen.getByText('Kyrie Irving')).toBeInTheDocument();
    expect(screen.getByText('DAL')).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: 'LeBron James, LAL, F',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: 'Kyrie Irving, DAL',
      }),
    ).toBeInTheDocument();
  });

  it('renders an accessible empty state only after an eligible search', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [],
        }),
      ),
    );
    renderApp();

    expect(screen.queryByText('No players found.')).not.toBeInTheDocument();
    await submitDebouncedSearch('zz');

    expect(await screen.findByText('No players found.')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('renders an accessible server error state', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred.',
              status: 500,
            },
          },
          {
            status: 500,
          },
        ),
      ),
    );
    renderApp();

    await submitDebouncedSearch('le');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Player search is unavailable',
    );
  });

  it('handles successful responses that violate the shared contract as errors', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [
            {
              id: '2544',
              name: 'LeBron James',
              teamCode: 'LAL',
            },
          ],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('le');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Player search is unavailable',
    );
  });

  it('supports pointer selection and navigates to the selected player', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [leBronJames],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('le');
    const option = await findOptionByPlayerName('LeBron James');

    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(
      screen.getByRole('heading', {
        name: 'Player profile',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Selected player ID:')).toHaveTextContent('2544');
  });

  it('wraps the highlighted option with ArrowDown and ArrowUp', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [leBronJames, stephenCurry],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('player');
    const input = getSearchInput();
    const leBronOption = await findOptionByPlayerName('LeBron James');
    const curryOption = await findOptionByPlayerName('Stephen Curry');

    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });
    expect(leBronOption).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });
    expect(curryOption).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });
    expect(leBronOption).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, {
      key: 'ArrowUp',
    });
    expect(curryOption).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', curryOption.id);
  });

  it('opens the highlighted player with Enter', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [stephenCurry],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('st');
    const input = getSearchInput();
    await screen.findByText('Stephen Curry');

    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });
    fireEvent.keyDown(input, {
      key: 'Enter',
    });

    expect(screen.getByText('Selected player ID:')).toHaveTextContent('201939');
  });

  it('closes with Escape and does not reopen from cached results', async () => {
    server.use(
      http.get(playerSearchUrl, () =>
        HttpResponse.json({
          players: [leBronJames],
        }),
      ),
    );
    renderApp();

    await submitDebouncedSearch('le');
    const input = getSearchInput();
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, {
      key: 'Escape',
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.blur(input);
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('resets the highlight when a new result set arrives', async () => {
    server.use(
      http.get(playerSearchUrl, ({ request }) => {
        const searchTerm = new URL(request.url).searchParams.get('search');

        return HttpResponse.json({
          players: searchTerm === 'st' ? [stephenCurry] : [leBronJames, kyrieIrving],
        });
      }),
    );
    renderApp();

    await submitDebouncedSearch('le');
    const input = getSearchInput();
    await screen.findByText('LeBron James');
    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });
    expect(input).toHaveAttribute('aria-activedescendant');

    await submitDebouncedSearch('st');
    const curryOption = await findOptionByPlayerName('Stephen Curry');

    expect(curryOption).toHaveAttribute('aria-selected', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('does not allow an older response to replace a newer search', async () => {
    let releaseOlderResponse: (() => void) | undefined;
    let markOlderRequestStarted: (() => void) | undefined;
    const olderResponseGate = new Promise<void>((resolve) => {
      releaseOlderResponse = resolve;
    });
    const olderRequestStarted = new Promise<void>((resolve) => {
      markOlderRequestStarted = resolve;
    });

    server.use(
      http.get(playerSearchUrl, async ({ request }) => {
        const searchTerm = new URL(request.url).searchParams.get('search');

        if (searchTerm === 'le') {
          markOlderRequestStarted?.();
          await olderResponseGate;

          return HttpResponse.json({
            players: [leBronJames],
          });
        }

        return HttpResponse.json({
          players: [stephenCurry],
        });
      }),
    );
    renderApp();

    await submitDebouncedSearch('le');
    await olderRequestStarted;
    await submitDebouncedSearch('st');

    expect(await screen.findByText('Stephen Curry')).toBeInTheDocument();
    expect(screen.queryByText('LeBron James')).not.toBeInTheDocument();

    await act(async () => {
      releaseOlderResponse?.();
      await Promise.resolve();
    });

    expect(screen.getByText('Stephen Curry')).toBeInTheDocument();
    expect(screen.queryByText('LeBron James')).not.toBeInTheDocument();
  });
});

describe('player placeholder route', () => {
  it('renders the selected ID, later-task message, and return link', () => {
    renderApp('/players/2544');

    expect(
      screen.getByRole('heading', {
        name: 'Player profile',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Selected player ID:')).toHaveTextContent('2544');
    expect(
      screen.getByText('The full player profile is planned for a later task.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Return to player search',
      }),
    ).toHaveAttribute('href', '/');
  });
});
