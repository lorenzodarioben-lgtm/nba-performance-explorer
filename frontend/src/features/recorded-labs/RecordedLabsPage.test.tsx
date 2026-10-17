import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedLabsPage';
const ids = ['2544', '203076', '1630559', '1626156', '1629060'];
const credits = Array.from({ length: 30 }, (_, i) => ({
  ...leagueFixture.attribution,
  revision: 1234 + i,
  url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
}));
const directory = {
  season: '2023-24',
  teams: Array.from({ length: 30 }, (_, i) =>
    i === 0
      ? homeTeam
      : i === 1
        ? awayTeam
        : {
            id: `nba:${1610612800 + i}`,
            sourceId: String(1610612800 + i),
            name: `Fixture team ${i}`,
            abbreviation: `F${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
          },
  ),
  players: ids.map((playerId, i) => ({
    playerId,
    name: `Fixture player ${i}`,
    teams: [homeTeam],
  })),
  attributions: credits,
  provenance: leagueFixture.provenance,
};
const group = {
  kind: 'hypothetical',
  season: '2023-24',
  scope: 'regular-season',
  observedLineup: false,
  jointPerformance: null,
  members: ids.map((playerId, i) => ({
    playerId,
    name: `Fixture player ${i}`,
    status: 'available',
    teams: [homeTeam],
    gamesPlayed: 40,
    pointsPerGame: 20,
    reboundsPerGame: 5,
    assistsPerGame: 4,
    individualRecordedPoints: null,
    sources: [credits[0]],
  })),
  sumOfIndividualRecordedPoints: null,
  availableMembers: 5,
  provenance: leagueFixture.provenance,
};
const comparison = {
  season: '2023-24',
  scope: 'regular-season',
  rows: [homeTeam, awayTeam].map((team) => ({
    team,
    observedGames: 80,
    wins: 40,
    losses: 40,
    winPercentage: 0.5,
    pointsPerGame: 110,
    opponentPointsPerGame: 100,
    finalMarginPerGame: 10,
    source: credits[0],
  })),
  headToHead: [
    {
      id: 'nba:0022300001',
      date: '2024-04-01',
      home: homeTeam,
      away: awayTeam,
      homeScore: 110,
      awayScore: 100,
      recapUrl: 'https://www.nba.com/game/0022300001',
      sources: [credits[0], credits[1]],
    },
  ],
  quarantinedGameIds: ['nba:0022300012'],
  provenance: leagueFixture.provenance,
};
function mockDirectory() {
  server.use(
    http.get('http://localhost/api/recorded/directory', () =>
      HttpResponse.json(directory),
    ),
  );
}
describe('recorded identity/team labs', () => {
  it('requires five distinct identities, preserves source scope and labels every summary as independent', async () => {
    mockDirectory();
    let query = new URLSearchParams();
    const read = vi.fn(({ request }: { request: Request }) => {
      query = new URL(request.url).searchParams;
      return HttpResponse.json({
        ...group,
        scope: query.get('scope') ?? 'regular-season',
      });
    });
    server.use(http.get('http://localhost/api/recorded/hypothetical', read));
    renderApp('/lab/groups');
    await screen.findByLabelText('Add recorded player');
    expect(read).not.toHaveBeenCalled();
    for (const id of ids.slice(0, 4))
      fireEvent.change(screen.getByLabelText('Add recorded player'), {
        target: { value: id },
      });
    expect(read).not.toHaveBeenCalled();
    expect(screen.getByText(/4 selected/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Add recorded player'), {
      target: { value: ids[4] },
    });
    await screen.findByRole('table');
    expect(query.get('players')).toBe(ids.join(','));
    expect(screen.getByText(/Joint performance unavailable/)).toBeInTheDocument();
    expect(
      screen.getByText(/does not describe these players performing together/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Individual summary scope'), {
      target: { value: 'playoffs' },
    });
    await waitFor(() => expect(query.get('scope')).toBe('playoffs'));
    fireEvent.click(await screen.findByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('restores two teams and displays exact source-agreed meeting links with observed sample counts', async () => {
    mockDirectory();
    server.use(
      http.get('http://localhost/api/recorded/team-comparison', () =>
        HttpResponse.json(comparison),
      ),
    );
    renderApp(`/lab/teams?teams=${homeTeam.id},${awayTeam.id}`);
    await screen.findByRole('heading', {
      name: 'Recorded source-agreed head-to-head games',
    });
    expect(screen.getByRole('link', { name: 'nba:0022300001' })).toHaveAttribute(
      'href',
      'https://www.nba.com/game/0022300001',
    );
    expect(
      screen.getByText(/Final margin is not possession-based net rating/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Add recorded team')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Remove ${homeTeam.name}` }));
    expect(screen.getByLabelText('Add recorded team')).not.toBeDisabled();
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();
  });
  it('refuses duplicate/direct unsupported selections and reports unavailable directory without guessed members', async () => {
    mockDirectory();
    const read = vi.fn(() => HttpResponse.json(group));
    server.use(http.get('http://localhost/api/recorded/hypothetical', read));
    const view = renderApp(`/lab/groups?players=${ids[0]},${ids[0]}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or duplicate');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    server.use(
      http.get(
        'http://localhost/api/recorded/directory',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    renderApp('/lab/groups');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
