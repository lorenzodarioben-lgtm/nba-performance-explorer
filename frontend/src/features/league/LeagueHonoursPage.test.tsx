import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueHonoursResponseSchema,
  type LeagueHonoursResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import './LeagueHonoursPage';

const team = (n: number, abbreviation: string, name: string) => ({
  id: `nba:${1610612700 + n}`,
  abbreviation,
  name,
});
const agree = (detail: string) => ({ agrees: true, detail });
const honours: LeagueHonoursResponse = {
  champions: [
    {
      season: '2015-16',
      champion: team(39, 'CLE', 'Cleveland Cavaliers'),
      runnerUp: team(44, 'GSW', 'Golden State Warriors'),
      wins: 4,
      losses: 3,
      firstGame: 'nba:0041500401',
      lastGame: 'nba:0041500407',
      finalsMvp: { playerId: '2544', name: 'Fixture Forward' },
      checks: {
        franchiseTitles: agree('NBA.com lists a 2016 title.'),
        franchiseSeason: agree('LEAGUE CHAMPION'),
        finalsMvpTeam: { agrees: null, detail: 'Wikipedia lists no Finals MVP team.' },
      },
    },
    {
      season: '1984-85',
      champion: team(47, 'LAL', 'Los Angeles Lakers'),
      runnerUp: team(38, 'BOS', 'Boston Celtics'),
      wins: 4,
      losses: 2,
      firstGame: 'nba:0048400401',
      lastGame: 'nba:0048400406',
      finalsMvp: null,
      checks: {
        franchiseTitles: { agrees: false, detail: 'Fixture disagreement.' },
        franchiseSeason: agree('LEAGUE CHAMPION'),
        finalsMvpTeam: agree('Los Angeles Lakers'),
      },
    },
  ],
  unsettled: [],
  awards: [
    {
      id: 'mvp',
      label: 'Most Valuable Player',
      since: '1955-56',
      winners: [
        {
          season: '2022-23',
          playerId: '203954',
          name: 'Fixture Center',
          team: 'Philadelphia 76ers',
        },
      ],
    },
    {
      id: 'roy',
      label: 'Rookie of the Year',
      since: '1952-53',
      winners: [
        {
          season: '1994-95',
          playerId: '255',
          name: 'Fixture Wing',
          team: 'Detroit Pistons',
        },
        {
          season: '1994-95',
          playerId: '467',
          name: 'Fixture Guard',
          team: 'Dallas Mavericks',
        },
      ],
    },
  ],
  notes: ['2001-02 mip: fixture note.'],
  sources: [
    {
      label: 'Wikipedia: fixture (revision 1)',
      url: 'https://en.wikipedia.org/w/index.php?title=Fixture&oldid=1',
      retrievedAt: '2026-10-16T00:00:00.000Z',
    },
  ],
  provenance: {
    source: 'nba-stats',
    mode: 'committed-snapshot',
    servedAt: '2026-10-16T00:00:00.000Z',
    retrievedAt: '2026-10-16T00:00:00.000Z',
    sourceUpdatedAt: null,
    coverage: 'Fixture.',
    warnings: [],
  },
};
const serve = () =>
  server.use(
    http.get('http://localhost/api/league/honours', () => HttpResponse.json(honours)),
  );

describe('champions and awards page', () => {
  it('uses a contract-valid fixture', () => {
    expect(LeagueHonoursResponseSchema.safeParse(honours).error?.issues ?? []).toEqual(
      [],
    );
  });

  it('lists champions with their checks, flags disagreements and switches awards', async () => {
    serve();
    renderApp('/history/champions');
    const table = await screen.findByRole('group', { name: 'Champions' });
    const cle = within(table).getByRole('row', { name: /2015–16/ });
    expect(cle).toHaveTextContent('4–3');
    expect(cle).toHaveTextContent('No record');
    expect(within(cle).getByRole('link', { name: 'Fixture Forward' })).toHaveAttribute(
      'href',
      '/players/2544/records',
    );
    const lal = within(table).getByRole('row', { name: /1984–85/ });
    expect(lal).toHaveTextContent('Not confirmed');
    expect(lal).toHaveTextContent('Disagrees');
    expect(
      screen.getByText(/1 season where a record disagrees: 1984–85/),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('group', { name: 'Most Valuable Player winners' }),
    ).toHaveTextContent('Fixture Center');
    fireEvent.change(screen.getByLabelText('Award'), { target: { value: 'roy' } });
    const roy = await screen.findByRole('group', {
      name: 'Rookie of the Year winners',
    });
    // A tie lists both winners.
    expect(within(roy).getAllByRole('row')).toHaveLength(3);
    expect(roy).toHaveTextContent('before the archive');
    expect(screen.getByText('2001-02 mip: fixture note.')).toBeInTheDocument();
  });

  it('rejects unsupported links', async () => {
    serve();
    renderApp('/history/champions?award=nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
  });
});
