import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchResponseSchema,
  type WorkbenchResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
import { readWorkbenchState, workbenchCsv } from './workbench-config';
import { trendDepartures } from './trend-departures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './WorkbenchPage';

const API = 'http://localhost/api/recorded/workbench';
const row = (
  id: string,
  label: string,
  x: number,
  rank: number,
  y: number | null = null,
) => ({
  id,
  label,
  teams: ['AAA'],
  href: `/players/${id}/archive`,
  sample: 60,
  x,
  y,
  rank,
  percentile: 100 - rank * 20,
  zX: 2 - rank,
  zY: y === null ? null : 0.5,
});
function response(overrides: Partial<WorkbenchResponse> = {}): WorkbenchResponse {
  return {
    season: '2023-24',
    entity: 'players',
    view: 'rank',
    order: 'desc',
    minGames: 20,
    cohort: 'Recorded players with 20+ games, 2023-24 regular season',
    metric: {
      key: 'pointsPerGame',
      label: 'Points per game',
      unit: 'per-game',
      definition: 'Published points per game.',
    },
    y: null,
    rows: [
      row('1', 'Fixture One', 30, 1),
      row('2', 'Fixture Two', 20, 2),
      row('3', 'Fixture Three', 10, 3),
    ],
    excluded: [{ reason: 'Fewer than 20 games behind the value', count: 4 }],
    summary: { n: 3, mean: 20, sd: 8.16, min: 10, q1: 15, median: 20, q3: 25, max: 30 },
    ySummary: null,
    bins: [
      { from: 10, to: 20, count: 1 },
      { from: 20, to: 30, count: 2 },
    ],
    relationship: null,
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    provenance: { ...leagueFixture.provenance },
    ...overrides,
  };
}
const directory = () =>
  http.get(
    'http://localhost/api/recorded/directory',
    () => new HttpResponse(null, { status: 503 }),
  );

