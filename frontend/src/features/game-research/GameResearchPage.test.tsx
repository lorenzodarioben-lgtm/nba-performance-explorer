import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
const totals = {
  playerId: '2544',
  season: '2022-23',
  gamesPlayed: 1,
  minutes: 30,
  points: 30,
  rebounds: 10,
  assists: 5,
  turnovers: 2,
  fieldGoalsMade: 10,
  fieldGoalsAttempted: 20,
  threesMade: 4,
  threesAttempted: 10,
  freeThrowsMade: 6,
  freeThrowsAttempted: 8,
};
const metrics = {
  trueShooting: 0.6377551020408163,
  effectiveFieldGoal: 0.6,
  assistTurnover: 2.5,
  pointsPer36: 36,
  fieldGoalPercentage: 0.5,
  threePointPercentage: 0.4,
  freeThrowPercentage: 0.75,
};
const game = {
  id: '0042200001',
  date: '2023-05-02',
  team: { abbreviation: 'LAL' },
  opponent: { abbreviation: 'BOS' },
  location: 'home',
  result: 'W',
  minutes: 30,
  points: 30,
  rebounds: 10,
  assists: 5,
};
const summary = {
  sample: 1,
  wins: 1,
  losses: 0,
  totals,
  metrics,
  perGame: {
    points: 30,
    rebounds: 10,
    assists: 5,
    minutes: 30,
    steals: 2,
    blocks: null,
    turnovers: 2,
  },
};
const provenance = {
  source: 'fixture',
  servedAt: '2026-10-13T19:00:00.000Z',
  retrievedAt: '2026-10-13T18:00:00.000Z',
  asOf: null,
  isLive: false,
  scope: 'playoffs',
  coverage: 'Observed test games only.',
  warnings: ['DEMO FIXTURES'],
};
const body = {
  player: { id: '2544', fullName: 'Fixture game player' },
  season: '2022-23',
  scope: 'playoffs',
  status: 'available',
  observedGames: 1,
  filteredGames: 1,
  reportedSeasonGames: 1,
  page: 1,
  pageSize: 20,
  window: 5,
  games: [
    {
      game,
      raw: {
        fieldGoalsMade: 10,
        fieldGoalsAttempted: 20,
        threesMade: 4,
        threesAttempted: 10,
        freeThrowsMade: 6,
        freeThrowsAttempted: 8,
        steals: 2,
        blocks: null,
        turnovers: 2,
      },
    },
  ],
  summary,
  recent: summary,
  splits: [{ label: 'Home', summary }],
  rolling: [{ gameId: game.id, date: game.date, summary }],
  extrema: [
    { metric: 'points', high: 30, low: 30, highGames: [game], lowGames: [game] },
  ],
  provenance,
};
function scopeHandler() {
  server.use(
    http.get('http://localhost/api/players/2544/season-scopes', () =>
      HttpResponse.json({
        player: body.player,
        season: body.season,
        rows: ['regular-season', 'playoffs'].map((scope) => ({
          scope,
          status: 'season-unavailable',
          totals: null,
          metrics: null,
          provenance: { ...provenance, scope },
        })),
      }),
    ),
  );
}
describe('raw game research UI', () => {
  it('restores playoff thresholds, displays raw attempts/nulls and retains evidence/source labels', async () => {
    scopeHandler();
    server.use(
      http.get('http://localhost/api/players/2544/game-research', () =>
        HttpResponse.json(body),
      ),
    );
    renderApp('/players/2544/games?season=2022-23&scope=playoffs&minPoints=30');
    const ledger = await screen.findByRole('table', { name: /Page 1/ });
    expect(screen.getByLabelText('Game season scope')).toHaveValue('playoffs');
    expect(screen.getByLabelText('Minimum points')).toHaveValue(30);
    expect(within(ledger).getByText('Unavailable')).toBeInTheDocument();
    expect(within(ledger).getByText('0042200001')).toBeInTheDocument();
    expect(screen.getByLabelText('Shareable game research URL')).toHaveValue(
      'http://localhost:3000/players/2544/games?season=2022-23&scope=playoffs&minPoints=30',
    );
    expect(
      await screen.findByRole('table', { name: /Equal season/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/2023-05-02 vs BOS/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('shares applied thresholds while keeping season/type and resets filters within that scope', async () => {
    scopeHandler();
    let last = '';
    server.use(
      http.get('http://localhost/api/players/2544/game-research', ({ request }) => {
        last = new URL(request.url).search;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/players/2544/games?season=2022-23&scope=playoffs');
    await screen.findByLabelText('Minimum points');
    fireEvent.change(screen.getByLabelText('Minimum points'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply game filters' }));
    await waitFor(() => expect(last).toContain('minPoints=50'));
    expect(last).toContain('scope=playoffs');
    expect(last).toContain('season=2022-23');
    fireEvent.click(await screen.findByRole('button', { name: 'Clear game filters' }));
    await waitFor(() =>
      expect(
        screen.getByLabelText('Shareable game research URL').getAttribute('value'),
      ).not.toContain('minPoints'),
    );
    expect(
      screen.getByLabelText('Shareable game research URL').getAttribute('value'),
    ).toContain('scope=playoffs');
  });
  it('does not fetch invalid URLs and can recover with an explicit season', async () => {
    let calls = 0;
    scopeHandler();
    server.use(
      http.get('http://localhost/api/players/2544/game-research', () => {
        calls++;
        return HttpResponse.json(body);
      }),
    );
    renderApp('/players/2544/games?season=2022-23&scope=all');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a valid recorded season',
    );
    expect(calls).toBe(0);
    fireEvent.change(screen.getByLabelText('Season (YYYY-YY)'), {
      target: { value: '2022-23' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open season' }));
    await screen.findByRole('table', { name: /Page 1/ });
    expect(calls).toBe(1);
  });
});
