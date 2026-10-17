import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  CareerResearchResponseSchema,
  CoverageResponseSchema,
  type CoverageResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './CoveragePage';

const dataset = (
  id: CoverageResponse['datasets'][number]['id'],
  season: string,
  scope: 'regular-season' | 'playoffs' | 'season-tables',
  completeness: 'complete-scope' | 'partial-scope',
  counts: [string, number][],
): CoverageResponse['datasets'][number] => ({
  id,
  title: `Fixture ${id}`,
  season,
  scope,
  completeness,
  completenessNote: `Fixture note for ${id}.`,
  storage: 'committed-with-app',
  source: {
    name: `Fixture source ${id}`,
    url: 'https://example.org/source',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    version: null,
  },
  retrievedFrom: '2026-10-13T10:00:00.000Z',
  retrievedTo: '2026-10-14T10:00:00.000Z',
  sourceUpdatedAt: null,
  counts: counts.map(([label, value]) => ({ label, value })),
  fields: [{ field: 'fg', label: 'Field-goal %', available: 3, total: 4, note: null }],
  unavailable: ['Fixture missing field'],
  tools: [{ label: 'Fixture tool', to: '/lab/workbench' }],
});
const coverage: CoverageResponse = {
  generatedAt: '2026-10-16T00:00:00.000Z',
  datasets: [
    dataset('recorded-2023-24', '2023-24', 'regular-season', 'partial-scope', [
      ['Teams', 30],
      ['Games agreed by both teams', 1219],
      ['Regular-season player rows', 639],
    ]),
    dataset('playoffs-2024', '2023-24', 'playoffs', 'complete-scope', [['Games', 82]]),
    dataset('shots-2018', '2017-18', 'playoffs', 'partial-scope', [
      ['Field-goal attempts', 13470],
    ]),
  ],
  liveSources: [
    {
      id: 'nba-stats',
      name: 'NBA.com Stats',
      use: 'Fixture use.',
      mode: 'on-request',
      note: 'Fixture note.',
    },
  ],
};
const metrics = {
  trueShooting: null,
  effectiveFieldGoal: null,
  assistTurnover: null,
  pointsPer36: null,
  fieldGoalPercentage: 0.5,
  threePointPercentage: null,
  freeThrowPercentage: 0.7,
};
const season = (s: string, threes: number | null, turnovers: number | null) => ({
  totals: {
    playerId: '76003',
    season: s,
    gamesPlayed: 82,
    minutes: 3000,
    points: 2000,
    rebounds: 1000,
    assists: 300,
    turnovers,
    fieldGoalsMade: 800,
    fieldGoalsAttempted: 1600,
    threesMade: threes,
    threesAttempted: threes === null ? null : threes * 3,
    freeThrowsMade: 400,
    freeThrowsAttempted: 600,
  },
  metrics,
  pointsPerGame: 24.4,
  reboundsPerGame: 12.2,
  assistsPerGame: 3.7,
});
const career = {
  milestones: [],
  player: { id: '76003', fullName: 'Fixture veteran' },
  status: 'available',
  seasons: [
    season('1975-76', null, null),
    season('1978-79', null, 200),
    season('1980-81', 1, 210),
  ],
  aggregate: {
    gamesPlayed: 246,
    minutes: 9000,
    points: 6000,
    rebounds: 3000,
    assists: 900,
    turnovers: null,
    fieldGoalsMade: 2400,
    fieldGoalsAttempted: 4800,
    threesMade: null,
    threesAttempted: null,
    freeThrowsMade: 1200,
    freeThrowsAttempted: 1800,
    seasonsReported: 3,
    metrics,
  },
  peak: {
    metric: 'pointsPerGame',
    minGames: 20,
    qualifiedSeasons: 3,
    excludedSeasons: 0,
    value: 24.4,
    seasons: ['1975-76'],
  },
  provenance: {
    source: 'fixture',
    servedAt: '2026-10-13T16:00:00.000Z',
    retrievedAt: '2026-10-13T15:00:00.000Z',
    asOf: null,
    isLive: false,
    scope: 'regular-season',
    coverage: 'Synthetic rows.',
    warnings: ['DEMO FIXTURES'],
  },
};

describe('data coverage explorer', () => {
  it('uses contract-valid fixtures', () => {
    expect(CoverageResponseSchema.safeParse(coverage).error?.issues ?? []).toEqual([]);
    expect(CareerResearchResponseSchema.safeParse(career).error?.issues ?? []).toEqual(
      [],
    );
  });

  it('places each dataset in its season and column, with the count that answers the column', async () => {
    server.use(
      http.get('http://localhost/api/coverage', () => HttpResponse.json(coverage)),
    );
    renderApp('/explore/coverage');
    const grid = await screen.findByRole('group', { name: 'Coverage by season' });
    const rows = within(grid).getAllByRole('row');
    const row = (label: RegExp) => rows.find((r) => label.test(r.textContent ?? ''))!;
    expect(row(/2023–24\s*Regular season/)).toHaveTextContent(
      '1,219 games agreed by both teams',
    );
    expect(row(/2023–24\s*Regular season/)).toHaveTextContent(
      '639 regular-season player rows',
    );
    expect(row(/2023–24\s*Playoffs/)).toHaveTextContent('Complete82 games');
    expect(row(/2017–18\s*Playoffs/)).toHaveTextContent(
      'Partial13,470 field-goal attempts',
    );
    expect(row(/Any other season/)).toHaveTextContent('NBA.com');
    // Dataset cards: provenance, counts and field availability.
    const card = screen.getByRole('article', { name: 'Fixture recorded-2023-24' });
    expect(card).toHaveTextContent('2026-10-13 to 2026-10-14');
    expect(card).toHaveTextContent('Partial scope');
    expect(
      within(card).getByRole('group', { name: /field availability/ }),
    ).toHaveTextContent('3 of 475%');
    expect(screen.getByText('on request')).toBeInTheDocument();
  });

  it('measures a player’s season-by-season fields from the career rows', async () => {
    server.use(
      http.get('http://localhost/api/coverage', () => HttpResponse.json(coverage)),
      http.get('http://localhost/api/players/76003/career', () =>
        HttpResponse.json(career),
      ),
    );
    renderApp('/explore/coverage?player=76003');
    expect(
      await screen.findByText(
        /TOV missing in 1 season \(first reported 1978-79\); 3PA missing in 2 seasons \(first reported 1980-81\)/,
      ),
    ).toBeInTheDocument();
    const table = screen.getByRole('group', {
      name: 'Fixture veteran field coverage by season',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 3);
    // One missing TOV (1975-76) and two missing 3PA (1975-76, 1978-79).
    expect(within(table).getAllByText('—')).toHaveLength(1 + 2);
  });

  it('rejects malformed player links and is reachable from unavailable states', async () => {
    server.use(
      http.get(
        'http://localhost/api/coverage',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/explore/coverage?player=abc');
    expect(
      await screen.findByText('That player link is not supported.'),
    ).toBeInTheDocument();
    // The shared unavailable notice links here.
    expect(
      await screen.findByRole('link', { name: 'see what each source covers' }),
    ).toHaveAttribute('href', '/explore/coverage');
  });
});
