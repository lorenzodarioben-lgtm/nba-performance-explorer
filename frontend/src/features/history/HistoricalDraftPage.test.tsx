import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { type DraftResponse } from '@nba-performance-explorer/contracts';
import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { homeTeam, awayTeam, leagueFixture } from '../wiki-archive/archive-fixtures';
const body: DraftResponse = {
  year: 2023,
  selections: [
    {
      id: 'draft:2023:1',
      year: 2023,
      round: 1,
      pick: 1,
      name: 'Fixture prospect',
      playerLabel: 'Fixture prospect*',
      articleUrl: 'https://en.wikipedia.org/wiki/Fixture_Prospect',
      nbaPlayerId: '1631704',
      identityUrl: 'https://www.wikidata.org/wiki/Q123',
      position: 'C',
      nationality: 'Fixture country',
      listedTeam: homeTeam,
      teamLabel: 'Los Angeles Lakers (from another team, traded to another team)',
      schoolClub: 'Fixture College (Fr.)',
    },
    {
      id: 'draft:2023:31',
      year: 2023,
      round: 2,
      pick: 31,
      name: 'Fixture unknown',
      playerLabel: 'Fixture unknown',
      articleUrl: 'https://en.wikipedia.org/wiki/Fixture_Unknown',
      nbaPlayerId: null,
      identityUrl: null,
      position: null,
      nationality: null,
      listedTeam: awayTeam,
      teamLabel: 'Boston Celtics',
      schoolClub: null,
    },
  ],
  total: 2,
  sourceSelections: 58,
  forfeitures: [
    {
      round: 2,
      listedTeam: homeTeam,
      sourceLabel: 'Fixture LAL forfeiture (source text)',
    },
    {
      round: 2,
      listedTeam: awayTeam,
      sourceLabel: 'Fixture BOS forfeiture (source text)',
    },
  ],
  page: 1,
  pageSize: 20,
  identityStatus: 'available',
  identityRetrievedAt: '2026-10-14T10:00:00.000Z',
  missingNBAIds: 1,
  attribution: leagueFixture.attribution,
  provenance: leagueFixture.provenance,
};
function teams() {
  server.use(
    http.get('http://localhost/api/teams', () =>
      HttpResponse.json({
        teams: leagueFixture.standings.map((r) => r.team),
        provenance: leagueFixture.provenance,
      }),
    ),
  );
}
describe('historical draft class UI', () => {
  it('retains source trade/marker text and optional profile identity, forfeitures and saved filters', async () => {
    teams();
    server.use(
      http.get('http://localhost/api/history/draft', () => HttpResponse.json(body)),
    );
    renderApp('/history/draft');
    await screen.findByRole('group', { name: 'Historical draft selections' });
    expect(screen.getByRole('link', { name: '1631704' })).toHaveAttribute(
      'href',
      '/players/1631704',
    );
    expect(screen.getByRole('link', { name: 'Fixture unknown' })).toHaveAttribute(
      'href',
      'https://en.wikipedia.org/wiki/Fixture_Unknown',
    );
    expect(screen.getByText(body.selections[0]!.teamLabel)).toBeInTheDocument();
    expect(
      screen.getByText(body.forfeitures[0]!.sourceLabel, { exact: false }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save to My NBA' }));
    expect(
      await screen.findByText('Saved in My NBA on this device.'),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Shareable draft URL') as HTMLInputElement).value,
    ).toContain('year=2023');
  });
  it('shares round/search filters, resets paging and keeps invalid bounds editable', async () => {
    teams();
    const requests: string[] = [];
    server.use(
      http.get('http://localhost/api/history/draft', ({ request }) => {
        requests.push(request.url);
        return HttpResponse.json(body);
      }),
    );
    renderApp('/history/draft?page=2');
    await screen.findByRole('group', { name: 'Historical draft selections' });
    fireEvent.change(screen.getByLabelText('Draft round'), { target: { value: '2' } });
    await waitFor(() => expect(requests.at(-1)).toContain('round=2'));
    expect(requests.at(-1)).not.toContain('page=2');
    fireEvent.change(screen.getByLabelText('First draft pick'), {
      target: { value: '59' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.getByLabelText('Last draft pick')).toBeInTheDocument();
  });
  it('rejects repeated source queries before requests and displays source failure', async () => {
    teams();
    const read = vi.fn(() => new HttpResponse(null, { status: 503 }));
    server.use(http.get('http://localhost/api/history/draft', read));
    const v = renderApp('/history/draft?year=2023&year=2023');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid');
    expect(read).not.toHaveBeenCalled();
    v.unmount();
    renderApp('/history/draft');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  });
});
