import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueDistributionResponseSchema,
  LeagueMovementResponseSchema,
  LeaguePlayerResponseSchema,
  type LeagueDistributionResponse,
  type LeagueMovementResponse,
  type LeaguePlayerResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subjects before assertion timers; the app still renders its actual lazy routes.
import './LeaguePlayerRoom';
import './LeagueMovementPage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'committed-snapshot' as const,
  servedAt: '2026-10-16T00:00:00.000Z',
  retrievedAt: '2026-10-15T20:00:00.000Z',
  sourceUpdatedAt: null,
  coverage: 'Fixture coverage.',
  warnings: [],
};
const team = (abbreviation: string, n: number) => ({
  id: `nba:${1610612700 + n}`,
  abbreviation,
  name: `Fixture ${abbreviation}`,
});
const ref = (id: string, date: string, opponent = 'BOS') => ({
  id,
  date,
  season: '2017-18',
  team: 'CLE',
  opponent,
  home: true,
  won: true,
});
const mark = (key: string, label: string, value: number, count = 1) => ({
  key,
  label,
  value,
  games: [ref('nba:0021700100', '2017-11-03')],
  count,
});
function player(whole: boolean): LeaguePlayerResponse {
  return {
    playerId: '2544',
    name: 'Fixture Forward',
    coverage: {
      firstSeason: whole ? '2003-04' : '1983-84',
      lastSeason: '2017-18',
      firstGame: '2003-10-29',
      lastGame: '2018-04-11',
      mayPredateArchive: !whole,
      incompleteSeasons: whole ? [] : [{ season: '1990-91', teamGamesAffected: 4 }],
      wholeCareer: whole,
    },
    seasons: [
      {
        season: '2017-18',
        age: 33,
        stints: [
          {
            team: team('CLE', 39),
            franchiseId: 'nba:1610612739',
            firstGame: '2017-10-17',
            lastGame: '2018-02-01',
            gamesPlayed: 48,
            teamGamesInSpan: 50,
            points: 1300,
            rebounds: 400,
            assists: 450,
            minutes: 1800,
          },
          {
            team: team('MIA', 48),
            franchiseId: 'nba:1610612748',
            firstGame: '2018-02-03',
            lastGame: '2018-04-11',
            gamesPlayed: 30,
            teamGamesInSpan: 32,
            points: 900,
            rebounds: 300,
            assists: 280,
            minutes: 1100,
          },
        ],
        playoffGames: 22,
        highs: [mark('pts', 'Points', 57)],
        lows: [mark('pts', 'Points', 10)],
      },
    ],
    gaps: ['2016-17'],
    careerHighs: {
      regularSeason: [mark('pts', 'Points', 61)],
      playoffs: [mark('pts', 'Points', 51, 2)],
    },
    milestones: [
      {
        key: 'pts',
        label: whole ? '30,000 career points' : '30,000 points in archived games',
        threshold: 30000,
        game: { ...ref('nba:0021700700', '2018-01-23', 'SAS') },
        archiveCount: !whole,
      },
    ],
    provenance,
  };
}
const distribution: LeagueDistributionResponse = {
  query: { season: '2017-18', scope: 'regular-season', metric: 'points' },
  definition: 'Points scored.',
  qualification: 'At least 58 games.',
  n: 4,
  summary: { min: 10, q1: 12, median: 15, q3: 20, max: 30, mean: 16 },
  bins: [
    { from: 10, to: 20, count: 3 },
    { from: 20, to: 30, count: 1 },
  ],
  marker: {
    playerId: '2544',
    name: 'Fixture Forward',
    value: 27.5,
    percentile: 87.5,
    rank: 1,
    reason: null,
  },
  profile: [
    { metric: 'points', label: 'Points per game', value: 27.5, percentile: 87.5, n: 4 },
    {
      metric: 'freeThrowPercentage',
      label: 'FT%',
      value: null,
      percentile: null,
      n: 3,
    },
  ],
  provenance,
};
const movement = (date: string): LeagueMovementResponse => ({
  query: {
    season: '2015-16',
    scope: 'regular-season',
    metric: 'threesMade',
    mode: 'per-game',
    date,
  },
  dates: ['2015-10-27', '2015-10-28', '2015-10-29'],
  snapshot: [
    {
      rank: 1,
      playerId: '201939',
      name: 'Fixture Shooter',
      team: 'GSW',
      gamesPlayed: 3,
      value: 5.3,
      previousRank: 2,
    },
    {
      rank: 2,
      playerId: '202691',
      name: 'Fixture Wing',
      team: 'GSW',
      gamesPlayed: 3,
      value: 4,
      previousRank: null,
    },
  ],
  trajectories: [{ playerId: '201939', name: 'Fixture Shooter', ranks: [3, 2, 1] }],
  qualification:
    'Each date ranks players with at least 70% of the most games any team had played by then.',
  provenance,
});

