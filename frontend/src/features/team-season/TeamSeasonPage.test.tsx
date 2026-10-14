import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import {
  RecordedStandingsRaceResponseSchema,
  RecordedTeamSeasonResponseSchema,
} from '@nba-performance-explorer/contracts';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { raceFixture, teamSeasonFixture } from './team-season-fixtures';
import { dateIndex, standingsAt } from './race-standings';
import { focusMatches } from './team-season-format';
// Compile the subjects before assertion timers; the app still renders the actual lazy routes.
import './TeamSeasonPage';
import './StandingsRacePage';

const SEASON_URL = 'http://localhost/api/recorded/team-season';
const RACE_URL = 'http://localhost/api/recorded/standings-race';

describe('team season intelligence', () => {
  it('uses fixtures that satisfy the public contracts', () => {
    expect(
      RecordedTeamSeasonResponseSchema.safeParse(teamSeasonFixture()).success,
    ).toBe(true);
    expect(RecordedStandingsRaceResponseSchema.safeParse(raceFixture()).success).toBe(
      true,
    );
  });

  it('shows the observed record, quarantined slot, splits and season series from the API', async () => {
    let requested = '';
    server.use(
      http.get(SEASON_URL, ({ request }) => {
        requested = new URL(request.url).search;
        return HttpResponse.json(teamSeasonFixture());
      }),
    );
    renderApp('/teams/nba:1610612747/season');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Los Angeles Lakers · 2023–24/,
      }),
    ).toBeInTheDocument();
    expect(requested).toBe('?team=nba%3A1610612747');
    const fixture = teamSeasonFixture();
    const last = fixture.games.at(-1)!;
    expect(screen.getByText('Observed record').nextElementSibling).toHaveTextContent(
      `${last.observedWins}–${last.observedLosses}`,
    );
    expect(
      screen.getByText(/81 of 82 games verified · 1 quarantined/),
    ).toBeInTheDocument();
    // Splits: small samples are flagged, not hidden.
    const overtime = document.querySelector('[data-split="overtime"]')!;
    expect(overtime).toHaveTextContent('1–0');
    expect(overtime).toHaveTextContent('Small sample');
    expect(document.querySelector('[data-split="home"]')).not.toHaveTextContent(
      'Small sample',
    );
    // The quarantined game keeps its slot in the ledger without a score.
    const ledger = screen.getByRole('group', { name: /game ledger/ });
    const row = within(ledger).getAllByRole('row')[5]!;
    expect(row).toHaveTextContent('Not verified');
    // Season series plates link to the opponent's own season.
    expect(
      screen.getByRole('link', {
        name: /^Denver Nuggets: 3–0 in 3 verified of 3 meetings/,
      }),
    ).toHaveAttribute('href', '/teams/nba:1610612743/season');
    expect(
      screen.getByText(/Quarantined game IDs: nba:0022300005\./),
    ).toBeInTheDocument();
  });

  it('focuses the ribbon from the URL and opens a game card that can be closed', async () => {
    server.use(http.get(SEASON_URL, () => HttpResponse.json(teamSeasonFixture())));
    renderApp('/teams/nba:1610612747/season?focus=close&game=3');
    const card = (
      await screen.findByRole('heading', { level: 3, name: 'vs Boston Celtics' })
    ).closest('.intel-game') as HTMLElement;
    expect(within(card).getByText('L 110–112')).toBeInTheDocument();
    expect(
      within(card).getByRole('link', { name: 'Compare the two teams' }),
    ).toHaveAttribute('href', '/lab/teams?teams=nba:1610612747,nba:1610612738');
    const close = teamSeasonFixture().games.filter((g) => focusMatches(g, 'close'));
    const closeWins = close.filter((g) => g.result === 'W').length;
    expect(
      screen.getByText(
        `${closeWins}–${close.length - closeWins} in ${close.length} verified close games`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close game' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { level: 3, name: 'vs Boston Celtics' }),
      ).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(await screen.findByText(/across the season/)).toBeInTheDocument();
  });

  it('rejects invalid team IDs and view parameters without requesting data', async () => {
    let calls = 0;
    server.use(
      http.get(SEASON_URL, () => {
        calls++;
        return HttpResponse.json(teamSeasonFixture());
      }),
    );
    const { unmount } = renderApp('/teams/LAL/season');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid team ID');
    unmount();
    renderApp('/teams/nba:1610612747/season?game=99');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid season view');
    expect(screen.getByRole('link', { name: 'Reset the view' })).toHaveAttribute(
      'href',
      '/teams/nba:1610612747/season',
    );
    expect(calls).toBeLessThanOrEqual(1);
  });

  it('shows an honest failure when the archive is unavailable', async () => {
    server.use(http.get(SEASON_URL, () => new HttpResponse(null, { status: 503 })));
    renderApp('/teams/nba:1610612747/season');
    expect(await screen.findByRole('alert')).toHaveTextContent('Data unavailable');
  });
});

describe('standings race', () => {
  it('orders observed records by date with games behind and uncounted games', () => {
    const { teams, dates } = raceFixture();
    const end = standingsAt(teams, 2);
    expect(
      end.map((r) => [r.team.abbreviation, r.rank, r.gamesBehind, r.uncounted]),
    ).toEqual([
      ['DEN', 1, 0, 1],
      ['LAL', 2, 1.5, 0],
    ]);
    const tied = standingsAt(teams, 1);
    expect(tied.map((r) => r.rank)).toEqual([1, 1]);
    expect(dateIndex(dates, '2023-10-26')).toBe(1);
    expect(dateIndex(dates, '2023-01-01')).toBe(-1);
  });

  it('replays the ladder from the scrubber and highlights a chosen team', async () => {
    let requested = '';
    server.use(
      http.get(RACE_URL, ({ request }) => {
        requested = new URL(request.url).search;
        return HttpResponse.json(raceFixture());
      }),
    );
    renderApp('/standings/race?conference=West');
    const ladder = await screen.findByRole('region', {
      name: /Western Conference on Oct 27, 2023/,
    });
    expect(requested).toBe('?conference=West');
    const rows = within(ladder).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('DEN');
    expect(rows[0]).toHaveTextContent('3–1');
    expect(rows[1]).toHaveTextContent('1.5');
    fireEvent.change(screen.getByLabelText('Race date'), { target: { value: '0' } });
    expect(
      await screen.findByRole('region', { name: /Western Conference on Oct 24, 2023/ }),
    ).toBeInTheDocument();
    const pick = within(ladder).getByRole('button', { name: /LAL/ });
    fireEvent.click(pick);
    await waitFor(() => expect(pick).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('rejects an unsupported conference', async () => {
    renderApp('/standings/race?conference=North');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid race view');
  });
});
