import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  LeagueTeamResponseSchema,
  type LeagueTeamResponse,
} from '@nba-performance-explorer/contracts';

import { renderApp } from '../../test/renderApp';
import { server } from '../../test/server';
import { leagueFixture } from '../wiki-archive/archive-fixtures';
// Compile the subject before assertion timers; the app still renders its actual lazy route.
import '../teams/TeamsPage';

const team = { id: 'nba:1610612766', abbreviation: 'CHA', name: 'Charlotte Hornets' };
const box = (scale: number) =>
  [
    ['pts', 'Points', 7923],
    ['fgm', 'Field goals made', 2968],
    ['fga', 'Field goals attempted', 6344],
    ['tov', 'Turnovers', null],
  ].map(([key, label, total]) => ({
    key: key as string,
    label: label as string,
    total: total === null ? null : (total as number) * scale,
    perGame: total === null ? null : ((total as number) * scale) / 82,
  }));
function response(season: string, withRatings: boolean): LeagueTeamResponse {
  return {
    team,
    franchise: {
      founded: 1988,
      arena: 'Fixture Arena',
      identities: [
        {
          city: 'Charlotte',
          name: 'Hornets',
          firstSeason: '1988-89',
          lastSeason: '2001-02',
          seasons: 14,
        },
        {
          city: 'Charlotte',
          name: 'Bobcats',
          firstSeason: '2004-05',
          lastSeason: '2013-14',
          seasons: 10,
        },
      ],
      totals: {
        games: 2877,
        wins: 1237,
        losses: 1640,
        playoffAppearances: 10,
        divisionTitles: 0,
        conferenceTitles: 0,
        leagueTitles: 0,
      },
      championships: [],
      conferenceTitles: [],
      divisionTitles: [],
      seasons: [
        {
          season: '1997-98',
          name: 'Charlotte Hornets',
          wins: 51,
          losses: 31,
          winPercentage: 51 / 82,
          conferenceRank: 4,
          divisionRank: 3,
          playoffWins: 4,
          playoffLosses: 5,
          finals: null,
          archived: true,
        },
        {
          season: '1985-86',
          name: 'Fixture Name',
          wins: 1,
          losses: 1,
          winPercentage: 0.5,
          conferenceRank: null,
          divisionRank: null,
          playoffWins: null,
          playoffLosses: null,
          finals: 'LEAGUE CHAMPION',
          archived: false,
        },
      ],
      notable: [{ label: 'Best record', value: '54–28 (.659)', seasons: ['1996-97'] }],
    },
    seasons: ['1990-91', '1997-98'],
    season: {
      season,
      team: { ...team, abbreviation: 'CHH' },
      record: {
        overall: { wins: 51, losses: 31 },
        home: { wins: 32, losses: 9 },
        road: { wins: 19, losses: 22 },
        neutral: { wins: 0, losses: 0 },
      },
      standing: {
        conference: 'East',
        rank: 4,
        division: 'Central',
        divisionRank: 3,
        gamesBehind: 11,
      },
      playoffs: { wins: 4, losses: 5, games: 9 },
      totals: { team: box(1), opponent: box(0.98) },
      shooting: {
        team: {
          fieldGoal: 0.468,
          threePoint: 0.383,
          freeThrow: 0.751,
          effectiveFieldGoal: 0.495,
          trueShooting: 0.542,
        },
        opponent: {
          fieldGoal: 0.464,
          threePoint: null,
          freeThrow: 0.731,
          effectiveFieldGoal: null,
          trueShooting: 0.533,
        },
      },
      ratings: withRatings
        ? {
            offRating: 105.5,
            defRating: 103.3,
            netRating: 2.2,
            pace: 91.13,
            possessions: 7511,
          }
        : null,
      ratingsNote: withRatings
        ? 'NBA.com’s published ratings.'
        : 'NBA.com publishes no team ratings for this season, and this app does not estimate possessions.',
      leaders: [
        {
          key: 'pts',
          label: 'Points',
          rows: [
            {
              playerId: '779',
              name: 'Fixture Scorer',
              gamesPlayed: 82,
              total: 1826,
              perGame: 22.3,
            },
          ],
        },
      ],
      roster: withRatings
        ? {
            listed: 11,
            appeared: 15,
            listedWhoAppeared: 11,
            positions: [{ label: 'G', count: 5 }],
            experience: [{ label: 'Rookie', count: 2 }],
            age: { min: 22, median: 28, max: 34, known: 11 },
            players: [
              {
                playerId: '779',
                name: 'Fixture Scorer',
                number: '41',
                position: 'F',
                age: 30,
                experience: '8',
                gamesPlayed: 82,
              },
            ],
            coaches: ['Fixture Coach (Head Coach)'],
          }
        : null,
    },
    provenance: {
      source: 'nba-stats',
      mode: 'committed-snapshot',
      servedAt: '2026-10-16T00:00:00.000Z',
      retrievedAt: '2026-10-15T20:00:00.000Z',
      sourceUpdatedAt: null,
      coverage: 'Fixture team coverage.',
      warnings: [],
    },
  };
}

