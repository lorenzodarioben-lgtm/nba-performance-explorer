import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  PlayoffBracketResponseSchema,
  type ArchiveGame,
  type PlayoffBracketResponse,
  type PlayoffSeries,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
import { bracketColumns, playoffRecord, seriesForGame } from './bracket-layout';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './PlayoffBracketPage';

const API = 'http://localhost/api/games/bracket';
// Sixteen synthetic identities: E0–E7 East, W0–W7 West. Not NBA teams or results.
const team = (conf: 'E' | 'W', i: number) => ({
  id: `nba:${conf === 'E' ? 1610612700 + i : 1610612710 + i}`,
  sourceId: `${conf === 'E' ? 1610612700 + i : 1610612710 + i}`,
  abbreviation: `${conf}${String.fromCharCode(65 + i)}X`,
  name: `${conf === 'E' ? 'East' : 'West'} Team ${String.fromCharCode(65 + i)}`,
});
let seq = 0;
function game(
  round: number,
  winner: ReturnType<typeof team>,
  loser: ReturnType<typeof team>,
): ArchiveGame {
  seq++;
  const sourceId = `0042300${round}${seq % 10}${(seq % 7) + 1}`;
  return {
    id: `nba:${sourceId}`,
    sourceId,
    season: '2023-24',
    scope: 'playoffs',
    date: new Date(Date.UTC(2024, 3, 20) + seq * 86_400_000).toISOString().slice(0, 10),
    status: 'final',
    away: loser,
    home: winner,
    awayScore: 98,
    homeScore: 104,
    tipoffUtc: null,
    reportedTime: null,
    venue: null,
    quarters: [1, 2, 3, 4].map((period) => ({
      period,
      away: 24 + (period === 1 ? 2 : 0),
      home: 26,
    })),
    leaders: [
      { teamId: loser.id, points: null, rebounds: null, assists: null },
      { teamId: winner.id, points: null, rebounds: null, assists: null },
    ],
    recapUrl: `https://www.nba.com/game/${sourceId}`,
  };
}
function series(
  round: number,
  a: ReturnType<typeof team>,
  b: ReturnType<typeof team>,
  conference: 'East' | 'West' | null,
  feeders: [string, string] | null,
): PlayoffSeries {
  const [first, second] = [a, b].sort((x, y) =>
    x.abbreviation.localeCompare(y.abbreviation),
  );
  const aFirst = first!.id === a.id;
  const games = Array.from({ length: 4 }, (_, i) => ({
    game: game(round, a, b),
    number: i + 1,
    winner: a,
    after: (aFirst ? [i + 1, 0] : [0, i + 1]) as [number, number],
  }));
  return {
    id: `r${round}-${first!.abbreviation}-${second!.abbreviation}`,
    round,
    conference,
    teams: [first!, second!],
    wins: aFirst ? [4, 0] : [0, 4],
    games,
    status: 'decided',
    winner: a,
    feeders,
    sourceIdRoundAgrees: true,
    totalPoints: aFirst ? [416, 392] : [392, 416],
    overtimeGames: 0,
    homeWins: 4,
  };
}
function bracket(): PlayoffBracketResponse {
  seq = 0;
  const all: PlayoffSeries[] = [];
  const sides = (['E', 'W'] as const).map((c) => {
    const conf = c === 'E' ? 'East' : 'West';
    const t = (i: number) => team(c, i);
    const r1 = [0, 1, 2, 3].map((i) => series(1, t(i), t(7 - i), conf, null));
    const r2 = [0, 1].map((i) =>
      series(
        2,
        t(i),
        t(3 - i),
        conf,
        [r1[i]!.id, r1[3 - i]!.id].sort() as [string, string],
      ),
    );
    const r3 = series(3, t(0), t(1), conf, [r2[0]!.id, r2[1]!.id]);
    all.push(...r1, ...r2, r3);
    return r3;
  });
  all.push(series(4, team('E', 0), team('W', 0), null, [sides[0]!.id, sides[1]!.id]));
  return {
    season: '2023-24',
    scope: 'playoffs',
    series: all,
    complete: true,
    champion: team('E', 0),
    recordedGames: 60,
    issues: [],
    attribution: leagueFixture.attribution,
    conferenceSource: leagueFixture.attribution,
    provenance: { ...leagueFixture.provenance, scope: 'playoffs' },
  };
}

