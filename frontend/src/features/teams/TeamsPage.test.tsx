import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './TeamsPage';

const team = {
  id: 'nba:1610612744',
  sourceId: '1610612744',
  abbreviation: 'GSW',
  name: 'Golden State Warriors',
};
const leagueAttribution = {
  title: '2023–24 Golden State Warriors season',
  revision: 1,
  url: 'https://en.wikipedia.org/w/index.php?oldid=1',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  adapted: true,
};
const provenance = {
  source: 'nba-api-static',
  servedAt: '2026-10-13T16:00:00.000Z',
  retrievedAt: null,
  asOf: null,
  isLive: false,
  scope: 'directory',
  coverage: 'Current identity facts only.',
  warnings: ['MIT-licensed directory, Swar Patel.'],
};

describe('team pages', () => {
  it('filters via shareable URL and links namespaced current identities', async () => {
    let search = '';
    server.use(
      http.get('http://localhost/api/teams', ({ request }) => {
        search = new URL(request.url).searchParams.get('search') ?? '';
        return HttpResponse.json({ teams: [team], provenance });
      }),
    );
    renderApp('/teams');
    expect(await screen.findByRole('link', { name: team.name })).toHaveAttribute(
      'href',
      '/teams/nba:1610612744',
    );
    fireEvent.change(screen.getByLabelText('Team name or abbreviation'), {
      target: { value: 'GSW' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find teams' }));
    await waitFor(() => expect(search).toBe('GSW'));
  });
  it('discloses missing rosters/schedules instead of rendering fake records', async () => {
    server.use(
      http.get('http://localhost/api/teams/:teamId', () =>
        HttpResponse.json({
          team,
          provenance,
          availability: {
            roster: false,
            schedule: false,
            statistics: false,
            reason: 'No rights-cleared season source.',
          },
        }),
      ),
    );
    renderApp('/teams/nba:1610612744');
    await screen.findByRole('heading', { name: team.name, level: 1 });
    expect(screen.getByText('Live season data unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to My NBA' })).toBeInTheDocument();
  });
  it('handles empty matches and source failures', async () => {
    server.use(
      http.get('http://localhost/api/teams', () =>
        HttpResponse.json({ teams: [], provenance }),
      ),
    );
    const view = renderApp('/teams?search=unknown');
    expect(
      await screen.findByText('No current teams match this search.'),
    ).toBeInTheDocument();
    view.unmount();
    server.use(
      http.get(
        'http://localhost/api/teams',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/teams');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});

describe('team wall records', () => {
  const directory = { teams: [team], provenance };
  const rankings = {
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
        team,
        conference: 'West',
        observedGames: 82,
        wins: 46,
        losses: 36,
        completeSeason: true,
        missingGameIds: [],
        winPercentage: 46 / 82,
        pointsPerGame: 117.8,
        opponentPointsPerGame: 115.2,
        finalMarginPerGame: 2.6,
        home: { games: 41, wins: 21, losses: 20 },
        away: { games: 41, wins: 25, losses: 16 },
        lastTen: {
          expectedGames: 10,
          observedGames: 10,
          complete: true,
          wins: 7,
          losses: 3,
          from: '2024-03-25',
          to: '2024-04-14',
        },
        streak: { kind: 'L', length: 1, through: '2024-04-14' },
        source: leagueAttribution,
        rank: 12,
        value: 46 / 82,
      },
    ],
    rankingPopulation: 30,
    belowMinimumTeams: 0,
    incompleteExcludedTeams: 0,
    missingMetricTeams: 0,
    reconciledGames: 1219,
    quarantinedGameIds: [],
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    attributions: Array.from({ length: 30 }, () => leagueAttribution),
    conferenceSource: leagueAttribution,
    provenance: { ...provenance, source: 'wikipedia', scope: 'regular-season' },
  };

  it('adds each recorded 2023–24 record to its plate and its accessible name', async () => {
    server.use(
      http.get('http://localhost/api/teams', () => HttpResponse.json(directory)),
      http.get('http://localhost/api/recorded/team-rankings', () =>
        HttpResponse.json(rankings),
      ),
    );
    renderApp('/teams');
    const plate = await screen.findByRole('link', {
      name: 'Golden State Warriors team hub, recorded 2023–24 record 46–36',
    });
    expect(plate).toHaveTextContent('46–36');
  });

  it('keeps plain plates when the recorded rankings are unavailable', async () => {
    server.use(
      http.get('http://localhost/api/teams', () => HttpResponse.json(directory)),
      http.get(
        'http://localhost/api/recorded/team-rankings',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/teams');
    expect(
      await screen.findByRole('link', { name: 'Golden State Warriors team hub' }),
    ).toBeInTheDocument();
  });
});
