import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  ShotZoneSchema,
  type ShotResponse,
  type ShotDirectory,
} from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
import { shotPageCsv, shotSvgExport } from './shot-export';
const source: ShotResponse['source'] = {
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
const summary = {
  attempts: 2,
  makes: 1,
  fgPercentage: 0.5,
  efgPercentage: 0.75,
  pointsPerAttempt: 1.5,
};
const data: ShotResponse = {
  season: '2017-18',
  scope: 'playoffs',
  source,
  provenance: leagueFixture.provenance,
  sourceAttempts: 2,
  sourceGames: 1,
  sourcePlayers: 2,
  sourceTeams: 2,
  sourceFrom: '2018-04-14',
  sourceTo: '2018-06-03',
  filteredAttempts: 2,
  filteredGames: 1,
  minAttempts: 1,
  page: 1,
  pageSize: 100,
  shots: [
    {
      id: 'nba:0041700131:149',
      gameId: 'nba:0041700131',
      eventId: 149,
      playerId: '2544',
      playerName: 'Fixture Main',
      team: homeTeam,
      home: homeTeam,
      away: awayTeam,
      date: '2018-04-15',
      period: 1,
      minutesRemaining: 1,
      secondsRemaining: 24,
      type: '3PT',
      made: true,
      zone: 'Above the Break 3',
      area: 'Left Side Center(LC)',
      range: '24+ ft.',
      action: 'Fixture jump shot',
      distanceFeet: 26,
      x: -168,
      y: 206,
    },
    {
      id: 'nba:0041700131:150',
      gameId: 'nba:0041700131',
      eventId: 150,
      playerId: '201939',
      playerName: 'Fixture Peer',
      team: awayTeam,
      home: homeTeam,
      away: awayTeam,
      date: '2018-04-15',
      period: 1,
      minutesRemaining: 1,
      secondsRemaining: 22,
      type: '2PT',
      made: false,
      zone: 'Restricted Area',
      area: 'Center(C)',
      range: 'Less Than8ft.',
      action: 'Fixture layup',
      distanceFeet: 0,
      x: 0,
      y: -6,
    },
  ],
  groups: [
    {
      playerId: null,
      label: 'All filtered source events',
      ...summary,
      missingCoordinates: 0,
      zones: ShotZoneSchema.options.map((zone, i) => ({
        zone,
        ...(i === 5
          ? summary
          : {
              attempts: 0,
              makes: 0,
              fgPercentage: null,
              efgPercentage: null,
              pointsPerAttempt: null,
            }),
      })),
      cells: [
        { x: -20, y: 20, attempts: 1, makes: 1, fgPercentage: 1 },
        { x: 0, y: -5, attempts: 1, makes: 0, fgPercentage: 0 },
      ],
    },
  ],
  coordinateSystem:
    'basket-origin; x left-to-right, y toward opposite end; 10 source units/foot; no home/away or period flips',
  coordinateEvidence:
    'Synthetic test response only; genuine validation runs separately.',
};
const directory: ShotDirectory = {
  players: [
    { id: '2544', name: 'Fixture Main', attempts: 1 },
    { id: '201939', name: 'Fixture Peer', attempts: 1 },
  ],
  teams: [homeTeam, awayTeam],
  games: [
    {
      id: 'nba:0041700131',
      date: '2018-04-15',
      home: homeTeam,
      away: awayTeam,
      attempts: 2,
    },
  ],
  source,
};
function routes(read = () => HttpResponse.json(data)) {
  server.use(
    http.get('http://localhost/api/shots/directory', () =>
      HttpResponse.json(directory),
    ),
    http.get('http://localhost/api/shots', read),
  );
}
describe('recorded shot studio', () => {
  it('exports bounded real-coordinate pages and source-labelled SVG without spreadsheet or XML injection', () => {
    const csv = shotPageCsv({
      ...data,
      shots: [
        {
          ...data.shots[0]!,
          playerName: '=HYPERLINK("https://unsafe.test")',
          x: null,
          y: null,
        },
      ],
    });
    expect(csv).toContain('CC0: Public Domain');
    expect(csv).toContain(data.source.url);
    expect(csv).toContain('"Unknown"');
    expect(csv).toContain('"\'=HYPERLINK(""https://unsafe.test"")"');
    expect(csv).not.toContain('Fixture Peer');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-270 -900 540 990');
    svg.setAttribute('aria-hidden', 'true');
    const exported = shotSvgExport(svg, data, '<script>Fixture</script>');
    expect(exported).toContain('&lt;script&gt;Fixture&lt;/script&gt;');
    expect(exported).toContain('CC0: Public Domain');
    expect(exported).toContain('dots only this exact page');
    expect(exported).not.toContain('aria-hidden');
    expect(exported).toContain('viewBox="-270 -900 540 990"');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
  it('renders observed make/miss marks with exact table parity and source/coverage evidence', async () => {
    routes();
    const view = renderApp('/lab/shots?minAttempts=1');
    const table = await screen.findByRole('group', {
      name: 'Shot event exact values',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(view.container.querySelectorAll('svg title')).toHaveLength(2);
    expect(view.container.querySelector('circle[fill="#166534"]')).toHaveAttribute(
      'cx',
      '-168',
    );
    expect(view.container.querySelector('path[stroke="#991b1b"]')).toBeInTheDocument();
    expect(screen.getByLabelText('Shot dataset attribution')).toHaveTextContent(
      'CC0: Public Domain',
    );
    expect(screen.getByText(/Coverage ends June3/)).toBeInTheDocument();
  });
  it('uses full-filter density values and leaves filter controls editable after invalid input', async () => {
    routes();
    const view = renderApp('/lab/shots?minAttempts=1&view=density');
    await screen.findByRole('group', {
      name: 'All filtered source events density values',
    });
    expect(view.container.querySelectorAll('svg rect[fill="#1d4ed8"]')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Minimum shot distance (ft)'), {
      target: { value: '91' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid shot filters');
    expect(screen.getByLabelText('Maximum shot distance (ft)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minimum shot distance (ft)'), {
      target: { value: '0' },
    });
    await screen.findByRole('group', {
      name: 'All filtered source events density values',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable shot URL') as HTMLInputElement).value,
    ).toContain('scope=playoffs');
  });
  it('shares comparison filters and resets pagination on scope controls without duplicating players', async () => {
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/shots/directory', () =>
        HttpResponse.json(directory),
      ),
      http.get('http://localhost/api/shots', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(data);
      }),
    );
    renderApp('/lab/shots?players=2544&page=2');
    await screen.findByRole('group', { name: 'Shot event exact values' });
    fireEvent.change(screen.getByLabelText('Compare shot player'), {
      target: { value: '201939' },
    });
    await waitFor(() => expect(requests.at(-1)).toContain('players=2544%2C201939'));
    expect(requests.at(-1)).not.toContain('page=2');
    expect(
      within(screen.getByLabelText('Compare shot player')).getByRole('option', {
        name: /Fixture Main/,
      }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Shot result'), {
      target: { value: 'made' },
    });
    await screen.findByText(/Result filter is active/);
  });
  it('rejects repeated/unsupported URL state before event fetch and displays unavailable source', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    routes(read);
    const view = renderApp('/lab/shots?players=2544&players=201939');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp('/lab/shots');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
