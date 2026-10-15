import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { TeamArchiveResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from './archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import '../teams/TeamsPage';
const person = {
  name: 'Fixture player A',
  articleUrl: 'https://en.wikipedia.org/wiki/Fixture_player_A',
  nbaPlayerId: '2544',
  identityUrl: 'https://www.wikidata.org/wiki/Q1',
};
const other = {
  name: 'Fixture player B',
  articleUrl: 'https://en.wikipedia.org/wiki/Fixture_player_B',
  nbaPlayerId: null,
  identityUrl: null,
};
const stats = {
  ...person,
  valueBasis: 'published-per-game' as const,
  rawTotals: null,
  gamesPlayed: 50,
  gamesStarted: 30,
  minutesPerGame: 30,
  fieldGoalPercentage: 0.5,
  threePointPercentage: null,
  freeThrowPercentage: 0.8,
  reboundsPerGame: 10,
  assistsPerGame: 5,
  stealsPerGame: 1,
  blocksPerGame: 2,
  pointsPerGame: 25,
};
const body: TeamArchiveResponse = {
  team: homeTeam,
  season: '2023-24',
  identityStatus: 'available',
  identityRetrievedAt: '2026-10-13T21:00:00.000Z',
  attribution: leagueFixture.attribution,
  provenance: leagueFixture.provenance,
  roster: [
    {
      ...person,
      position: 'F',
      number: '23',
      birthDate: '1984-12-30',
      ageOnOctober1: 38,
    },
    { ...other, position: 'G/F', number: '0', birthDate: null, ageOnOctober1: null },
  ],
  statistics: {
    'source-unspecified': [],
    'regular-season': [
      stats,
      { ...stats, ...other, gamesPlayed: 2, gamesStarted: 0, pointsPerGame: 100 },
    ],
    playoffs: [
      { ...stats, gamesPlayed: 5, gamesStarted: 5, pointsPerGame: 10 },
      { ...stats, ...other, gamesPlayed: 5, gamesStarted: 0, pointsPerGame: 10 },
    ],
  },
  results: Array.from({ length: 82 }, (_, i) => ({
    sourceId: `00223${String(i).padStart(5, '0')}`,
    date: new Date(Date.UTC(2023, 9, 1 + i)).toISOString().slice(0, 10),
    opponent: awayTeam,
    location: i < 42 ? ('home' as const) : ('away' as const),
    result: i < 47 ? ('W' as const) : ('L' as const),
    teamScore: i < 47 ? 110 : 100,
    opponentScore: i < 47 ? 100 : 110,
    overtime: 0,
    locationLabel: 'Fixture arena',
    recapUrl: `https://www.nba.com/game/00223${String(i).padStart(5, '0')}`,
  })),
};
function mockIdentity() {
  server.use(
    http.get('http://localhost/api/teams/:id', () =>
      HttpResponse.json({
        team: homeTeam,
        provenance: leagueFixture.provenance,
        availability: {
          roster: false,
          schedule: false,
          statistics: false,
          reason: 'Identity directory only.',
        },
      }),
    ),
  );
}
describe('historical roster/results UI', () => {
  it('loads on demand, preserves missing identity and null percentages, and qualifies before leaders', async () => {
    mockIdentity();
    const read = vi.fn(() => HttpResponse.json(body));
    server.use(http.get('http://localhost/api/teams/:id/archive', read));
    renderApp(`/teams/${homeTeam.id}`);
    await screen.findByRole('button', {
      name: 'Load roster and regular-season results',
    });
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Load roster and regular-season results' }),
    );
    const roster = await screen.findByRole('group', {
      name: 'Historical source-listed roster',
    });
    expect(within(roster).getByRole('link', { name: person.name })).toHaveAttribute(
      'href',
      '/players/2544',
    );
    expect(within(roster).getByRole('link', { name: other.name })).toHaveAttribute(
      'href',
      other.articleUrl,
    );
    expect(within(roster).getByText('NBA identity unavailable')).toBeInTheDocument();
    const summaries = screen.getByRole('group', {
      name: 'Historical participant summaries',
    });
    expect(within(summaries).getAllByRole('row')).toHaveLength(2);
    expect(within(summaries).getByText('50.0%')).toBeInTheDocument();
    expect(within(summaries).getByText('Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/PTS\/game leaders: Fixture player A \(25\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/47 wins, 35 losses in 82/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Regular result venue filter'), {
      target: { value: 'away' },
    });
    expect(screen.getByText(/5 wins, 35 losses in 40/)).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText('Shareable team-season URL') as HTMLInputElement).value,
    ).toContain('side=away');
  });
  it('restores scoped GP filters and tied source leaders without mixing regular results', async () => {
    mockIdentity();
    server.use(
      http.get('http://localhost/api/teams/:id/archive', () => HttpResponse.json(body)),
    );
    renderApp(`/teams/${homeTeam.id}?details=2023-24&participants=playoffs&minGames=5`);
    await screen.findByRole('group', { name: 'Historical participant summaries' });
    expect(
      screen.getByText(
        /PTS\/game leaders: Fixture player A \(10\); Fixture player B \(10\)/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/47 wins, 35 losses in 82/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minimum participant GP'), {
      target: { value: '10' },
    });
    expect(
      screen.getByText(/No published participants meet these filters/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Participant scope'), {
      target: { value: 'regular-season' },
    });
    await waitFor(() =>
      expect(
        screen.getByText(/PTS\/game leaders: Fixture player A \(25\)/),
      ).toBeInTheDocument(),
    );
  });
  it('shows source failure and rejects unsupported state without requesting a fake roster', async () => {
    mockIdentity();
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/teams/:id/archive', read));
    const view = renderApp(`/teams/${homeTeam.id}?details=2025-26`);
    await screen.findByText('Invalid team-season filters.');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp(`/teams/${homeTeam.id}?details=2023-24`);
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
