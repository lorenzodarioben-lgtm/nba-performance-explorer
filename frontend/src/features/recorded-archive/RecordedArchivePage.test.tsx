import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  ArchiveRankingQuerySchema,
  type ArchiveRankingResponse,
  type RecordedRecordsResponse,
} from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
import { recordedRankingCsv } from './recorded-csv';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './RecordedArchivePage';
const credits = Array.from({ length: 30 }, (_, i) => ({
  ...leagueFixture.attribution,
  title: `Fixture source ${i}`,
  revision: 1234 + i,
  url: `https://en.wikipedia.org/w/index.php?oldid=${1234 + i}`,
}));
const ranking: ArchiveRankingResponse = {
  query: ArchiveRankingQuerySchema.parse({}),
  rows: [
    {
      playerId: '2544',
      name: 'Fixture player A',
      teams: [homeTeam],
      gamesPlayed: 40,
      value: 30.5,
      rank: 1,
      percentile: 50,
      sources: [credits[0]!],
    },
    {
      playerId: '201939',
      name: 'Fixture player B',
      teams: [awayTeam],
      gamesPlayed: 40,
      value: 30.5,
      rank: 1,
      percentile: 50,
      sources: [credits[1]!],
    },
  ],
  total: 2,
  qualifiedPopulation: 2,
  sourceRows: 3,
  sourceTeams: 29,
  missingIdentityRows: 1,
  missingMetricPlayers: 0,
  belowMinimumPlayers: 0,
  unknownScopeRows: 18,
  snapshotCreatedAt: '2026-10-13T22:00:00.000Z',
  sourceFetchedFrom: '2026-10-13T21:00:00.000Z',
  sourceFetchedTo: '2026-10-13T21:01:00.000Z',
  attributions: credits,
  provenance: leagueFixture.provenance,
};
const records: RecordedRecordsResponse = {
  season: '2023-24',
  metric: 'combinedPoints',
  team: null,
  value: 210,
  games: [
    {
      id: 'nba:0022300001',
      date: '2024-04-01',
      home: homeTeam,
      away: awayTeam,
      homeScore: 110,
      awayScore: 100,
      recapUrl: 'https://www.nba.com/game/0022300001',
      sources: [credits[0]!, credits[1]!],
    },
  ],
  matchingSourceGames: 1,
  reconciledGames: 1219,
  conflictingGameIds: ['nba:0022300012'],
  unpairedGameIds: ['nba:0022300013'],
  snapshotCreatedAt: ranking.snapshotCreatedAt,
  attributions: credits,
  provenance: leagueFixture.provenance,
};
describe('recorded archive views and bounded licensed export', () => {
  it('renders explicit source-cohort coverage and keeps invalid team input editable', async () => {
    const read = vi.fn(({ request }: { request: Request }) =>
      HttpResponse.json({
        ...ranking,
        query: ArchiveRankingQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      }),
    );
    server.use(http.get('http://localhost/api/recorded/leaders', read));
    renderApp('/leaders/recorded');
    await screen.findByRole('table');
    expect(screen.getByText(/18 unspecified-scope rows withheld/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source team ID'), {
      target: { value: 'n' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.getByLabelText('Source team ID')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source team ID'), {
      target: { value: homeTeam.id },
    });
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Recorded scope'), {
      target: { value: 'playoffs' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Minimum recorded GP')).toHaveValue(5),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
  });
  it('retains raw value units and source evidence while disclosing quarantined game rows', async () => {
    server.use(
      http.get('http://localhost/api/recorded/records', () =>
        HttpResponse.json(records),
      ),
    );
    renderApp('/history/records?metric=combinedPoints');
    await screen.findByRole('table');
    expect(
      screen.getByText(/1219 games agree across both team source pages/),
    ).toHaveTextContent('1 conflicting and 1 unpaired');
    expect(screen.getByRole('link', { name: 'nba:0022300001' })).toHaveAttribute(
      'href',
      'https://www.nba.com/game/0022300001',
    );
    expect(screen.getByText(/no all-time record claim/)).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable recorded archive URL') as HTMLInputElement)
        .value,
    ).toContain('season=2023-24');
  });
  it('rejects repeated/unsupported direct URLs before fetch and shows source-disabled state', async () => {
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/recorded/leaders', read));
    const view = renderApp('/leaders/recorded?metric=pointsPerGame&metric=gamesPlayed');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp('/leaders/recorded');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
  it('exports only current-page rows with licence/revision context and protects spreadsheet formula cells', () => {
    const csv = recordedRankingCsv({
      ...ranking,
      rows: [{ ...ranking.rows[0]!, name: '=HYPERLINK("https://evil.test")' }],
    });
    expect(csv).toContain('CC BY-SA4.0');
    expect(csv).toContain('https://en.wikipedia.org/w/index.php?oldid=1234');
    expect(csv).toContain('"\'=HYPERLINK(""https://evil.test"")"');
    expect(csv).not.toContain('Fixture player B');
    expect(csv).toContain('unknown-scope rows 18');
  });
});
