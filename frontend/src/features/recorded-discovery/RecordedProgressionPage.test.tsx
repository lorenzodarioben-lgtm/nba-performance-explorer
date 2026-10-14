import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { type RecordedProgressionResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
const credits = Array.from({ length: 30 }, (_, i) => ({
  ...leagueFixture.attribution,
  revision: 1234 + i,
  url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
}));
const body: RecordedProgressionResponse = {
  season: '2023-24',
  metric: 'combinedPoints',
  team: null,
  from: '2024-02-01',
  to: '2024-02-03',
  minDailyGames: 1,
  matchingGames: 2,
  series: [
    { date: '2024-02-01', games: 1, meanValue: 200, highValue: 200 },
    { date: '2024-02-02', games: 0, meanValue: null, highValue: null },
    { date: '2024-02-03', games: 1, meanValue: 220, highValue: 220 },
  ],
  progression: [
    {
      date: '2024-02-01',
      previousHigh: null,
      value: 200,
      kind: 'new-high',
      games: [
        {
          id: 'nba:0022300001',
          date: '2024-02-01',
          home: homeTeam,
          away: awayTeam,
          homeScore: 110,
          awayScore: 90,
          recapUrl: 'https://www.nba.com/game/0022300001',
          sources: [credits[0]!, credits[1]!],
        },
      ],
    },
  ],
  reconciledGames: 1219,
  quarantinedGameIds: ['nba:0022300011'],
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  attributions: credits,
  provenance: leagueFixture.provenance,
};
function directory() {
  server.use(
    http.get('http://localhost/api/recorded/directory', () =>
      HttpResponse.json({
        season: '2023-24',
        teams: leagueFixture.standings.map((r) => r.team),
        players: [],
        attributions: credits,
        provenance: leagueFixture.provenance,
      }),
    ),
  );
}
describe('observed record progression UI', () => {
  it('keeps actual daily means/table parity, disconnects missing dates and saves resolved windows', async () => {
    directory();
    server.use(
      http.get('http://localhost/api/recorded/progression', () =>
        HttpResponse.json(body),
      ),
    );
    const view = renderApp('/history/progression?metric=combinedPoints');
    await screen.findByRole('group', { name: 'Daily observed metric values' });
    // One mark per recorded daily mean, and the missing date splits the line into two
    // disconnected segments (never bridged).
    const chart = view.container.querySelector('[data-chart="progression-mean"]')!;
    expect(chart.querySelectorAll('.lchart__mark')).toHaveLength(2);
    expect(chart.querySelectorAll('[data-series] path[fill="none"]')).toHaveLength(2);
    expect(screen.getByText('No earlier window record')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'nba:0022300001' })).toHaveAttribute(
      'href',
      body.progression[0]!.games[0]!.recapUrl,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable progression URL') as HTMLInputElement).value,
    ).toContain('from=2024-02-01');
  });
  it('resets unsafe windows through editable controls and surfaces source-disabled state', async () => {
    directory();
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/recorded/progression', read));
    renderApp('/history/progression?minDailyGames=16');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Minimum daily games for means'), {
      target: { value: '2' },
    });
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.getByLabelText('Progression from date')).toBeInTheDocument();
  });
});
