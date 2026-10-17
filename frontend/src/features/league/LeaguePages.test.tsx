import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueLeadersResponseSchema,
  LeagueSeasonsResponseSchema,
  LeagueStandingsResponseSchema,
  type LeagueLeadersResponse,
  type LeagueSeasonsResponse,
  type LeagueStandingsResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subjects before assertion timers; the app still renders its actual lazy routes.
import './LeagueStandingsPage';
import './LeagueLeadersPage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'committed-snapshot' as const,
  servedAt: '2026-10-16T00:00:00.000Z',
  retrievedAt: '2026-10-15T20:00:00.000Z',
  sourceUpdatedAt: null,
  coverage: 'Fixture coverage.',
  warnings: ['Fixture warning.'],
};
const caps = (playerStats: boolean) => ({
  teamResults: true,
  playerStats,
  teamRatings: true,
  playerPossessions: playerStats,
  publishedStandings: true,
});
const seasonInfo = (season: string, playerStats: boolean) => ({
  season,
  status: 'complete' as const,
  notes: [],
  teams: 30,
  regularSeasonGames: 1230,
  playoffGames: 80,
  incompleteBoxScores: playerStats ? 0 : 120,
  quarantinedGames: 0,
  firstDate: `${season.slice(0, 4)}-10-20`,
  lastDate: `${Number(season.slice(0, 4)) + 1}-06-15`,
  retrievedAt: '2026-10-15T20:00:00.000Z',
  capabilities: caps(playerStats),
});
const seasons: LeagueSeasonsResponse = {
  seasons: [
    seasonInfo('1992-93', false),
    seasonInfo('2018-19', true),
    seasonInfo('2024-25', true),
  ],
  provenance,
};
const team = (n: number, abbreviation: string, name: string) => ({
  id: `nba:${1610612700 + n}`,
  abbreviation,
  name,
});
const standing = (
  rank: number,
  t: ReturnType<typeof team>,
  wins: number,
  gb: number,
) => ({
  rank,
  team: t,
  wins,
  losses: 82 - wins,
  winPercentage: wins / 82,
  gamesBehind: gb,
  division: 'Atlantic',
  home: '30-11',
  road: '20-21',
  lastTen: '6-4',
  streak: 'W 2',
  clinch: rank === 1 ? 'x' : null,
});
const standings = (season: string): LeagueStandingsResponse => ({
  season,
  basis: 'published',
  conferences: [
    {
      conference: 'East',
      rows: [
        standing(1, team(38, 'BOS', 'Boston Celtics'), 61, 0),
        standing(2, team(52, 'NYK', 'New York Knicks'), 51, 10),
      ],
    },
    {
      conference: 'West',
      rows: [standing(1, team(60, 'OKC', 'Oklahoma City Thunder'), 68, 0)],
    },
  ],
  resultsAgreement: { teams: 3, agreeing: 3 },
  provenance,
});
const leaders = (q: Record<string, string>): LeagueLeadersResponse => ({
  query: {
    season: q.season ?? '2024-25',
    scope: (q.scope as 'playoffs') ?? 'regular-season',
    metric: (q.metric as 'points') ?? 'points',
    mode: (q.mode as 'per-game') ?? 'per-game',
    team: q.team ?? null,
    minGames: 58,
    minAttempts: null,
    page: 1,
  },
  definition: 'Points scored. Total ÷ games played.',
  qualification: 'At least 58 games.',
  rows: [
    {
      rank: 1,
      playerId: '1628983',
      name: 'Fixture Guard',
      teams: [team(60, 'OKC', 'Oklahoma City Thunder')],
      gamesPlayed: 76,
      minutes: 2598,
      value: 32.68,
      inputs: [{ label: 'Points', value: 2484 }],
      percentile: 99.9,
    },
    {
      rank: 2,
      playerId: '203507',
      name: 'Fixture Forward',
      teams: [team(49, 'MIL', 'Milwaukee Bucks')],
      gamesPlayed: 67,
      minutes: 2289,
      value: 30.39,
      inputs: [{ label: 'Points', value: 2036 }],
      percentile: 99.7,
    },
  ],
  total: 2,
  population: {
    players: 569,
    qualified: 2,
    belowGames: 400,
    belowAttempts: 0,
    missingInputs: 3,
  },
  modes: [
    { mode: 'totals', available: true, reason: null },
    { mode: 'per-game', available: true, reason: null },
    { mode: 'per-36', available: true, reason: null },
    {
      mode: 'per-100',
      available: !q.team,
      reason: q.team
        ? 'NBA.com possession counts cover a player’s whole season, not one team stint.'
        : null,
    },
  ],
  provenance,
});

