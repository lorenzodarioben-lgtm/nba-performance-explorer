// Provider-private game-log fixtures. Player identity and season-summary data stay in the
// other fixture modules; these records only reference the public player id, public game id,
// season id, team/opponent codes, and the per-game values. They are mapped to the shared
// `PlayerGame` model before leaving the provider and are never returned in this private shape.
//
// Coverage: LeBron James (2544) has multiple games in 2023-24 (authored out of date order, with
// home/away, win/loss, and a zero-valued statistic) and a second season of games in 2017-18;
// his 2018-19 season exists in the season fixtures but has no game records here (so the route
// returns an empty array, distinct from an unknown season). Victor Wembanyama (1641705) has
// exactly one 2023-24 game. Every team/opponent code is supported by the team fixtures.
export interface FixtureGame {
  playerId: string;
  gameId: string;
  season: string;
  gameDate: string;
  teamCode: string;
  opponentCode: string;
  location: 'home' | 'away';
  result: 'W' | 'L';
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
}

export const fixtureGames: readonly FixtureGame[] = [
  // LeBron James, 2023-24 (LAL) — deliberately not in chronological order.
  {
    playerId: '2544',
    gameId: 'lal-2023-12-25-bos',
    season: '2023-24',
    gameDate: '2023-12-25',
    teamCode: 'LAL',
    opponentCode: 'BOS',
    location: 'home',
    result: 'W',
    minutes: 35,
    points: 25,
    rebounds: 7,
    assists: 8,
  },
  {
    playerId: '2544',
    gameId: 'lal-2024-04-14-nop',
    season: '2023-24',
    gameDate: '2024-04-14',
    teamCode: 'LAL',
    opponentCode: 'NOP',
    location: 'home',
    result: 'W',
    minutes: 38,
    points: 28,
    rebounds: 11,
    assists: 17,
  },
  {
    playerId: '2544',
    gameId: 'lal-2024-01-15-den',
    season: '2023-24',
    gameDate: '2024-01-15',
    teamCode: 'LAL',
    opponentCode: 'DEN',
    location: 'away',
    result: 'L',
    minutes: 36,
    points: 30,
    rebounds: 8,
    assists: 0,
  },
  {
    playerId: '2544',
    gameId: 'lal-2024-04-09-gsw',
    season: '2023-24',
    gameDate: '2024-04-09',
    teamCode: 'LAL',
    opponentCode: 'GSW',
    location: 'away',
    result: 'L',
    minutes: 40,
    points: 33,
    rebounds: 9,
    assists: 10,
  },
  // LeBron James, 2017-18 (CLE) — a second season of games, oldest authored first.
  {
    playerId: '2544',
    gameId: 'cle-2018-03-11-phx',
    season: '2017-18',
    gameDate: '2018-03-11',
    teamCode: 'CLE',
    opponentCode: 'PHX',
    location: 'away',
    result: 'W',
    minutes: 38,
    points: 27,
    rebounds: 7,
    assists: 12,
  },
  {
    playerId: '2544',
    gameId: 'cle-2018-04-11-nyk',
    season: '2017-18',
    gameDate: '2018-04-11',
    teamCode: 'CLE',
    opponentCode: 'NYK',
    location: 'home',
    result: 'W',
    minutes: 30,
    points: 24,
    rebounds: 8,
    assists: 9,
  },
  // Victor Wembanyama, 2023-24 (SAS) — exactly one game.
  {
    playerId: '1641705',
    gameId: 'sas-2024-04-12-dal',
    season: '2023-24',
    gameDate: '2024-04-12',
    teamCode: 'SAS',
    opponentCode: 'DAL',
    location: 'home',
    result: 'L',
    minutes: 30,
    points: 27,
    rebounds: 14,
    assists: 5,
  },
];
