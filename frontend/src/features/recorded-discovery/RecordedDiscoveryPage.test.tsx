import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  type RecordedDiscoveryResponse,
  type RecordedCalendarResponse,
  RecordedDirectorySchema,
} from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedDiscoveryPage';
const credits = Array.from({ length: 30 }, (_, i) => ({
  ...leagueFixture.attribution,
  revision: 1234 + i,
  url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
}));
const dist = {
  sample: 3,
  min: 1,
  max: 3,
  mean: 2,
  standardDeviation: 1,
  q25: 1.5,
  median: 2,
  q75: 2.5,
  bins: [{ from: 1, to: 3, count: 3 }],
};
const target = {
  playerId: '2544',
  name: 'Fixture target',
  gamesPlayed: 40,
  x: 10,
  y: 8,
  zX: 0,
  zY: 0,
};
const data: RecordedDiscoveryResponse = {
  season: '2023-24',
  scope: 'regular-season',
  mode: 'neighbors',
  x: 'pointsPerGame',
  y: 'reboundsPerGame',
  minGames: 20,
  maxX: 15,
  minY: 8,
  limit: 20,
  target: '2544',
  targetAvailable: true,
  targetRow: target,
  rows: [
    {
      playerId: '201939',
      name: 'Fixture peer',
      gamesPlayed: 40,
      x: 11,
      y: 9,
      zX: 1,
      zY: 1,
      rank: 1,
      distance: 1.414214,
      xSquaredDifference: 1,
      ySquaredDifference: 1,
    },
  ],
  totalMatches: 2,
  eligiblePool: [
    { playerId: '2544', name: 'Fixture target' },
    { playerId: '201939', name: 'Fixture peer' },
    { playerId: '203076', name: 'Fixture third' },
  ],
  xDistribution: dist,
  yDistribution: dist,
  sourceRows: 4,
  unknownScopeRows: 1,
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  attributions: credits,
  provenance: leagueFixture.provenance,
};
const calendar: RecordedCalendarResponse = {
  season: '2023-24',
  day: '02-29',
  team: null,
  games: [
    {
      id: 'nba:0022300001',
      date: '2024-02-29',
      home: homeTeam,
      away: awayTeam,
      homeScore: 110,
      awayScore: 100,
      recapUrl: 'https://www.nba.com/game/0022300001',
      sources: [credits[0]!, credits[1]!],
    },
  ],
  reconciledGames: 1219,
  quarantinedGameIds: ['nba:0022300011'],
  snapshotCreatedAt: data.snapshotCreatedAt,
  attributions: credits,
  provenance: leagueFixture.provenance,
};
const directory: ReturnType<typeof RecordedDirectorySchema.parse> = {
  season: '2023-24',
  teams: leagueFixture.standings.map((r) => r.team),
  players: [{ playerId: '2544', name: 'Fixture target', teams: [homeTeam] }],
  attributions: credits,
  provenance: leagueFixture.provenance,
};
describe('recorded cohort discovery and calendar UI', () => {
  it('shows raw/similarity evidence and resolves random targets only from the loaded eligible pool', async () => {
    server.use(
      http.get('http://localhost/api/recorded/discovery', ({ request }) => {
        const id = new URL(request.url).searchParams.get('target') ?? '2544',
          person = data.eligiblePool.find((p) => p.playerId === id)!;
        return HttpResponse.json({
          ...data,
          target: id,
          targetRow: { ...target, ...person },
        });
      }),
    );
    renderApp('/discover/recorded?target=2544');
    await screen.findByRole('group', { name: 'Recorded discovery evidence' });
    expect(screen.getByText('1.414214')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exact cohort evidence' })).toHaveAttribute(
      'href',
      expect.stringContaining('target=201939'),
    );
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    fireEvent.click(
      screen.getByRole('button', { name: 'Random qualifying recorded target' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Recorded discovery target')).toHaveValue('203076'),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable recorded discovery URL') as HTMLInputElement)
        .value,
    ).toContain('target=203076');
  });
  it('runs the explicit category preset and keeps malformed threshold inputs editable', async () => {
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/recorded/discovery', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({
          ...data,
          mode: new URL(request.url).searchParams.get('mode') ?? 'neighbors',
        });
      }),
    );
    renderApp('/discover/recorded');
    await screen.findByRole('group', { name: 'Recorded discovery evidence' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Query PTS≤15 and REB≥8 with GP≥40' }),
    );
    await waitFor(() => expect(requests.at(-1)).toContain('mode=thresholds'));
    expect(requests.at(-1)).toContain('minGames=40');
    expect(requests.at(-1)).toContain('maxX=15');
    fireEvent.change(screen.getByLabelText('Maximum X threshold'), {
      target: { value: '-1' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.getByLabelText('Minimum Y threshold')).toBeInTheDocument();
  });
  it('renders only source-agreed calendar finals, freezes dates in saved links and supports leap-day recovery', async () => {
    server.use(
      http.get('http://localhost/api/recorded/directory', () =>
        HttpResponse.json(directory),
      ),
      http.get('http://localhost/api/recorded/calendar', () =>
        HttpResponse.json(calendar),
      ),
    );
    renderApp('/history/calendar?day=02-29');
    await screen.findByRole('group', { name: 'Recorded calendar game results' });
    await screen.findByRole('option', { name: 'Los Angeles Lakers' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('2024-02-29')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'nba:0022300001' })).toHaveAttribute(
      'href',
      calendar.games[0]!.recapUrl,
    );
    fireEvent.change(screen.getByLabelText('Calendar month and day (MM-DD)'), {
      target: { value: '02-30' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    fireEvent.change(screen.getByLabelText('Calendar month and day (MM-DD)'), {
      target: { value: '02-29' },
    });
    await screen.findByRole('group', { name: 'Recorded calendar game results' });
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable calendar URL') as HTMLInputElement).value,
    ).toContain('day=02-29');
  });
  it('rejects repeated query state before reads and exposes genuine source failure', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/recorded/discovery', read));
    const view = renderApp('/discover/recorded?target=2544&target=201939');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp('/discover/recorded');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
