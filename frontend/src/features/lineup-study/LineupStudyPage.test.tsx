import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  type StudyLineupResponse,
  type StudyLineupRow,
  StudyDirectorySchema,
} from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './LineupStudyPage';
const source: StudyLineupResponse['source'] = {
  doi: '10.57745/9NVFIQ',
  creator: 'Arnaud Odet',
  title: 'Synthetic source fixture',
  licence: 'Etalab Open License 2.0',
  licenceUrl: 'https://spdx.org/licenses/etalab-2.0.html',
  datasetVersion: '1.0',
  sourceUpdatedAt: '2026-04-28T11:07:33Z',
  sourceReleasedAt: '2026-04-28T11:07:33Z',
  retrievedAt: '2026-10-14T08:47:00.581486Z',
  archiveMd5: 'dee0454ff932339714192c4031006972',
  statisticsFile: 'data/preproc_data/stats/2017-18.csv',
  statisticsSha256: '8a3f45fe2a241aa1ae0586bacd6b72b2ef2d74dfb756904ddbcdb230a7d598a6',
  gameIdentityFile: 'data/preproc_data/starting_lineups/2017-18.csv',
  gameIdentitySha256:
    '6bdf0095602897595a1a292203d8f0de559a6c261420f9b874372c6b2051c283',
  reportedQuarterRows: 50237,
  sourceRegularGames: 1230,
  sourceLineups: 13869,
  verifiedQuarterSideGroups: 9954,
};
const people = Array.from({ length: 540 }, (_, i) => ({
  id: `br:aaaaa${String.fromCharCode(97 + Math.floor(i / 100))}${String(i % 100).padStart(2, '0')}`,
  aliases: [`Fixture member ${i}`],
}));
const row: StudyLineupRow = {
  id: 'study:LAL_2017_001',
  team: homeTeam,
  members: people.slice(0, 5).map((p) => ({
    ...p,
    nbaPlayerId: null,
    sourceUrl: `https://www.basketball-reference.com/players/a/${p.id.slice(3)}.html`,
  })),
  secondsTogether: 2400,
  minutesTogether: 40,
  plusMinus: 8,
  plusMinusPer48: 9.6,
  observedGames: 1,
  games: [
    {
      id: 'nba:0021700001',
      date: '2017-10-17',
      url: 'https://www.nba.com/game/bos-vs-lal-0021700001/box-score',
    },
  ],
  reportedQuarterRows: 4,
  qualified: true,
  possessions: null,
  offensiveRating: null,
  defensiveRating: null,
  netRating: null,
  basis:
    'researcher-reconstructed from substitution records; source quarter reports, not official independently verified lineup events',
};
const peer = {
  ...row,
  id: 'study:BOS_2017_001',
  team: awayTeam,
  plusMinus: -8,
  plusMinusPer48: -9.6,
};
const data: StudyLineupResponse = {
  season: '2017-18',
  scope: 'regular-season',
  rows: [row, peer],
  comparison: [],
  total: 2,
  minMinutes: 30,
  page: 1,
  pageSize: 25,
  usableGames: 1229,
  usableLineups: 13867,
  source,
  quarantinedGames: [
    {
      id: 'nba:0021700421',
      sourceKey: '2017-12-15_PHI_vs_OKC',
      reportedPeriods: [1, 2, 3, 4, 5, 7],
      reason: 'missing-contiguous-source-periods',
    },
  ],
  quarantinedOnlyLineupIds: ['study:PHI_2017_276', 'study:PHI_2017_419'],
  provenance: leagueFixture.provenance,
};
const directory: ReturnType<typeof StudyDirectorySchema.parse> = {
  season: '2017-18',
  people,
  teams: leagueFixture.standings.map((r) => r.team),
  source,
};
function addDirectory() {
  server.use(
    http.get('http://localhost/api/research-lineups/directory', () =>
      HttpResponse.json(directory),
    ),
  );
}
describe('source-reconstructed lineup report UI', () => {
  it('renders five native identities, exact shared quantities and source game evidence without NBA profile guesses', async () => {
    addDirectory();
    server.use(
      http.get('http://localhost/api/research-lineups', () => HttpResponse.json(data)),
    );
    renderApp('/lab/lineups');
    const table = await screen.findByRole('group', {
      name: 'Research lineup exact values',
    });
    expect(
      within(table).getAllByRole('link', { name: 'Fixture member 0' }),
    ).toHaveLength(2);
    expect(
      within(table).getAllByRole('link', { name: 'Fixture member 0' })[0],
    ).toHaveAttribute('href', row.members[0]!.sourceUrl);
    expect(within(table).getByText('9.600')).toBeInTheDocument();
    expect(screen.getByText(/offensive\/defensive\/net ratings/)).toBeInTheDocument();
    expect(screen.getByLabelText('Research source attribution')).toHaveTextContent(
      'Etalab Open License 2.0',
    );
    expect(screen.getByLabelText('Research source attribution')).toHaveTextContent(
      '1, 2, 3, 4, 5, 7',
    );
  });
  it('keeps a pending comparison without invalid API state and saves two distinct source groups', async () => {
    addDirectory();
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/research-lineups', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json({
          ...data,
          comparison: new URL(request.url).searchParams.has('compare')
            ? [row, peer]
            : [],
        });
      }),
    );
    renderApp('/lab/lineups');
    await screen.findByRole('group', { name: 'Research lineup exact values' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Use study:LAL_2017_001 as A' }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Comparison source group A')).toHaveValue(row.id);
    fireEvent.click(
      screen.getByRole('button', { name: 'Use study:BOS_2017_001 as B' }),
    );
    await screen.findByRole('group', { name: 'Research lineup comparison' });
    expect(requests.at(-1)).toContain(
      'compare=study%3ALAL_2017_001%2Cstudy%3ABOS_2017_001',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable research lineup URL') as HTMLInputElement)
        .value,
    ).toContain('compareA=study%3ALAL_2017_001');
  });
  it('adds only known native member filters and keeps invalid numeric controls editable', async () => {
    addDirectory();
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/research-lineups', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(data);
      }),
    );
    renderApp('/lab/lineups');
    await screen.findByRole('group', { name: 'Research lineup exact values' });
    fireEvent.change(screen.getByLabelText('Add source member'), {
      target: { value: people[0]!.id },
    });
    await waitFor(() => expect(requests.at(-1)).toContain('members=br%3Aaaaaaa00'));
    fireEvent.change(screen.getByLabelText('Minimum shared minutes'), {
      target: { value: '2001' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.getByLabelText('Comparison source group B')).toBeInTheDocument();
  });
  it('rejects unsupported/repeated state before data fetch and shows source-disabled feedback', async () => {
    addDirectory();
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/research-lineups', read));
    const view = renderApp('/lab/lineups?members=br:aaaaaa00&members=br:aaaaaa01');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    view.unmount();
    renderApp('/lab/lineups');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