function serve(requests: string[]) {
  server.use(
    http.get('http://localhost/api/teams/:teamId', () =>
      HttpResponse.json({
        team: {
          id: team.id,
          sourceId: '1610612766',
          abbreviation: 'CHA',
          name: 'Charlotte Hornets',
        },
        provenance: leagueFixture.provenance,
        availability: {
          roster: false,
          schedule: false,
          statistics: false,
          reason: 'No live season feed.',
        },
      }),
    ),
    http.get('http://localhost/api/league/teams/:teamId', ({ request }) => {
      const season = new URL(request.url).searchParams.get('season') ?? '1997-98';
      requests.push(season);
      return HttpResponse.json(response(season, season !== '1990-91'));
    }),
  );
}

describe('team page NBA.com sections', () => {
  it('uses a contract-valid fixture', () => {
    expect(
      LeagueTeamResponseSchema.safeParse(response('1997-98', true)).error?.issues ?? [],
    ).toEqual([]);
  });

  it('shows the season’s record, shooting, ratings, leaders, roster and franchise periods', async () => {
    const requests: string[] = [];
    serve(requests);
    renderApp('/teams/nba:1610612766?season=1997-98');
    expect(
      await screen.findByRole('heading', { name: 'Charlotte Hornets, 1997–98' }),
    ).toBeInTheDocument();
    expect(screen.getByText('105.5')).toBeInTheDocument();
    const totals = screen.getByRole('group', { name: 'Team and opponent box totals' });
    // A field the source did not record is shown as such, never as zero.
    expect(within(totals).getAllByText('Not recorded')).toHaveLength(2);
    // Linked from the leaders and from the roster.
    expect(screen.getAllByRole('link', { name: 'Fixture Scorer' })[0]).toHaveAttribute(
      'href',
      '/players/779',
    );
    expect(
      screen.getByText(/NBA.com lists 11 players for this season/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Charlotte Bobcats/)).toBeInTheDocument();
    const seasons = screen.getByRole('group', { name: 'Franchise seasons' });
    expect(within(seasons).getByText('Champion')).toBeInTheDocument();
    // Archived seasons open in place; others are plain text.
    expect(within(seasons).queryByRole('button', { name: '1985–86' })).toBeNull();
    // The page's 2023–24 archive panels accept the season parameter instead of rejecting it.
    expect(screen.queryByText(/Invalid historical team filters/)).toBeNull();
    expect(screen.queryByText('Invalid team-season filters.')).toBeNull();
  });

  it('switches seasons and states missing ratings and rosters', async () => {
    const requests: string[] = [];
    serve(requests);
    renderApp('/teams/nba:1610612766?season=1997-98');
    fireEvent.change(await screen.findByLabelText('Season'), {
      target: { value: '1990-91' },
    });
    await waitFor(() => expect(requests).toContain('1990-91'));
    expect(
      await screen.findByText(/does not estimate possessions/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No NBA.com roster list is archived for this season.'),
    ).toBeInTheDocument();
  });

  it('rejects a malformed season without calling the archive', async () => {
    const requests: string[] = [];
    serve(requests);
    renderApp('/teams/nba:1610612766?season=1997');
    expect(await screen.findByText(/not a valid season label/)).toBeInTheDocument();
    expect(requests).toEqual([]);
  });
});
