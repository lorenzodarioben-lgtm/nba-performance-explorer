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
import { feetFromSvg, regionFromCorners } from './shot-region';
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
      meanDistanceFeet: 12.5,
      // Synthetic: one 0-foot miss and one 25-foot three-point make.
      distances: Array.from({ length: 11 }, (_, i) => ({
        fromFeet: i * 3,
        toFeet: i === 10 ? null : i * 3 + 2,
        attempts: i === 0 || i === 8 ? 1 : 0,
        makes: i === 8 ? 1 : 0,
        fgPercentage: i === 0 ? 0 : i === 8 ? 1 : null,
        efgPercentage: i === 0 ? 0 : i === 8 ? 1.5 : null,
        pointsPerAttempt: i === 0 ? 0 : i === 8 ? 3 : null,
        threePointAttempts: i === 8 ? 1 : 0,
      })),
      cells: [
        { x: -20, y: 20, attempts: 1, makes: 1, fgPercentage: 1, pointsPerAttempt: 3 },
        { x: 0, y: -5, attempts: 1, makes: 0, fgPercentage: 0, pointsPerAttempt: 0 },
      ],
    },
  ],
  region: null,
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
function routes(read: Parameters<typeof http.get>[1] = () => HttpResponse.json(data)) {
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
    const reopened = new DOMParser().parseFromString(exported, 'image/svg+xml');
    expect(reopened.querySelector('parsererror')).toBeNull();
    expect(reopened.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
  it('exports each panel from its own court, not by position on the page', async () => {
    const twoPanels: ShotResponse = {
      ...data,
      groups: [
        { ...data.groups[0]!, playerId: '2544', label: 'Fixture Main' },
        { ...data.groups[0]!, playerId: '201939', label: 'Fixture Peer' },
      ],
    };
    routes(() => HttpResponse.json(twoPanels));
    const blobs: Blob[] = [];
    const create = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:shot-export';
    });
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderApp('/lab/shots?players=2544,201939&minAttempts=1');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Export Fixture Peer plot SVG' }),
    );
    expect(create).toHaveBeenCalledTimes(1);
    const exported = await blobs[0]!.text();
    expect(exported).toContain('Fixture Peer: recorded partial 2018 playoff shots');
    expect(exported).toContain('data-shot="nba:0041700131:150"');
    expect(exported).not.toContain('data-shot="nba:0041700131:149"');
    const reopened = new DOMParser().parseFromString(exported, 'image/svg+xml');
    expect(reopened.querySelector('parsererror')).toBeNull();
    click.mockRestore();
  });
  it('renders observed make/miss marks with exact table parity and source/coverage evidence', async () => {
    routes();
    const view = renderApp('/lab/shots?minAttempts=1');
    const table = await screen.findByRole('group', {
      name: 'Shot event exact values',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    // One readable mark per shot on the court (the distance profile has its own bin titles).
    expect(view.container.querySelectorAll('svg.shotcourt title')).toHaveLength(2);
    // Marks carry their outcome and the raw recorded coordinates as semantic hooks (the colour
    // is a design decision; the data is what is asserted).
    expect(
      view.container.querySelector(
        '[data-result="made"][data-raw-x="-168"][data-raw-y="206"]',
      ),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(
        '[data-result="missed"][data-raw-x="0"][data-raw-y="-6"]',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Shot dataset attribution')).toHaveTextContent(
      'CC0: Public Domain',
    );
    expect(screen.getByText(/Coverage ends June 3/)).toBeInTheDocument();
  });
  it('uses full-filter density values and leaves filter controls editable after invalid input', async () => {
    routes();
    const view = renderApp('/lab/shots?minAttempts=1&view=density');
    await screen.findByRole('group', {
      name: 'All filtered source events density values',
    });
    expect(view.container.querySelectorAll('svg [data-cell]')).toHaveLength(2);
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

describe('shot studio 3.0 tools', () => {
  it('filters by zone from the zone buttons and sends the zone to the API', async () => {
    const seen: string[] = [];
    routes(({ request }) => {
      seen.push(new URL(request.url).searchParams.get('zone') ?? '');
      return HttpResponse.json(data);
    });
    renderApp('/lab/shots?view=zones&minAttempts=1');
    const zones = await screen.findByRole('group', { name: 'Filter by source zone' });
    const corner = within(zones).getByRole('button', { name: 'Left Corner 3' });
    fireEvent.click(corner);
    await waitFor(() => expect(seen).toContain('Left Corner 3'));
    expect(corner).toHaveAttribute('aria-pressed', 'true');
    // Choosing the active zone again clears it.
    fireEvent.click(corner);
    await waitFor(() => expect(corner).toHaveAttribute('aria-pressed', 'false'));
    expect(within(zones).getByRole('button', { name: 'All zones' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows the distance profile with exact values for every filtered attempt', async () => {
    routes();
    renderApp('/lab/shots?minAttempts=1');
    const table = await screen.findByRole('group', {
      name: 'All filtered source events shot distance profile',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(12);
    expect(rows[1]).toHaveTextContent('0–2');
    expect(rows[9]).toHaveTextContent('24–26');
    expect(rows[9]).toHaveTextContent('100.0%');
    expect(rows[11]).toHaveTextContent('30+');
    expect(screen.getByText('Mean source distance 12.5 ft')).toBeInTheDocument();
  });

  it('compares two players zone by zone as shares of their own attempts', async () => {
    const peer = {
      ...data.groups[0]!,
      playerId: '201939',
      label: 'Fixture Peer',
      attempts: 4,
      zones: data.groups[0]!.zones.map((z, i) => ({ ...z, attempts: i === 5 ? 4 : 0 })),
    };
    routes(() =>
      HttpResponse.json({
        ...data,
        groups: [{ ...data.groups[0]!, playerId: '2544', label: 'Fixture Main' }, peer],
      }),
    );
    renderApp('/lab/shots?players=2544,201939&minAttempts=1');
    const table = await screen.findByRole('group', { name: 'Zone share comparison' });
    const rows = within(table).getAllByRole('row');
    // Only zones with any attempt are listed; the fixture has one.
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent(ShotZoneSchema.options[5]!);
    expect(rows[1]).toHaveTextContent('100.0%');
  });

  it('saves, lists and deletes named studio views in local research storage', async () => {
    localStorage.clear();
    routes();
    renderApp('/lab/shots?type=3PT&minAttempts=1');
    fireEvent.change(await screen.findByLabelText('Name this view'), {
      target: { value: 'Threes only' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save view' }));
    const link = await screen.findByRole('link', { name: 'Threes only' });
    expect(link.getAttribute('href')).toMatch(/^\/lab\/shots\?.*type=3PT/);
    expect(localStorage.getItem('nba-explorer.research.v1')).toContain('Threes only');
    expect(screen.getByRole('button', { name: 'Already saved' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete saved view Threes only' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Threes only' })).toBeNull(),
    );
    expect(localStorage.getItem('nba-explorer.research.v1')).not.toContain(
      'Threes only',
    );
  });
});

describe('shot studio efficiency view', () => {
  it('colours only qualified cells, relative to the panel FG%, and outlines thin cells', async () => {
    // Panel 1.0 points per attempt: a qualified cell at 1.5 (above), one at 0.4 (below) and a
    // thin cell. A 50% three-point cell (1.5) outranks the panel even with a lower FG%.
    const group = {
      ...data.groups[0]!,
      fgPercentage: 0.5,
      pointsPerAttempt: 1,
      cells: [
        {
          x: -20,
          y: 20,
          attempts: 12,
          makes: 6,
          fgPercentage: 0.5,
          pointsPerAttempt: 1.5,
        },
        {
          x: 0,
          y: -5,
          attempts: 10,
          makes: 2,
          fgPercentage: 0.2,
          pointsPerAttempt: 0.4,
        },
        {
          x: 10,
          y: 0,
          attempts: 2,
          makes: 1,
          fgPercentage: null,
          pointsPerAttempt: null,
        },
      ],
    };
    routes(() => HttpResponse.json({ ...data, minAttempts: 10, groups: [group] }));
    const view = renderApp('/lab/shots?view=efficiency&minAttempts=10');
    await screen.findByText(
      /Efficiency colours only 5×5 foot cells with at least 10 attempts/,
    );
    const cells = view.container.querySelectorAll('.shotcourt__efficiency rect');
    expect(cells).toHaveLength(3);
    const byCell = (key: string) =>
      view.container.querySelector(`.shotcourt__efficiency [data-cell="${key}"]`)!;
    expect(byCell('-20:20')).toHaveAttribute('data-qualified', 'true');
    expect(byCell('-20:20').getAttribute('fill')).toMatch(/^rgba\(239,68,68,/);
    expect(byCell('0:-5').getAttribute('fill')).toMatch(/^rgba\(59,130,246,/);
    expect(byCell('10:0')).toHaveAttribute('data-qualified', 'false');
    expect(byCell('10:0')).toHaveAttribute('fill', 'none');
    expect(byCell('10:0').textContent).toMatch(/2 attempts, too few for a rate/);
    expect(byCell('-20:20').textContent).toMatch(
      /6\/12, 1.50 points per attempt vs panel 1.00/,
    );
    // The exact values table lists every cell, qualified or not, with its counts.
    const table = screen.getByRole('group', { name: /density values/ });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });
});

describe('shot studio court region', () => {
  it('inverts the court projection and snaps dragged corners to whole feet', () => {
    // The basket sits at SVG (250, 417.5) in the half-court crop.
    expect(feetFromSvg(250, 417.5)).toEqual({ x: 0, y: 0 });
    expect(feetFromSvg(0, 0)).toEqual({ x: -25, y: 41.75 });
    // Corners in any order become an ordered box, widened outward to whole feet.
    expect(regionFromCorners({ x: 7.2, y: 8.4 }, { x: -7.6, y: -2.1 })).toEqual({
      x1: -8,
      y1: -3,
      x2: 8,
      y2: 9,
    });
    // Clamped to the court and the distance cap.
    expect(regionFromCorners({ x: -40, y: -9 }, { x: 30, y: 120 })).toEqual({
      x1: -25,
      y1: -6,
      x2: 25,
      y2: 90,
    });
    // A click or a sliver is not a region.
    expect(regionFromCorners({ x: 1, y: 1 }, { x: 1.4, y: 9 })).toBeNull();
  });

  it('applies a region from the keyboard fields, outlines it and labels every export', async () => {
    const seen: string[] = [];
    routes(({ request }) => {
      const region = new URL(request.url).searchParams.get('region');
      seen.push(region ?? '');
      return HttpResponse.json({
        ...data,
        region: region ? { x1: -8, y1: -6, x2: 8, y2: 8 } : null,
      });
    });
    const view = renderApp('/lab/shots');
    const apply = await screen.findByRole('button', { name: 'Apply region' });
    expect(apply).toBeDisabled();
    const values = ['-8', '-6', '8', '8'];
    for (const [i, label] of [
      'Region left edge (ft across)',
      'Region near edge (ft out)',
      'Region right edge (ft across)',
      'Region far edge (ft out)',
    ].entries())
      fireEvent.change(screen.getByLabelText(label), { target: { value: values[i] } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply region' }));
    await waitFor(() => expect(seen.at(-1)).toBe('-8,-6,8,8'));
    expect(
      await screen.findByText(/across -8 to 8 ft, out -6 to 8 ft from the basket/),
    ).toBeInTheDocument();
    const outline = view.container.querySelector('.shotcourt__region')!;
    expect(outline).toHaveAttribute('data-region', '-8,-6,8,8');
    // 16 ft wide and 14 ft deep in source units, with its top edge at 8 ft out.
    expect(outline).toHaveAttribute('width', '160');
    expect(outline).toHaveAttribute('height', '140');
    expect(outline).toHaveAttribute('y', String(417.5 - 80));
    const regionData = { ...data, region: { x1: -8, y1: -6, x2: 8, y2: 8 } };
    expect(shotPageCsv(regionData)).toContain(
      '"Court region","across -8 to 8 ft, out -6 to 8 ft from the basket"',
    );
    expect(shotPageCsv(data)).toContain('"Court region","Whole court"');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(shotSvgExport(svg, regionData, 'Fixture')).toContain(
      'Court region across -8 to 8 ft',
    );
    // The share link carries the region; clearing it returns to the whole court.
    expect(
      (screen.getByLabelText('Shareable shot URL') as HTMLInputElement).value,
    ).toContain('region=-8%2C-6%2C8%2C8');
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear region' })[0]!);
    // The whole-court result is already cached, so it returns without a new request.
    await waitFor(() =>
      expect(view.container.querySelector('.shotcourt__region')).toBeNull(),
    );
  });

  it('offers a drawing mode and rejects regions that are off the court or out of order', async () => {
    routes();
    renderApp('/lab/shots');
    const draw = await screen.findByRole('button', { name: 'Draw a court region' });
    expect(draw).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(draw);
    expect(
      screen.getByRole('button', { name: 'Drawing a region: drag on a court' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('.shotcourt__picker')).not.toBeNull();
  });

  it.each(['8,-6,-8,8', '-30,0,5,5', '-8,-6,8', '1.5,0,5,5'])(
    'rejects the malformed region %s',
    async (bad) => {
      routes();
      renderApp(`/lab/shots?region=${bad}`);
      expect(await screen.findByRole('alert')).toHaveTextContent('court region');
    },
  );
});
