import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import type { RecordedTeamRankingsResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
import { readTeamArchiveState } from '../wiki-archive/team-archive-state';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedTeamRankingsPage';
const body: RecordedTeamRankingsResponse = {
  season: '2023-24',
  scope: 'regular-season',
  officialStandings: false,
  metric: 'winPercentage',
  order: 'desc',
  minGames: 1,
  completeOnly: false,
  conference: null,
  rows: [
    {
      team: homeTeam,
      conference: 'West',
      observedGames: 81,
      wins: 47,
      losses: 34,
      completeSeason: false,
      missingGameIds: ['nba:0022300001'],
      winPercentage: 47 / 81,
      pointsPerGame: 117,
      opponentPointsPerGame: 116,
      finalMarginPerGame: 1,
      home: { games: 41, wins: 24, losses: 17 },
      away: { games: 40, wins: 23, losses: 17 },
      lastTen: {
        expectedGames: 10,
        observedGames: 9,
        complete: false,
        wins: null,
        losses: null,
        from: '2024-03-25',
        to: '2024-04-14',
      },
      streak: { kind: null, length: null, through: '2024-04-14' },
      source: leagueFixture.attribution,
      rank: 2,
      value: 47 / 81,
    },
  ],
  rankingPopulation: 30,
  belowMinimumTeams: 0,
  incompleteExcludedTeams: 0,
  missingMetricTeams: 0,
  reconciledGames: 1219,
  quarantinedGameIds: ['nba:0022300001'],
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  attributions: Array.from({ length: 30 }, (_, i) => ({
    ...leagueFixture.attribution,
    revision: 1234 + i,
    url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
  })),
  conferenceSource: leagueFixture.attribution,
  provenance: leagueFixture.provenance,
};
describe('historical team rankings UI', () => {
  it('preserves missing last-ten/streak values, source sample and known team links', async () => {
    server.use(
      http.get('http://localhost/api/recorded/team-rankings', () =>
        HttpResponse.json(body),
      ),
    );
    renderApp('/standings/recorded');
    const table = await screen.findByRole('group', {
      name: 'Recorded team ranking exact values',
    });
    expect(table).toHaveTextContent('81 (partial)');
    expect(table).toHaveTextContent('9/10');
    expect(table).toHaveTextContent('Unavailable');
    expect(screen.getByRole('link', { name: 'Los Angeles Lakers' })).toHaveAttribute(
      'href',
      '/teams/nba:1610612747?details=2023-24',
    );
    const target = screen
      .getByRole('link', { name: 'Los Angeles Lakers' })
      .getAttribute('href')!;
    const linked = readTeamArchiveState(
      new URL(target, 'http://localhost').searchParams,
    );
    expect(linked.valid).toBe(true);
    expect(linked.parsed.data?.details).toBe('2023-24');
    expect(screen.getByText(/not official standings/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('refreshes metric/coverage/conference filters and renders empty samples', async () => {
    let latest = '';
    server.use(
      http.get('http://localhost/api/recorded/team-rankings', ({ request }) => {
        latest = request.url;
        return HttpResponse.json(
          latest.includes('completeOnly=true')
            ? { ...body, rows: [], rankingPopulation: 0, completeOnly: true }
            : body,
        );
      }),
    );
    renderApp('/standings/recorded');
    await screen.findByRole('group', { name: 'Recorded team ranking exact values' });
    fireEvent.change(screen.getByLabelText('Team ranking metric'), {
      target: { value: 'pointsPerGame' },
    });
    await waitFor(() => expect(latest).toContain('metric=pointsPerGame'));
    fireEvent.change(screen.getByLabelText('Team ranking conference'), {
      target: { value: 'West' },
    });
    await waitFor(() => expect(latest).toContain('conference=West'));
    fireEvent.change(screen.getByLabelText('Team source coverage'), {
      target: { value: 'true' },
    });
    expect(
      await screen.findByText('No qualified teams match these filters.'),
    ).toBeInTheDocument();
  });
  it('rejects repeated/invalid filters before reads and handles genuine source failure', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/recorded/team-rankings', read));
    const v = renderApp(
      '/standings/recorded?metric=winPercentage&metric=pointsPerGame',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    v.unmount();
    renderApp('/standings/recorded');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.getByLabelText('Team ranking metric')).toBeInTheDocument();
  });
});