describe('research workbench', () => {
  it('uses a contract-valid fixture and keeps the front-end pick out of the API query', () => {
    expect(WorkbenchResponseSchema.safeParse(response()).success).toBe(true);
    const state = readWorkbenchState(
      new URLSearchParams('metric=reboundsPerGame&pick=203999'),
    );
    expect(state.valid).toBe(true);
    expect(state.api.toString()).toBe('metric=reboundsPerGame');
    expect(state.pick).toBe('203999');
    expect(readWorkbenchState(new URLSearchParams('pick=<script>')).valid).toBe(false);
    expect(
      readWorkbenchState(new URLSearchParams('entity=teams&metric=pointsPerGame'))
        .valid,
    ).toBe(false);
  });

  it('states the cohort and exclusions, and links a picked row to its research room', async () => {
    const requested: string[] = [];
    server.use(
      directory(),
      http.get(API, ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json(response());
      }),
    );
    renderApp('/lab/workbench');
    expect(
      await screen.findByText(/Recorded players with 20\+ games/),
    ).toBeInTheDocument();
    expect(requested[0]).toBe('');
    expect(
      screen.getByText(/Fewer than 20 games behind the value/),
    ).toBeInTheDocument();
    const table = screen.getByRole('group', { name: 'Workbench exact values' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    fireEvent.click(within(table).getByRole('button', { name: 'Fixture Two' }));
    const card = await screen.findByRole('complementary', { name: 'Selected' });
    await waitFor(() => expect(card).toHaveTextContent('2 of 3'));
    expect(within(card).getByRole('link', { name: 'Recorded season' })).toHaveAttribute(
      'href',
      '/players/2/archive',
    );
    // The pick is a front-end selection: it never reaches the API.
    expect(requested.every((search) => !search.includes('pick'))).toBe(true);
  });

  it('filters the table to a chosen histogram bin and restores every row', async () => {
    server.use(
      directory(),
      http.get(API, () => HttpResponse.json(response({ view: 'distribution' }))),
    );
    renderApp('/lab/workbench?view=distribution');
    const chart = await screen.findByRole('group', {
      name: /Distribution of Points per game/,
    });
    fireEvent.keyDown(chart, { key: 'End' });
    fireEvent.keyDown(chart, { key: 'Enter' });
    expect(await screen.findByText('2 of 3 shown')).toBeInTheDocument();
    const table = screen.getByRole('group', { name: 'Workbench exact values' });
    expect(within(table).queryByRole('button', { name: 'Fixture Three' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show every row' }));
    expect(await screen.findByText('3 rows')).toBeInTheDocument();
    expect(screen.getByText(/Q1 15.0/)).toBeInTheDocument();
  });

  it('asks a relationship question with a default second metric and draws the fit', async () => {
    const requested: string[] = [];
    server.use(
      directory(),
      http.get(API, ({ request }) => {
        const search = new URL(request.url).search;
        requested.push(search);
        return HttpResponse.json(
          search.includes('relationship')
            ? response({
                view: 'relationship',
                y: {
                  key: 'assistsPerGame',
                  label: 'Assists per game',
                  unit: 'per-game',
                  definition: 'Published assists per game.',
                },
                rows: [
                  row('1', 'Fixture One', 30, 1, 8),
                  row('2', 'Fixture Two', 20, 2, 5),
                  row('3', 'Fixture Three', 10, 3, 2),
                ],
                ySummary: {
                  n: 3,
                  mean: 5,
                  sd: 2.45,
                  min: 2,
                  q1: 3.5,
                  median: 5,
                  q3: 6.5,
                  max: 8,
                },
                relationship: { n: 3, pearson: 1, slope: 0.3, intercept: -1 },
              })
            : response(),
        );
      }),
    );
    const view = renderApp('/lab/workbench');
    fireEvent.click(await screen.findByRole('button', { name: 'Relationship' }));
    await waitFor(() =>
      expect(requested.at(-1)).toBe('?view=relationship&y=assistsPerGame'),
    );
    expect(await screen.findByText(/r = 1.00, n = 3/)).toBeInTheDocument();
    expect(view.container.querySelector('.scatter__fit')).not.toBeNull();
    expect(screen.getByLabelText('Up (y)')).toHaveValue('assistsPerGame');
  });

  it('switches to teams with a team metric and rejects unsupported questions', async () => {
    const requested: string[] = [];
    server.use(
      directory(),
      http.get(API, ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json(response());
      }),
    );
    renderApp('/lab/workbench');
    fireEvent.click(await screen.findByRole('button', { name: 'Teams' }));
    await waitFor(() =>
      expect(requested.at(-1)).toBe('?entity=teams&metric=winPercentage'),
    );
    expect(screen.getByLabelText('Conference')).toBeInTheDocument();
  });

  it('narrows the cohort to a source-listed position family and explains it', async () => {
    const requested: string[] = [];
    server.use(
      directory(),
      http.get(API, ({ request }) => {
        const search = new URL(request.url).search;
        requested.push(search);
        return HttpResponse.json(
          search.includes('position=C')
            ? response({
                cohort:
                  'Recorded centers (listed C or F/C) with 20+ games, 2023-24 regular season',
                excluded: [
                  { reason: 'Fewer than 20 games behind the value', count: 2 },
                  { reason: 'No roster position listed on the team page', count: 22 },
                ],
              })
            : response(),
        );
      }),
    );
    renderApp('/lab/workbench');
    fireEvent.change(await screen.findByLabelText('Listed position'), {
      target: { value: 'C' },
    });
    await waitFor(() => expect(requested.at(-1)).toBe('?position=C'));
    expect(
      await screen.findByText(/Recorded centers \(listed C or F\/C\)/),
    ).toHaveTextContent('a hybrid label (G/F, F/C) counts for both families');
    expect(screen.getByText(/No roster position listed/)).toHaveTextContent('22');
    // Teams have no position: the control is only offered for players.
    expect(
      readWorkbenchState(
        new URLSearchParams('entity=teams&metric=winPercentage&position=G'),
      ).valid,
    ).toBe(false);
  });

  it('shows an alert for an unsupported URL without calling the API', async () => {
    let calls = 0;
    server.use(
      directory(),
      http.get(API, () => {
        calls++;
        return HttpResponse.json(response());
      }),
    );
    renderApp('/lab/workbench?view=relationship');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
    expect(calls).toBe(0);
  });

  it('exports a spreadsheet-safe CSV with the cohort and definitions', () => {
    const csv = workbenchCsv(
      response({ rows: [{ ...row('1', '=HYPERLINK("x")', 30, 1), teams: ['AAA'] }] }),
    );
    expect(csv).toContain('# Cohort: Recorded players with 20+ games');
    expect(csv).toContain('# Points per game: Published points per game.');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('Fewer than 20 games behind the value (4)');
  });
  it('lists who sits furthest above and below the fit line, and picks them', async () => {
    // Line y = 1 + 0.2x predicts 3, 5, 7, 9; residuals −1, +4, −2, −1 (SD √5.5).
    const rows = [
      row('1', 'Fixture One', 10, 4, 2),
      row('2', 'Fixture Two', 20, 3, 9),
      row('3', 'Fixture Three', 30, 2, 5),
      row('4', 'Fixture Four', 40, 1, 8),
    ];
    const departures = trendDepartures(rows, 0.2, 1)!;
    expect(departures.sd).toBeCloseTo(Math.sqrt(5.5), 12);
    expect(departures.above.map((d) => d.row.id)).toEqual(['2']);
    expect(departures.above[0]!.standardised).toBeCloseTo(4 / Math.sqrt(5.5), 12);
    // Furthest first; equal residuals in name order.
    expect(departures.below.map((d) => d.row.id)).toEqual(['3', '1', '4']);
    // A perfect line has nothing to list.
    expect(
      trendDepartures(
        [row('1', 'A', 1, 1, 2), row('2', 'B', 2, 2, 3), row('3', 'C', 3, 3, 4)],
        1,
        1,
      ),
    ).toBeNull();
    server.use(
      directory(),
      http.get(API, () =>
        HttpResponse.json(
          response({
            view: 'relationship',
            y: {
              key: 'fieldGoalPercentage',
              label: 'Field-goal %',
              unit: 'percent',
              definition: 'Published FG%.',
            },
            rows: rows.map((r) => ({ ...r, y: r.y! / 100 })),
            ySummary: {
              n: 4,
              mean: 0.06,
              sd: 0.03,
              min: 0.02,
              q1: 0.04,
              median: 0.065,
              q3: 0.08,
              max: 0.09,
            },
            relationship: { n: 4, pearson: 0.3, slope: 0.002, intercept: 0.01 },
          }),
        ),
      ),
    );
    renderApp('/lab/workbench?view=relationship&y=fieldGoalPercentage');
    const section = await screen.findByRole('region', {
      name: 'Furthest from the fit line',
    });
    const above = within(section).getByRole('button', { name: /Fixture Two/ });
    // Percentages are measured in percentage points.
    expect(above).toHaveTextContent('+4.0 pts +1.7 SD');
    fireEvent.click(above);
    await waitFor(() => expect(above).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('complementary', { name: 'Selected' })).toHaveTextContent(
      'Fixture Two',
    );
  });
});