describe('playoff bracket layout', () => {
  it('produces a contract-valid fixture and a feeder-ordered seven-column tree', () => {
    const data = PlayoffBracketResponseSchema.parse(bracket());
    const columns = bracketColumns(data.series);
    expect(columns.map((c) => c.key)).toEqual([
      'west-1',
      'west-2',
      'west-3',
      'finals',
      'east-3',
      'east-2',
      'east-1',
    ]);
    expect(columns.map((c) => c.pairs.flat().length)).toEqual([4, 2, 1, 1, 1, 2, 4]);
    // Each round-two series sits beside the pair of first-round series that fed it.
    const east1 = columns.find((c) => c.key === 'east-1')!.pairs;
    const east2 = columns.find((c) => c.key === 'east-2')!.pairs.flat();
    east2.forEach((s, i) =>
      expect(east1[i]!.map((x) => x.id).sort()).toEqual([...s.feeders!].sort()),
    );
    expect(playoffRecord(data.series, team('E', 0).id)).toEqual({
      wins: 16,
      losses: 0,
    });
    const someGame = data.series[3]!.games[2]!.game.id;
    expect(seriesForGame(data.series, someGame)?.id).toBe(data.series[3]!.id);
  });
});

describe('playoff bracket page', () => {
  it('shows the champion and opens a series story from the bracket and the URL', async () => {
    server.use(http.get(API, () => HttpResponse.json(bracket())));
    renderApp('/games/bracket');
    expect(
      await screen.findByText('2024 NBA champion · from recorded games'),
    ).toBeInTheDocument();
    expect(screen.getByText('Playoff record').nextElementSibling).toHaveTextContent(
      '16–0',
    );
    const finals = screen.getByRole('group', { name: 'NBA Finals' });
    const card = within(finals).getByRole('button', { name: /East Team A won in 4/ });
    fireEvent.click(card);
    await waitFor(() => expect(card).toHaveAttribute('aria-pressed', 'true'));
    expect(
      await screen.findByRole('heading', { name: 'EAX vs WAX · NBA Finals' }),
    ).toBeInTheDocument();
    const games = screen.getAllByRole('link', { name: /^Game \d/ });
    expect(games).toHaveLength(4);
    expect(games[0]!.getAttribute('href')).toMatch(/^\/games\/nba:00423/);
    fireEvent.click(screen.getByRole('button', { name: 'Close series' }));
    await waitFor(() => expect(card).toHaveAttribute('aria-pressed', 'false'));
  });

  it('resolves a linked game to its series', async () => {
    const data = bracket();
    const target = data.series[0]!;
    server.use(http.get(API, () => HttpResponse.json(data)));
    renderApp(`/games/bracket?game=${target.games[1]!.game.id}`);
    expect(
      await screen.findByRole('heading', {
        name: `${target.teams[0].abbreviation} vs ${target.teams[1].abbreviation} · First round`,
      }),
    ).toBeInTheDocument();
  });

  it('lists series by round with the source issues when the bracket is incomplete', async () => {
    const data = bracket();
    const partial = {
      ...data,
      series: data.series.filter((s) => s.round !== 4),
      complete: false,
      champion: null,
      issues: [
        'The recorded games do not form a complete four-round bracket (series per round: 8/4/2/0).',
      ],
    };
    server.use(http.get(API, () => HttpResponse.json(partial)));
    renderApp('/games/bracket');
    expect(await screen.findByText('Partial bracket')).toBeInTheDocument();
    expect(screen.getByText(/series per round: 8\/4\/2\/0/)).toBeInTheDocument();
    expect(screen.queryByText(/2024 NBA champion/)).toBeNull();
    expect(screen.queryByRole('group', { name: 'NBA Finals' })).toBeNull();
  });

  it('rejects unsupported view parameters', async () => {
    renderApp('/games/bracket?series=round-one');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid bracket view');
  });
});

describe('series context on game pages', () => {
  it('names the round, game number and series score, and links every game', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { render } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router');
    const { SeriesContext } = await import('./SeriesContext');
    const data = bracket();
    const finals = data.series.find((s) => s.round === 4)!;
    server.use(http.get(API, () => HttpResponse.json(data)));
    const view = (gameId: string) =>
      render(
        <MemoryRouter>
          <QueryClientProvider client={new QueryClient()}>
            <SeriesContext gameId={gameId} />
          </QueryClientProvider>
        </MemoryRouter>,
      );
    const second = view(finals.games[1]!.game.id);
    const region = await screen.findByRole('region', {
      name: 'This game in its series',
    });
    expect(region).toHaveTextContent('NBA Finals · Game 2');
    expect(region).toHaveTextContent('EAX leads 2–0');
    expect(within(region).getAllByRole('link', { name: /^Game \d/ })).toHaveLength(4);
    expect(within(region).getByRole('link', { name: /^Game 2/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(region).getByRole('link', { name: 'Open the series' }),
    ).toHaveAttribute('href', `/games/bracket?series=${finals.id}`);
    second.unmount();
    view(finals.games[3]!.game.id);
    expect(await screen.findByText('EAX wins the series 4–0')).toBeInTheDocument();
  });
});
