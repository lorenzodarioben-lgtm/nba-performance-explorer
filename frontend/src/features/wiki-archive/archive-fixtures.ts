// Synthetic test data only. Production routes never import this module.
import type {
  ArchiveGamesResponse,
  ArchiveLeagueResponse,
  DirectoryTeam,
} from '@nba-performance-explorer/contracts';
export const awayTeam: DirectoryTeam = {
  id: 'nba:1610612738',
  sourceId: '1610612738',
  abbreviation: 'BOS',
  name: 'Boston Celtics',
};
export const homeTeam: DirectoryTeam = {
  id: 'nba:1610612747',
  sourceId: '1610612747',
  abbreviation: 'LAL',
  name: 'Los Angeles Lakers',
};
const provenance = {
  source: 'fixture' as const,
  servedAt: '2026-10-13T21:00:00.000Z',
  retrievedAt: '2026-10-13T21:00:00.000Z',
  asOf: null,
  isLive: false as const,
  scope: 'regular-season' as const,
  coverage: 'Synthetic test snapshot only.',
  warnings: ['DEMO FIXTURES'],
};
const attribution = {
  title: 'Synthetic test snapshot',
  revision: 1234,
  url: 'https://en.wikipedia.org/w/index.php?oldid=1234',
  license: 'CC BY-SA 4.0' as const,
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' as const,
  adapted: true as const,
};
export const leagueFixture: ArchiveLeagueResponse = {
  season: '2023-24',
  scope: 'regular-season',
  attribution,
  provenance,
  standings: Array.from({ length: 30 }, (_, i) => ({
    conference: i < 15 ? ('East' as const) : ('West' as const),
    rank: (i % 15) + 1,
    team:
      i === 0
        ? awayTeam
        : i === 15
          ? homeTeam
          : {
              id: `nba:${1610612800 + i}`,
              sourceId: String(1610612800 + i),
              abbreviation: `F${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
              name: `Fixture team ${i}`,
            },
    wins: 41,
    losses: 41,
    gamesPlayed: 82,
    winPercentage: 0.5,
    sourcePercentage: 0.5,
    gamesBehind: 0,
  })),
  leaders: [
    {
      scope: 'player',
      category: 'FG%',
      name: 'Fixture player A',
      teamLabel: 'Fixture team',
      value: 50,
      unit: '%',
      articleUrl: null,
    },
    {
      scope: 'player',
      category: 'FG%',
      name: 'Fixture player B',
      teamLabel: 'Fixture team',
      value: 50,
      unit: '%',
      articleUrl: null,
    },
    {
      scope: 'team',
      category: '+/−',
      name: 'Fixture team',
      teamLabel: null,
      value: -1.2,
      unit: 'source-defined',
      articleUrl: null,
    },
  ],
};
export const gamesFixture: ArchiveGamesResponse = {
  season: '2023-24',
  scope: 'playoffs',
  attribution,
  provenance: { ...provenance, scope: 'playoffs' },
  recordedGames: 2,
  firstDate: '2024-04-21',
  lastDate: '2024-04-22',
  games: [
    {
      id: 'nba:0042300101',
      sourceId: '0042300101',
      season: '2023-24',
      scope: 'playoffs',
      date: '2024-04-21',
      status: 'final',
      away: awayTeam,
      home: homeTeam,
      awayScore: 95,
      homeScore: 110,
      tipoffUtc: null,
      reportedTime: null,
      venue: null,
      quarters: [
        { period: 1, away: 20, home: 25 },
        { period: 2, away: 20, home: 25 },
        { period: 3, away: 20, home: 25 },
        { period: 4, away: 20, home: 25 },
        { period: 5, away: 15, home: 10 },
      ],
      leaders: [
        {
          teamId: awayTeam.id,
          points: 'Fixture player A 20',
          rebounds: 'Two players 8 each',
          assists: null,
        },
        {
          teamId: homeTeam.id,
          points: 'Fixture player B 30',
          rebounds: null,
          assists: 'Fixture player C 7',
        },
      ],
      recapUrl: 'https://www.nba.com/game/bos-vs-lal-0042300101',
    },
    {
      id: 'nba:0042300102',
      sourceId: '0042300102',
      season: '2023-24',
      scope: 'playoffs',
      date: '2024-04-22',
      status: 'final',
      away: homeTeam,
      home: awayTeam,
      awayScore: 80,
      homeScore: 100,
      tipoffUtc: null,
      reportedTime: null,
      venue: null,
      quarters: [
        { period: 1, away: 20, home: 25 },
        { period: 2, away: 20, home: 25 },
        { period: 3, away: 20, home: 25 },
        { period: 4, away: 20, home: 25 },
      ],
      leaders: [
        { teamId: homeTeam.id, points: null, rebounds: null, assists: null },
        { teamId: awayTeam.id, points: null, rebounds: null, assists: null },
      ],
      recapUrl: 'https://www.nba.com/game/lal-vs-bos-0042300102',
    },
  ],
};