function serveLeague(requests: string[] = []) {
  server.use(
    http.get('http://localhost/api/league/seasons', () => HttpResponse.json(seasons)),
    http.get('http://localhost/api/league/standings', ({ request }) => {
      const season = new URL(request.url).searchParams.get('season')!;
      requests.push(`standings:${season}`);
      return HttpResponse.json(standings(season));
    }),
    http.get('http://localhost/api/league/leaders', ({ request }) => {
      const p = Object.fromEntries(new URL(request.url).searchParams);
      requests.push(`leaders:${new URL(request.url).search}`);
      if (p.season === '1992-93')
        return HttpResponse.json(
          {
            error: {
              code: 'LEAGUE_PLAYER_STATS_INCOMPLETE',
              message: 'More than 0.5% of 1992-93 box scores do not add up.',
              status: 422,
            },
          },
          { status: 422 },
        );
      return HttpResponse.json(leaders(p));
    }),
  );
}

describe('league standings and leaders', () => {
  it('uses contract-valid fixtures', () => {
    expect(LeagueSeasonsResponseSchema.safeParse(seasons).error?.issues ?? []).toEqual(
      [],
    );
    expect(
      LeagueStandingsResponseSchema.safeParse(standings('2024-25')).error?.issues ?? [],
    ).toEqual([]);
    expect(
      LeagueLeadersResponseSchema.safeParse(leaders({})).error?.issues ?? [],
    ).toEqual([]);
  });

  it('opens the latest season, switches seasons and keeps the era’s playoff format', async () => {
    const requests: string[] = [];
    serveLeague(requests);
    renderApp('/standings');
    const table = await screen.findByRole('group', { name: 'Standings table' });
    expect(within(table).getByRole('link', { name: 'Boston Celtics' })).toHaveAttribute(
      'href',
      '/teams/nba:1610612738?season=2024-25',
    );
    expect(requests).toContain('standings:2024-25');
    expect(screen.getByText(/3 of 3 teams’ published W–L match/)).toBeInTheDocument();
    expect(screen.getAllByText(/Play-in 7–10/)).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Season'), { target: { value: '2018-19' } });
    await waitFor(() => expect(requests).toContain('standings:2018-19'));
    expect(
      await screen.findAllByText(/eight playoff teams per conference/),
    ).not.toHaveLength(0);
    await waitFor(() => expect(screen.queryAllByText(/Play-in 7–10/)).toHaveLength(0));
  });

  it('ranks leaders with stated qualification and explains unavailable rates', async () => {
    const requests: string[] = [];
    serveLeague(requests);
    renderApp('/leaders?team=nba:1610612760');
    expect(await screen.findByText(/2 qualified of 569 players/)).toBeInTheDocument();
    expect(requests.at(-1)).toContain('season=2024-25');
    expect(screen.getByText(/whole season, not one team stint/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Per 100 poss' })).toBeDisabled();
    const table = screen.getByRole('group', { name: 'League leaders table' });
    expect(within(table).getByRole('link', { name: 'Fixture Guard' })).toHaveAttribute(
      'href',
      '/players/1628983',
    );
    // Percentages are a single season ratio: the rate control is not offered.
    fireEvent.change(screen.getByLabelText('Measure'), {
      target: { value: 'trueShootingPercentage' },
    });
    await waitFor(() =>
      expect(requests.at(-1)).toMatch(
        /metric=trueShootingPercentage.*mode=totals|mode=totals.*metric=trueShootingPercentage/,
      ),
    );
  });

  it('shows the API’s reason when a season cannot support player research', async () => {
    serveLeague();
    renderApp('/leaders?season=1992-93');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'box scores do not add up',
    );
    // The season list marks it too.
    expect(
      screen.getByRole('option', { name: /1992–93 — box scores incomplete/ }),
    ).toBeDisabled();
  });

  it('sends old published-leader links to the Wikipedia view and rejects malformed URLs', async () => {
    serveLeague();
    const view = renderApp('/leaders?category=FG%25');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Published category leaders',
      }),
    ).toBeInTheDocument();
    view.unmount();
    renderApp('/standings?season=2024&season=2025');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});
