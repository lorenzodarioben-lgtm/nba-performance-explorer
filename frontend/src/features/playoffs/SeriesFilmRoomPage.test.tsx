import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  PlayoffSeriesFilmRoomResponseSchema,
  type ArchiveGame,
  type PlayoffSeriesFilmRoomResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import {
  awayTeam as A,
  homeTeam as B,
  gamesFixture,
} from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './SeriesFilmRoomPage';

// Synthetic only: A (teams[0]) sweeps B. Each game: [A points by period, B points by period, A home].
const plan: [number[], number[], boolean][] = [
  [[25, 25, 25, 25], [20, 20, 20, 20], true],
  [[20, 25, 25, 35], [30, 25, 20, 26], false],
  [[20, 20, 20, 20, 12], [20, 20, 20, 20, 10], false],
  [[30, 30, 30, 30], [10, 10, 10, 10], true],
];
const games: ArchiveGame[] = plan.map(([a, b, aHome], i) => {
  const id = `004230010${i + 1}`;
  return {
    ...gamesFixture.games[0]!,
    id: `nba:${id}`,
    sourceId: id,
    date: `2024-04-2${i + 1}`,
    recapUrl: `https://www.nba.com/game/${id}`,
    home: aHome ? A : B,
    away: aHome ? B : A,
    homeScore: (aHome ? a : b).reduce((s, v) => s + v, 0),
    awayScore: (aHome ? b : a).reduce((s, v) => s + v, 0),
    quarters: a.map((v, p) => ({
      period: p + 1,
      home: aHome ? v : b[p]!,
      away: aHome ? b[p]! : v,
    })),
    leaders: [
      {
        teamId: (aHome ? B : A).id,
        points: 'Fixture away scorer 20',
        rebounds: null,
        assists: null,
      },
      {
        teamId: (aHome ? A : B).id,
        points: 'Fixture home scorer 30',
        rebounds: null,
        assists: null,
      },
    ],
  };
});
const margins = plan.map(
  ([a, b]) => a.reduce((s, v) => s + v, 0) - b.reduce((s, v) => s + v, 0),
);
function response(): PlayoffSeriesFilmRoomResponse {
  return {
    season: '2023-24',
    scope: 'playoffs',
    series: {
      id: 'r1-BOS-LAL',
      round: 1,
      conference: null,
      teams: [A, B],
      wins: [4, 0],
      games: games.map((game, i) => ({
        game,
        number: i + 1,
        winner: A,
        after: [i + 1, 0] as [number, number],
      })),
      status: 'decided',
      winner: A,
      feeders: null,
      sourceIdRoundAgrees: true,
      totalPoints: [100 + 105 + 92 + 120, 80 + 101 + 90 + 40],
      overtimeGames: 1,
      homeWins: 2,
      seeds: [2, 7],
    },
    analysis: {
      games: plan.map(([a, b, aHome], i) => {
        let run = 0;
        return {
          gameId: games[i]!.id,
          number: i + 1,
          margin: margins[i]!,
          total: [...a, ...b].reduce((s, v) => s + v, 0),
          homeTeamId: (aHome ? A : B).id,
          winnerId: A.id,
          periods: a.map((v, p) => {
            run += v - b[p]!;
            return {
              period: p + 1,
              points: [v, b[p]!] as [number, number],
              cumulativeMargin: run,
            };
          }),
          halves: {
            first: [a[0]! + a[1]!, b[0]! + b[1]!] as [number, number],
            second: [a[2]! + a[3]!, b[2]! + b[3]!] as [number, number],
            overtime: a.length > 4 ? ([a[4]!, b[4]!] as [number, number]) : null,
          },
          wonFromBehindAfterThree: i === 1,
          clinching: i === 3,
        };
      }),
      periodTotals: [
        { period: 'Q1', points: [95, 80] },
        { period: 'Q2', points: [100, 75] },
        { period: 'Q3', points: [100, 70] },
        { period: 'Q4', points: [110, 76] },
        { period: 'OT', points: [12, 10] },
      ],
      pointsPerGame: [417 / 4, 311 / 4],
      averageMargin: 106 / 4,
      averageTotal: 728 / 4,
      closest: { margin: 2, gameIds: [games[2]!.id] },
      largest: { margin: 80, gameId: games[3]!.id, winnerId: A.id },
      widestPeriod: { period: 'Q4', margin: 34 },
      comebacksAfterThree: 1,
    },
    previous: [null, null],
    next: 'r2-BOS-NYK',
    champion: null,
    seedsPublished: true,
    attribution: gamesFixture.attribution,
    conferenceSource: gamesFixture.attribution,
    provenance: gamesFixture.provenance,
  };
}
function routes(seen: string[] = []) {
  server.use(
    http.get('http://localhost/api/games/series/:id', ({ params }) => {
      seen.push(String(params.id));
      return params.id === 'r1-BOS-LAL'
        ? HttpResponse.json(response())
        : HttpResponse.json(
            { error: { code: 'PLAYOFF_SERIES_NOT_FOUND', message: 'No series.' } },
            { status: 404 },
          );
    }),
  );
}