describe('player records and leaderboard movement', () => {
  it('uses contract-valid fixtures', () => {
    expect(
      LeaguePlayerResponseSchema.safeParse(player(true)).error?.issues ?? [],
    ).toEqual([]);
    expect(
      LeagueDistributionResponseSchema.safeParse(distribution).error?.issues ?? [],
    ).toEqual([]);
    expect(
      LeagueMovementResponseSchema.safeParse(movement('2015-10-29')).error?.issues ??
        [],
    ).toEqual([]);
  });

  it('shows the timeline, availability, highs, milestones and percentiles', async () => {
    server.use(
      http.get('http://localhost/api/league/players/:id', () =>
        HttpResponse.json(player(true)),
      ),
      http.get('http://localhost/api/league/distribution', () =>
        HttpResponse.json(distribution),
      ),
    );
    renderApp('/players/2544/records');
    expect(
      await screen.findByText(/holds every game of this career to date/),
    ).toBeInTheDocument();
    const timeline = screen.getByRole('group', { name: 'Career timeline' });
    expect(within(timeline).getAllByRole('row')).toHaveLength(3);
    expect(within(timeline).getByText('96%')).toBeInTheDocument();
    expect(within(timeline).getByText('(traded or signed)')).toBeInTheDocument();
    expect(timeline).toHaveTextContent('no games in 2016–17');
    expect(screen.getByRole('link', { name: /Jan 23, 2018 vs SAS/ })).toHaveAttribute(
      'href',
      '/games/nba:0021700700',
    );
    expect(
      await screen.findByText(/88th percentile \(n = 4; 27.5\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('Not in the qualified cohort')).toBeInTheDocument();
  });

  it('labels counts that may not cover the whole career', async () => {
    server.use(
      http.get('http://localhost/api/league/players/:id', () =>
        HttpResponse.json(player(false)),
      ),
      http.get('http://localhost/api/league/distribution', () =>
        HttpResponse.json(distribution),
      ),
    );
    renderApp('/players/2544/records');
    expect(
      await screen.findByText(/not necessarily the whole career/),
    ).toBeInTheDocument();
    expect(screen.getByText(/earlier games may exist outside it/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Career highs in archived games' }),
    ).toBeInTheDocument();
    expect(screen.getByText('30,000 points in archived games')).toBeInTheDocument();
  });

  it('moves through game days and shows rank changes', async () => {
    const seen: string[] = [];
    server.use(
      http.get('http://localhost/api/league/seasons', () =>
        HttpResponse.json({ seasons: [], provenance }),
      ),
      http.get('http://localhost/api/league/movement', ({ request }) => {
        const p = new URL(request.url).searchParams;
        seen.push(p.toString());
        return HttpResponse.json(movement(p.get('date') ?? '2015-10-29'));
      }),
    );
    renderApp('/leaders/movement?season=2015-16&metric=threesMade');
    const table = await screen.findByRole('group', {
      name: 'Leaderboard on this date',
    });
    expect(within(table).getByLabelText('up 1')).toBeInTheDocument();
    expect(within(table).getByText('new')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous game day' }));
    await waitFor(() => expect(seen.at(-1)).toContain('date=2015-10-28'));
  });
});
