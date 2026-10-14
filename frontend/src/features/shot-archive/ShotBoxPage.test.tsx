import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  type ShotBoxResponse,
  type ShotDirectory,
} from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
const source: ShotBoxResponse['source'] = {
  title: 'NBA Playoff Shots 2018',
  creator: 'Boon P',
  version: 1,
  url: 'https://www.kaggle.com/datasets/boonpalipatana/nba-playoff-shots-2018',
  licence: 'CC0: Public Domain',
  licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceUpdatedAt: '2018-06-06T22:04:48.633Z',
  retrievedAt: '2026-10-14T07:43:50.166Z',
  sha256: '1e97afe9574d133e3f2e5db20130604605c10a6763b0516a58051aab78274cf6',
  originalSource:
    'stats.nba.com; downloaded from public Kaggle dataset, no new NBA requests',
};
const counts = {
  attempts: 4,
  makes: 2,
  twoAttempts: 2,
  twoMakes: 1,
  threeAttempts: 2,
  threeMakes: 1,
  fgPercentage: 0.5,
  threePercentage: 0.5,
  efgPercentage: 0.625,
  fieldGoalPoints: 5,
  freeThrows: null,
  totalPoints: null,
  minutes: null,
  rebounds: null,
  assists: null,
};
const game = 'nba:0041700402';
const data: ShotBoxResponse = {
  gameId: game,
  date: '2018-06-03',
  home: homeTeam,
  away: awayTeam,
  minAttempts: 1,
  observedAttempts: 8,
  players: [
    { ...counts, playerId: '2544', name: 'Fixture Shooter A', team: homeTeam },
    { ...counts, playerId: '201939', name: 'Fixture Shooter B', team: awayTeam },
  ],
  teams: [
    { ...counts, team: awayTeam },
    { ...counts, team: homeTeam },
  ],
  source,
  provenance: leagueFixture.provenance,
};
const dir: ShotDirectory = {
  players: [],
  teams: [homeTeam, awayTeam],
  games: [{ id: game, date: data.date, home: homeTeam, away: awayTeam, attempts: 8 }],
  source,
};
function directory() {
  server.use(
    http.get('http://localhost/api/shots/directory', () => HttpResponse.json(dir)),
  );
}
describe('observed game shooting view', () => {
  it('shows observed counts and missing full totals with exact-event evidence and saved game URL', async () => {
    directory();
    server.use(
      http.get('http://localhost/api/shots/box', () => HttpResponse.json(data)),
    );
    renderApp(`/games/shooting?game=${game}`);
    await screen.findByRole('group', { name: 'Observed player shooting' });
    expect(screen.getAllByText('2/4')).toHaveLength(4);
    expect(
      screen.getByText(/Full points\/FT\/minutes\/REB\/AST: unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Inspect exact source shot events' }),
    ).toHaveAttribute('href', `/lab/shots?game=${game}`);
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('keeps game/minimum controls editable and requires explicit game selection', async () => {
    directory();
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/shots/box', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(data);
      }),
    );
    renderApp('/games/shooting');
    expect(
      await screen.findByText(/Choose a recorded game to inspect/),
    ).toBeInTheDocument();
    expect(requests).toEqual([]);
    await screen.findByRole('option', { name: /2018-06-03.*nba:0041700402/ });
    fireEvent.change(screen.getByLabelText('Recorded shooting game'), {
      target: { value: game },
    });
    await screen.findByRole('group', { name: 'Observed team shooting' });
    fireEvent.change(screen.getByLabelText('Shooting box minimum attempts'), {
      target: { value: '1001' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    fireEvent.change(screen.getByLabelText('Shooting box minimum attempts'), {
      target: { value: '5' },
    });
    await waitFor(() => expect(requests.at(-1)).toContain('minAttempts=5'));
  });
  it('rejects repeated direct URLs before fetch and shows source-disabled feedback', async () => {
    directory();
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/shots/box', read));
    const view = renderApp(`/games/shooting?game=${game}&game=${game}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp(`/games/shooting?game=${game}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