describe('series film room', () => {
  it('uses a contract-valid fixture', () => {
    expect(
      PlayoffSeriesFilmRoomResponseSchema.safeParse(response()).error?.issues ?? [],
    ).toEqual([]);
  });

  it('shows the series result, opens on the clinching game and moves by keyboard', async () => {
    routes();
    renderApp('/games/series/r1-BOS-LAL');
    expect(
      await screen.findByText(/Boston Celtics won the series 4–0, clinching in Game 4/),
    ).toBeInTheDocument();
    expect(screen.getByText('Seed 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BOS next/ })).toHaveAttribute(
      'href',
      '/games/series/r2-BOS-NYK',
    );
    const tape = screen.getByRole('list', { name: 'Games in the series' });
    const cards = within(tape).getAllByRole('button');
    expect(cards).toHaveLength(4);
    expect(cards[3]).toHaveAttribute('aria-pressed', 'true');
    expect(cards[3]).toHaveAccessibleName(/series clinched/);
    expect(cards[2]).toHaveAccessibleName(/in overtime/);
    // One tab stop: only the selected card is focusable by Tab.
    expect(cards.filter((c) => c.tabIndex === 0)).toEqual([cards[3]]);
    expect(
      screen.getByRole('heading', {
        name: /Game 4: BOS 120 @ LAL 40|Game 4: LAL 40 @ BOS 120/,
      }),
    ).toBeInTheDocument();
    cards[3]!.focus();
    fireEvent.keyDown(cards[3]!, { key: 'Home' });
    await waitFor(() => expect(cards[0]).toHaveAttribute('aria-pressed', 'true'));
    expect(document.activeElement).toBe(cards[0]);
    fireEvent.keyDown(cards[0]!, { key: 'ArrowRight' });
    await waitFor(() => expect(cards[1]).toHaveAttribute('aria-pressed', 'true'));
    // Game 2: BOS trailed by 5 after three quarters and won by 4.
    expect(
      await screen.findByText(/trailed after three quarters and won/),
    ).toBeInTheDocument();
  });

  it('gives exact values for the selected game and the whole series', async () => {
    routes();
    renderApp('/games/series/r1-BOS-LAL?game=3');
    const periods = await screen.findByRole('group', { name: 'Game 3 period scores' });
    // Four quarters and one overtime, running margin ends at the final margin.
    const rows = within(periods).getAllByRole('row');
    expect(rows).toHaveLength(1 + 5);
    expect(rows.at(-1)).toHaveTextContent(/OT\s*12\s*10\s*\+2/);
    const series = screen.getByRole('group', { name: 'Series exact values' });
    expect(within(series).getAllByRole('row')).toHaveLength(1 + 4);
    expect(series).toHaveTextContent('+80');
    expect(screen.getByText('BOS by 80 · G4')).toBeInTheDocument();
    expect(screen.getByText('2 pts · G3')).toBeInTheDocument();
    expect(screen.getByText('Q4: BOS +34')).toBeInTheDocument();
    expect(screen.getByText(/Fixture home scorer 30/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the game page' })).toHaveAttribute(
      'href',
      '/games/nba:0042300103',
    );
  });

  it('rejects malformed links without calling the API and reports a missing series', async () => {
    const seen: string[] = [];
    routes(seen);
    renderApp('/games/series/r9-BOS-LAL');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
    renderApp('/games/series/r1-BOS-LAL?game=8');
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(seen).toEqual([]);
    renderApp('/games/series/r1-AAA-BBB');
    await waitFor(() => expect(seen).toEqual(['r1-AAA-BBB']));
    expect(
      (await screen.findAllByText(/could not|unavailable|failed/i)).length,
    ).toBeGreaterThan(0);
  });
});
