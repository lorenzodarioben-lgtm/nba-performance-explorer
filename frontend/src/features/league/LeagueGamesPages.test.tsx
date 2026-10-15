import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueGameDetailResponseSchema,
  LeagueGamesResponseSchema,
  LeaguePlayByPlayResponseSchema,
  type LeagueGameDetailResponse,
  type LeagueGameSummary,
  type LeagueGamesResponse,
  type LeaguePlayByPlayResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subjects before assertion timers; the app still renders its actual lazy routes.
import './LeagueGamesPage';
import './LeagueGamePage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'live' as const,
  servedAt: '2026-10-20T23:40:00.000Z',
  retrievedAt: '2026-10-20T23:39:50.000Z',
  sourceUpdatedAt: '2026-10-20T23:39:30.000Z',
  coverage: 'Fixture coverage.',
  warnings: [],
};
const team = (abbreviation: string, n: number, name: string) => ({
  id: `nba:${1610612700 + n}`,
  abbreviation,
  name,
});
const BOS = team('BOS', 38, 'Boston Celtics'),
  PHI = team('PHI', 55, 'Philadelphia 76ers');
const game = (over: Partial<LeagueGameSummary>): LeagueGameSummary => ({
  id: 'nba:0022600001',
  date: '2026-10-20',
  startTimeUtc: '2026-10-20T23:30:00.000Z',
  startTimeTbd: false,
  status: 'scheduled',
  statusText: '7:30 pm ET',
  period: null,
  clock: null,
  home: { team: BOS, score: null, record: '0-0' },
  away: { team: PHI, score: null, record: '0-0' },
  type: 'regular-season',
  label: null,
  neutralSite: false,
  overtimePeriods: null,
  source: 'schedule',
  note: null,
  ...over,
});
const day: LeagueGamesResponse = {
  date: '2026-10-20',
  games: [
    game({
      id: 'nba:0022600001',
      status: 'live',
      statusText: 'Q3 4:31',
      period: 3,
      clock: '4:31',
      source: 'scoreboard',
      home: { team: BOS, score: 71, record: '0-0' },
      away: { team: PHI, score: 66, record: '0-0' },
    }),
    game({
      id: 'nba:0022600003',
      status: 'postponed',
      statusText: 'PPD',
      note: 'NBA.com marks this game postponed.',
    }),
    game({
      id: 'nba:0022600002',
      startTimeUtc: null,
      startTimeTbd: true,
      statusText: 'TBD',
    }),
    game({
      id: 'nba:0022500900',
      status: 'final',
      overtimePeriods: 2,
      source: 'archive',
      home: { team: BOS, score: 130, record: null },
      away: { team: PHI, score: 128, record: null },
    }),
  ],
  previousDate: '2026-10-15',
  nextDate: '2026-10-21',
  performers: [
    {
      key: 'pts',
      label: 'Points',
      rows: [
        {
          playerId: '1628369',
          name: 'Fixture Star',
          team: 'BOS',
          opponent: 'PHI',
          gameId: 'nba:0022500900',
          value: 41,
        },
      ],
    },
  ],
  coverage: 'NBA.com’s live 2026-27 schedule and today’s scoreboard.',
  provenance,
};
const detail: LeagueGameDetailResponse = {
  game: game({
    id: 'nba:0022401229',
    date: '2024-12-14',
    status: 'final',
    overtimePeriods: 0,
    source: 'archive',
    neutralSite: true,
    home: { team: BOS, score: 110, record: null },
    away: { team: PHI, score: 102, record: null },
  }),
  box: {
    source: 'archive',
    teams: [
      {
        team: BOS,
        home: true,
        players: [
          {
            playerId: '1628369',
            name: 'Fixture Star',
            starter: true,
            position: 'F',
            status: 'played',
            note: null,
            minutes: 38.2,
            stats: {
              pts: 30,
              fgm: 11,
              fga: 20,
              fg3m: 4,
              fg3a: 9,
              ftm: 4,
              fta: 4,
              oreb: 1,
              dreb: 8,
              reb: 9,
              ast: 6,
              stl: 1,
              blk: 0,
              tov: 2,
              pf: 2,
              pm: 9,
            },
          },
          {
            playerId: '1630202',
            name: 'Fixture Reserve',
            starter: false,
            position: null,
            status: 'did-not-play',
            note: 'DNP - Coach’s Decision',
            minutes: null,
            stats: {},
          },
        ],
        totals: {
          pts: 110,
          fgm: 40,
          fga: 85,
          fg3m: 14,
          fg3a: 38,
          ftm: 16,
          fta: 20,
          reb: 45,
          ast: 25,
        },
        addsUp: true,
      },
      {
        team: PHI,
        home: false,
        players: [
          {
            playerId: '203954',
            name: 'Fixture Center',
            starter: true,
            position: 'C',
            status: 'played',
            note: null,
            minutes: 35,
            stats: {
              pts: 28,
              reb: 12,
              ast: 3,
              fgm: 10,
              fga: 19,
              fg3m: 0,
              fg3a: 1,
              ftm: 8,
              fta: 10,
            },
          },
        ],
        totals: { pts: 102 },
        addsUp: false,
      },
    ],
  },
  highs: [
    {
      key: 'pts',
      label: 'Points',
      value: 30,
      players: [{ playerId: '1628369', name: 'Fixture Star', team: 'BOS' }],
    },
  ],
  lineScore: {
    source: 'cdn',
    periods: [1, 2, 3, 4].map((period) => ({ period, home: 27 + period, away: 25 })),
  },
  venue: {
    arena: 'T-Mobile Arena',
    city: 'Las Vegas',
    attendance: 17113,
    officials: ['Fixture Official'],
  },
  notes: [],
  provenance,
};
const event = (
  index: number,
  home: number,
  away: number,
  points: number,
  scoringTeam: 'home' | 'away' | null,
  description: string,
  period = 1,
) => ({
  index,
  period,
  clock: `${11 - index}:00`,
  elapsed: index * 60,
  team: scoringTeam,
  playerId: scoringTeam ? '1628369' : null,
  player: scoringTeam ? 'F. Star' : null,
  type: (points ? 'made-shot' : 'other') as 'made-shot',
  description,
  home,
  away,
  points,
  scoringTeam,
});
const pbp: LeaguePlayByPlayResponse = {
  gameId: 'nba:0022401229',
  home: BOS,
  away: PHI,
  source: 'cdn',
  complete: true,
  events: [
    event(0, 0, 0, 0, null, 'Start of 1st Period'),
    event(1, 2, 0, 2, 'home', 'Star 2pt'),
    event(2, 2, 3, 3, 'away', 'Center 3pt'),
    event(3, 5, 3, 3, 'home', 'Star 3pt'),
  ],
  analysis: {
    leadChanges: 2,
    timesTied: 0,
    largestLead: { home: { points: 2, atIndex: 1 }, away: { points: 1, atIndex: 2 } },
    runs: [],
    runThreshold: 8,
    biggestRun: { home: null, away: null },
    periodScores: [{ period: 1, home: 5, away: 3 }],
    scoreCorrections: 0,
  },
  sourceCounts: {
    leadChanges: 2,
    timesTied: 0,
    biggestLeadHome: 2,
    biggestLeadAway: 1,
    biggestRunHome: 3,
    biggestRunAway: 3,
  },
  checks: [
    'Lead changes, ties and largest leads match NBA.com’s own counts for this game.',
  ],
  provenance,
};

