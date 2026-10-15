import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  RecordedPlayerComparisonResponseSchema,
  type RecordedPlayerComparisonResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './ComparisonStudioPage';
import {
  chartSvgExport,
  comparisonLabCsv,
  comparisonStudioCsv,
} from '../comparison-lab/comparison-export';

const data0 = { provenance: leagueFixture.provenance };

const metrics = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'minutesPerGame',
] as const;
const team = (i: number) => ({
  id: `nba:${1610612737 + i}`,
  sourceId: `${1610612737 + i}`,
  abbreviation: `T${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
  name: `Team ${i}`,
});
const directory = {
  season: '2023-24',
  teams: Array.from({ length: 30 }, (_, i) => team(i)),
  players: [
    { playerId: '1', name: 'Fixture Àlpha', teams: [team(0)] },
    { playerId: '2', name: 'Fixture Bravo', teams: [team(1)] },
    { playerId: '3', name: 'Fixture Charlie', teams: [team(2)] },
  ],
  attributions: Array.from({ length: 30 }, () => leagueFixture.attribution),
  provenance: leagueFixture.provenance,
};
const player = (id: string, name: string, base: number) => ({
  playerId: id,
  name,
  teams: ['TAA'],
  gamesPlayed: 70,
  qualified: true,
  exclusion: null,
  values: metrics.map((_, i) => base + i),
  percentiles: metrics.map(() => 80),
  zScores: metrics.map((_, i) => (base > 10 ? 1 + i * 0.1 : -1)),
  shooting: { fieldGoal: 0.5, threePoint: 0.4, freeThrow: null },
});
function comparison(ids: string[]): RecordedPlayerComparisonResponse {
  const names: Record<string, string> = {
    '1': 'Fixture Àlpha',
    '2': 'Fixture Bravo',
    '3': 'Fixture Charlie',
  };
  return {
    season: '2023-24',
    minGames: 20,
    population: 300,
    metrics: [...metrics],
    players: ids.map((id, i) => player(id, names[id]!, i ? 5 : 20)),
    gaps: metrics.map((metric) => ({
      metric,
      leaders: [ids[0]!],
      rawSpread: 15,
      zSpread: 2,
    })),
    statements: [
      {
        kind: 'scope',
        text: `All ${ids.length} players are compared inside one cohort.`,
      },
      {
        kind: 'leader',
        text: 'Fixture Àlpha leads in points per game: 20.0 against 5.0 (Fixture Bravo).',
      },
    ],
    snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
    provenance: leagueFixture.provenance,
  };
}
function routes(seen: string[] = []) {
  server.use(
    http.get('http://localhost/api/recorded/directory', () =>
      HttpResponse.json(directory),
    ),
    http.get(
      'http://localhost/api/shots/directory',
      () => new HttpResponse(null, { status: 503 }),
    ),
    http.get('http://localhost/api/recorded/player-comparison', ({ request }) => {
      const ids = new URL(request.url).searchParams.get('players')!.split(',');
      seen.push(ids.join(','));
      return HttpResponse.json(comparison(ids));
    }),
  );
}

describe('comparison studio', () => {
  it('uses a contract-valid fixture', () => {
    expect(
      RecordedPlayerComparisonResponseSchema.safeParse(comparison(['1', '2'])).success,
    ).toBe(true);
  });

  it('builds the cast by name, reorders and removes players through the URL', async () => {
    const seen: string[] = [];
    routes(seen);
    renderApp('/compare/recorded');
    const finder = await screen.findByLabelText('Add a player');
    fireEvent.change(finder, { target: { value: 'alpha' } });
    fireEvent.click(await screen.findByRole('button', { name: /Fixture Àlpha/ }));
    expect(await screen.findByText(/Add 1 more player to compare/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Add a player'), {
      target: { value: 'bra' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Fixture Bravo/ }));
    await waitFor(() => expect(seen).toContain('1,2'));
    expect(
      await screen.findByText(/All 2 players are compared inside one cohort/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move Fixture Bravo earlier' }));
    await waitFor(() => expect(seen.at(-1)).toBe('2,1'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Àlpha' }));
    expect(await screen.findByText(/Add 1 more player to compare/)).toBeInTheDocument();
  });

  it('shows the gap board, statements and exact values, and switches scale', async () => {
    routes();
    const view = renderApp('/compare/recorded?players=1,2');
    expect(
      await screen.findByRole('img', { name: /Gap board on the standardised scale/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/leads in points per game: 20.0/)).toBeInTheDocument();
    const table = screen.getByRole('group', { name: 'Comparison exact values' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 6 + 1 + 3);
    expect(table).toHaveTextContent('50.0%');
    fireEvent.click(screen.getByRole('button', { name: 'Percentile' }));
    expect(
      await screen.findByRole('img', { name: /Gap board on the percentile scale/ }),
    ).toBeInTheDocument();
    expect(view.container.querySelectorAll('.gapboard__row')).toHaveLength(6);
    expect(
      screen
        .getAllByRole('link', { name: 'Percentile profiles' })
        .map((l) => l.getAttribute('href')),
    ).toContain('/lab/profiles?players=1,2');
  });

  it('rejects malformed comparison links', async () => {
    routes();
    renderApp('/compare/recorded?players=1,1');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});

describe('comparison exports', () => {
  it('writes exact values, percentiles and z-scores with the cohort and source, formula-safe', () => {
    const data = comparison(['1', '2']);
    data.players[0]!.name = '=HYPERLINK("x")';
    const csv = comparisonStudioCsv(data);
    expect(csv).toContain('# Cohort: 300 players with at least 20 games');
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    const header = csv.split('\r\n').find((l) => l.startsWith('"player"'))!;
    expect(header.split(',')).toHaveLength(4 + 6 * 3);
    expect(csv).toContain('"pointsPerGame percentile"');
    // Values are the response's own numbers: 20 points, 80th percentile, z 1.
    expect(csv).toMatch(/"20","80","1"/);
  });

  it('exports the comparison lab table with units and unavailable seasons spelled out', () => {
    const csv = comparisonLabCsv(
      {
        provenance: data0.provenance,
        rows: [
          {
            playerId: '1',
            player: null,
            season: '2023-24',
            stats: null,
            status: 'season-unavailable',
          },
          {
            playerId: '2',
            player: null,
            season: '2022-23',
            stats: null,
            status: 'source-unavailable',
          },
        ],
      },
      [{ key: 'pointsPerGame', label: 'Points', unit: 'per game' }],
    );
    expect(csv).toContain(
      '"Points","per game","Unavailable (season-unavailable)","Unavailable (source-unavailable)"',
    );
    expect(csv).toContain('"NBA player 1 2023-24"');
  });

  it('exports the on-screen gap board as a labelled, standalone SVG', async () => {
    routes();
    const view = renderApp('/compare/recorded?players=1,2');
    await screen.findByRole('img', { name: /Gap board on the standardised scale/ });
    const svg = view.container.querySelector('.gapboard svg') as SVGSVGElement;
    const exported = chartSvgExport(
      svg,
      'Gap board: <script>x</script>',
      'Cohort and source',
    );
    const doc = new DOMParser().parseFromString(exported, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(doc.querySelector('title')?.textContent).toBe(
      'Gap board: <script>x</script>',
    );
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('desc')?.textContent).toBe('Cohort and source');
    expect(doc.querySelectorAll('.gapboard__row')).toHaveLength(6);
    // The page's own chart is untouched.
    expect(svg.querySelector('title, desc')).toBeTruthy();
    expect(svg.parentElement).toBeTruthy();
  });
});
