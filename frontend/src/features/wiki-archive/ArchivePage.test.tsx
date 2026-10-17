import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { gamesFixture, leagueFixture, homeTeam } from './archive-fixtures';
import { shiftCalendarDate } from './calendar-date';
function mockSources() {
  server.use(
    http.get('http://localhost/api/standings', () => HttpResponse.json(leagueFixture)),
    http.get('http://localhost/api/games', () => HttpResponse.json(gamesFixture)),
  );
}
describe('licensed archive views', () => {
  it('handles leap/month/year and DST boundaries using calendar arithmetic', () => {
    for (const [date, delta, expected] of [
      ['2024-02-28', 1, '2024-02-29'],
      ['2024-03-01', -1, '2024-02-29'],
      ['2024-12-31', 1, '2025-01-01'],
      ['2024-10-06', -1, '2024-10-05'],
      ['2024-03-10', 1, '2024-03-11'],
    ] as const)
      expect(shiftCalendarDate(date, delta)).toBe(expected);
    expect(() => shiftCalendarDate('2024-02-30', 1)).toThrow();
  });
  it('shares filtered source standings and attributes adapted data', async () => {
    mockSources();
    renderApp('/standings/wikipedia?conference=East');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(16);
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    );
    fireEvent.change(screen.getByLabelText('Search snapshot'), {
      target: { value: 'Boston' },
    });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByLabelText('Shareable league URL')).toHaveValue(
      `${window.location.origin}/standings/wikipedia?conference=East&search=Boston`,
    );
    expect(
      within(table).queryByRole('link', { name: homeTeam.name }),
    ).not.toBeInTheDocument();
  });
  it('retains tied leader entries, whole-percent units and signed source values', async () => {
    mockSources();
    renderApp('/leaders/wikipedia?category=FG%25');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Fixture player A')).toBeInTheDocument();
    expect(within(table).getByText('Fixture player B')).toBeInTheDocument();
    expect(within(table).getAllByText('50')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Leader type'), {
      target: { value: 'team' },
    });
    expect(within(table).getByText('-1.2')).toBeInTheDocument();
    expect(screen.getByLabelText('Leader category')).toHaveValue('');
  });
  it('freezes default recorded date in saved state and labels coverage-aware empty days', async () => {
    mockSources();
    renderApp('/games/recorded');
    await screen.findByRole('table');
    expect(screen.getByLabelText('Recorded game date')).toHaveValue('2024-04-22');
    expect(screen.getByLabelText('Shareable recorded-game URL')).toHaveValue(
      `${window.location.origin}/games/recorded?date=2024-04-22&season=2023-24`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next calendar day' }));
    expect(
      await screen.findByText(/No recorded playoff games match/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous calendar day' }));
    expect(screen.getByRole('link', { name: 'nba:0042300102' })).toHaveAttribute(
      'href',
      '/games/nba:0042300102',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('shows recorded overtime and missing fields while preserving published ties', async () => {
    server.use(
      http.get('http://localhost/api/games/:gameId', () =>
        HttpResponse.json({ ...gamesFixture, games: [gamesFixture.games[0]] }),
      ),
    );
    renderApp('/games/nba:0042300101');
    await screen.findByRole('heading', { name: 'Published game category leaders' });
    // The overtime period is a row of the accessible period table (the line score and margin
    // flow repeat it visually, hidden from assistive tech).
    expect(
      within(
        screen.getByRole('table', { name: /Published quarter and overtime scoring/ }),
      ).getByText('OT1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Two players 8 each')).toBeInTheDocument();
    expect(screen.getByText(/Venue: Unavailable/)).toHaveTextContent(
      'Source-reported time: Unavailable',
    );
    expect(
      screen.getByRole('link', { name: 'Source-linked NBA recap' }),
    ).toHaveAttribute('href', gamesFixture.games[0]!.recapUrl);
    expect(screen.queryByLabelText('Recorded game date')).not.toBeInTheDocument();
  });
  it('rejects unsupported/duplicate state before fetching and handles unavailable source', async () => {
    const fetch = vi.fn();
    server.use(http.get('http://localhost/api/standings', fetch));
    const view = renderApp('/standings/wikipedia?season=2025-26');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(fetch).not.toHaveBeenCalled();
    view.unmount();
    const duplicate = renderApp('/games/recorded?date=2024-04-21&date=2024-04-22');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    duplicate.unmount();
    server.use(
      http.get(
        'http://localhost/api/games',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/games/recorded');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
  it('loads team sources on request, separates regular/playoff scope and shares venue filters', async () => {
    mockSources();
    const reads = vi.fn(() => HttpResponse.json(gamesFixture));
    server.use(
      http.get('http://localhost/api/games', reads),
      http.get('http://localhost/api/teams/:id', () =>
        HttpResponse.json({
          team: homeTeam,
          provenance: leagueFixture.provenance,
          availability: {
            roster: false,
            schedule: false,
            statistics: false,
            reason: 'No live season feed.',
          },
        }),
      ),
    );
    renderApp(`/teams/${homeTeam.id}`);
    await screen.findByRole('button', { name: 'Load recorded 2023-24 results' });
    expect(reads).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Load recorded 2023-24 results' }),
    );
    await screen.findByText(/1 wins, 1 losses in 2 matching recorded finals/);
    expect(screen.getByText(/41–41 over 82 games/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Recorded venue filter'), {
      target: { value: 'home' },
    });
    expect(
      screen.getByText(/1 wins, 0 losses in 1 matching recorded finals/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Recorded points per game 110.00/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Shareable historical team URL')).toHaveValue(
        `${window.location.origin}/teams/${homeTeam.id}?archive=2023-24&side=home`,
      ),
    );
  });
});