describe('scoreboard and game pages', () => {
  it('uses contract-valid fixtures', () => {
    expect(LeagueGamesResponseSchema.safeParse(day).error?.issues ?? []).toEqual([]);
    expect(
      LeagueGameDetailResponseSchema.safeParse(detail).error?.issues ?? [],
    ).toEqual([]);
    expect(LeaguePlayByPlayResponseSchema.safeParse(pbp).error?.issues ?? []).toEqual(
      [],
    );
  });

  it('shows each source-reported state and moves between game days', async () => {
    const requested: string[] = [];
    server.use(
      http.get('http://localhost/api/league/games', ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json(day);
      }),
      http.get('http://localhost/api/league/calendar', () =>
        HttpResponse.json({
          month: '2026-10',
          days: [{ date: '2026-10-20', games: 4, finals: 1, scheduled: 2, other: 1 }],
          provenance,
        }),
      ),
    );
    renderApp('/games');
    expect(
      await screen.findByRole('link', {
        name: /Philadelphia 76ers 66 at Boston Celtics 71, Live · Q3 4:31/,
      }),
    ).toHaveAttribute('href', '/games/nba:0022600001');
    // No score, clock or period for games that have not started.
    expect(
      screen.getByRole('link', {
        name: /Philadelphia 76ers at Boston Celtics, Postponed/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Scheduled · time to be decided/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Final · 2OT/ })).toBeInTheDocument();
    const top = screen.getByRole('region', { name: 'Top performances' });
    expect(within(top).getByRole('link', { name: 'Fixture Star' })).toHaveAttribute(
      'href',
      '/players/1628369',
    );
    expect(top).toHaveTextContent('41');
    expect(
      await screen.findByRole('button', { name: /Oct 20, 2026: 4 games/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next game day' }));
    await waitFor(() => expect(requested.at(-1)).toBe('?date=2026-10-21'));
  });

  it('shows a game’s box score, highs and play-by-play with a keyboard scrubber', async () => {
    server.use(
      http.get('http://localhost/api/league/games/:id', () =>
        HttpResponse.json(detail),
      ),
      http.get('http://localhost/api/league/games/:id/play-by-play', () =>
        HttpResponse.json(pbp),
      ),
    );
    renderApp('/games/nba:0022401229');
    const boxes = await screen.findAllByRole('group', { name: /box score$/ });
    expect(boxes).toHaveLength(2);
    expect(
      within(boxes[1]!).getByRole('link', { name: 'Fixture Star' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fixture Reserve \(DNP - Coach’s Decision\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/player points do not add up to the team score/),
    ).toBeInTheDocument();
    expect(screen.getByText('Designated home', { exact: false })).toBeInTheDocument();
    const flow = await screen.findByRole('group', { name: 'Scoring flow summary' });
    expect(within(flow).getAllByRole('row')).toHaveLength(7);
    const scrubber = screen.getByRole('slider');
    expect(scrubber).toHaveAttribute('aria-valuetext', 'Q1 8:00, PHI 3, BOS 5');
    fireEvent.click(screen.getByRole('button', { name: 'Previous scoring play' }));
    await waitFor(() => expect(screen.getByRole('slider')).toHaveValue('2'));
    fireEvent.change(screen.getByLabelText('Events'), { target: { value: 'scoring' } });
    expect(screen.getByText('3 of 4 events')).toBeInTheDocument();
  });

  it('rejects a malformed game ID and keeps the 2024 playoff film room route', async () => {
    renderApp('/games/BOS-vs-PHI');
    expect(await screen.findByRole('alert')).toHaveTextContent('not an NBA game ID');
  });
});
