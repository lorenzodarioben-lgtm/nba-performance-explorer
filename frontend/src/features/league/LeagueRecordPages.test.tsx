import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueRecordsResponseSchema,
  LeagueTeamRankingsResponseSchema,
  type LeagueRecordsResponse,
  type LeagueTeamRankingsResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subjects before assertion timers; the app still renders its actual lazy routes.
import './LeagueRecordBookPage';
import './LeagueTeamRankingsPage';

const provenance = {
  source: 'nba-stats' as const,
  mode: 'committed-snapshot' as const,
  servedAt: '2026-10-16T00:00:00.000Z',
  retrievedAt: '2026-10-15T20:00:00.000Z',
  sourceUpdatedAt: null,
  coverage: 'Within this archive only. Not all-time NBA records.',
  warnings: [],
};
const team = (abbreviation: string, n: number) => ({
  id: `nba:${1610612700 + n}`,
  abbreviation,
  name: `Fixture ${abbreviation}`,
});
const entry = (
  rank: number,
  value: number,
  date: string,
  kind?: 'first' | 'new' | 'tie',
) => ({
  rank,
  value,
  playerId: String(100 + rank),
  name: `Scorer ${rank}`,
  season: '2005-06',
  teams: [team('LAL', 47)],
  game: { id: '0020500591', date, opponent: team('TOR', 61), home: true, won: true },
  gamesPlayed: null,
  ...(kind ? { kind } : {}),
});
function recordsFor(q: Record<string, string>): LeagueRecordsResponse {
  return {
    query: {
      scope: (q.scope as 'playoffs') ?? 'regular-season',
      kind: (q.kind as 'season') ?? 'game',
      category: (q.category as 'points') ?? 'points',
      mode: (q.mode as 'per-game') ?? 'totals',
    },
    definition: 'Most points by one player in a regular-season game.',
    coverage: {
      included: ['1987-88', '2005-06'],
      excluded: [
        {
          season: '1992-93',
          reason: '134 of 1107 box scores do not add up to the team totals.',
        },
      ],
    },
    records: [
      entry(1, 81, '2006-01-22'),
      entry(2, 73, '2024-01-26'),
      entry(2, 73, '2024-02-01'),
    ],
    progression: [
      entry(1, 59, '1988-04-03', 'first'),
      entry(1, 81, '2006-01-22', 'new'),
      entry(1, 81, '2026-01-01', 'tie'),
    ] as LeagueRecordsResponse['progression'],
    provenance,
  };
}
const rankings = (metric: string): LeagueTeamRankingsResponse => ({
  query: {
    season: '2025-26',
    scope: 'regular-season',
    metric: metric as 'defensiveRating',
  },
  definition: 'NBA.com: points allowed per 100 possessions.',
  direction: 'lower-is-better',
  rows: [
    {
      rank: 1,
      team: team('OKC', 60),
      gamesPlayed: 82,
      wins: 64,
      losses: 18,
      value: 104.2,
    },
    {
      rank: 2,
      team: team('BOS', 38),
      gamesPlayed: 82,
      wins: 56,
      losses: 26,
      value: 106.1,
    },
  ],
  unavailable: null,
  provenance,
});

describe('record book and team rankings', () => {
  it('uses contract-valid fixtures', () => {
    expect(
      LeagueRecordsResponseSchema.safeParse(recordsFor({})).error?.issues ?? [],
    ).toEqual([]);
    expect(
      LeagueTeamRankingsResponseSchema.safeParse(rankings('defensiveRating')).error
        ?.issues ?? [],
    ).toEqual([]);
  });

  it('shows ties, links each game and lists excluded seasons', async () => {
    const seen: string[] = [];
    server.use(
      http.get('http://localhost/api/league/records', ({ request }) => {
        const p = Object.fromEntries(new URL(request.url).searchParams);
        seen.push(new URL(request.url).search);
        return HttpResponse.json(recordsFor(p));
      }),
    );
    renderApp('/history/record-book');
    const table = await screen.findByRole('group', { name: 'Records table' });
    expect(within(table).getAllByText('T-2')).toHaveLength(2);
    expect(
      within(table).getAllByRole('link', { name: /2006-01-22 vs TOR \(W\)/ })[0],
    ).toHaveAttribute('href', '/games/nba:0020500591');
    const progression = screen.getByRole('group', { name: 'Record progression' });
    expect(within(progression).getByText('Tied')).toBeInTheDocument();
    expect(screen.getByText(/1992–93: 134 of 1107 box scores/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Record'), { target: { value: 'season' } });
    await waitFor(() => expect(seen.at(-1)).toBe('?kind=season'));
    expect(screen.getByLabelText('Measure')).toBeInTheDocument();
  });

  it('ranks teams with the measure’s direction stated', async () => {
    server.use(
      http.get('http://localhost/api/league/seasons', () =>
        HttpResponse.json({ seasons: [], provenance }),
      ),
      http.get('http://localhost/api/league/team-rankings', ({ request }) =>
        HttpResponse.json(
          rankings(new URL(request.url).searchParams.get('metric') ?? 'netRating'),
        ),
      ),
    );
    renderApp('/leaders/teams?season=2025-26&metric=defensiveRating');
    expect(
      await screen.findByText(/Lower is better: rank 1 is the lowest/),
    ).toBeInTheDocument();
    const table = screen.getByRole('group', { name: 'Team rankings table' });
    expect(within(table).getByRole('link', { name: 'Fixture OKC' })).toHaveAttribute(
      'href',
      '/teams/nba:1610612760?season=2025-26',
    );
  });

  it('rejects malformed record links before fetching', async () => {
    let calls = 0;
    server.use(
      http.get(
        'http://localhost/api/league/records',
        () => (calls++, HttpResponse.json(recordsFor({}))),
      ),
    );
    renderApp('/history/record-book?category=dunks');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
    expect(calls).toBe(0);
  });
});
