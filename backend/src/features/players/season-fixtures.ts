// Provider-private season statistics fixtures. Player identity/profile data stays in the
// other fixture modules; these records only carry the public player id, the season, the
// team code for that season, and the raw statistical values. They are mapped to the shared
// domain models before leaving the provider and never returned in this private shape.
//
// Coverage: LeBron James (2544) has three seasons authored out of order (and a team change
// from CLE to LAL) to exercise the provider's deterministic newest-first sort; Stephen Curry
// (201939) has three seasons including a valid zero-valued statistic and two seasons that
// overlap LeBron's (2023-24 and 2017-18) for multi-season comparison; Kevin Durant (201142)
// has a single 2021-22 season with Brooklyn (BKN) that overlaps no other player, giving a
// genuine no-common-season comparison pair and a team change from his Phoenix profile; Victor
// Wembanyama (1641705) has exactly one season. Players without any record here (for example
// Terance Mann, 1629611) represent a known player with no season data.
export interface FixtureSeasonStat {
  playerId: string;
  season: string;
  franchiseCode: string;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
}

export const fixtureSeasons: readonly FixtureSeasonStat[] = [
  // LeBron James — deliberately not in chronological order.
  {
    playerId: '2544',
    season: '2018-19',
    franchiseCode: 'LAL',
    gamesPlayed: 55,
    minutesPerGame: 35.2,
    pointsPerGame: 27.4,
    reboundsPerGame: 8.5,
    assistsPerGame: 8.3,
    stealsPerGame: 1.3,
    blocksPerGame: 0.6,
    turnoversPerGame: 3.6,
    fieldGoalPercentage: 0.51,
    threePointPercentage: 0.339,
    freeThrowPercentage: 0.665,
  },
  {
    playerId: '2544',
    season: '2023-24',
    franchiseCode: 'LAL',
    gamesPlayed: 71,
    minutesPerGame: 35.3,
    pointsPerGame: 25.7,
    reboundsPerGame: 7.3,
    assistsPerGame: 8.3,
    stealsPerGame: 1.3,
    blocksPerGame: 0.5,
    turnoversPerGame: 3.5,
    fieldGoalPercentage: 0.54,
    threePointPercentage: 0.41,
    freeThrowPercentage: 0.75,
  },
  {
    playerId: '2544',
    season: '2017-18',
    franchiseCode: 'CLE',
    gamesPlayed: 82,
    minutesPerGame: 36.9,
    pointsPerGame: 27.5,
    reboundsPerGame: 8.6,
    assistsPerGame: 9.1,
    stealsPerGame: 1.4,
    blocksPerGame: 0.9,
    turnoversPerGame: 4.2,
    fieldGoalPercentage: 0.542,
    threePointPercentage: 0.367,
    freeThrowPercentage: 0.731,
  },
  // Stephen Curry — three seasons authored out of order; 2022-23 has a valid zero, and
  // 2023-24 and 2017-18 overlap LeBron for a multi-season comparison pair.
  {
    playerId: '201939',
    season: '2022-23',
    franchiseCode: 'GSW',
    gamesPlayed: 56,
    minutesPerGame: 34.7,
    pointsPerGame: 29.4,
    reboundsPerGame: 6.1,
    assistsPerGame: 6.3,
    stealsPerGame: 0.9,
    blocksPerGame: 0,
    turnoversPerGame: 3.2,
    fieldGoalPercentage: 0.493,
    threePointPercentage: 0.427,
    freeThrowPercentage: 0.915,
  },
  {
    playerId: '201939',
    season: '2023-24',
    franchiseCode: 'GSW',
    gamesPlayed: 74,
    minutesPerGame: 32.7,
    pointsPerGame: 26.4,
    reboundsPerGame: 4.5,
    assistsPerGame: 5.1,
    stealsPerGame: 0.7,
    blocksPerGame: 0.4,
    turnoversPerGame: 2.8,
    fieldGoalPercentage: 0.45,
    threePointPercentage: 0.408,
    freeThrowPercentage: 0.923,
  },
  {
    playerId: '201939',
    season: '2017-18',
    franchiseCode: 'GSW',
    gamesPlayed: 51,
    minutesPerGame: 32,
    pointsPerGame: 26.4,
    reboundsPerGame: 5.1,
    assistsPerGame: 6.1,
    stealsPerGame: 1.6,
    blocksPerGame: 0.2,
    turnoversPerGame: 3,
    fieldGoalPercentage: 0.495,
    threePointPercentage: 0.423,
    freeThrowPercentage: 0.921,
  },
  // Kevin Durant — a single 2021-22 season with Brooklyn (BKN), overlapping no other player
  // so any pairing with him exercises the no-common-season state, and showing a team change
  // from his Phoenix (PHX) profile.
  {
    playerId: '201142',
    season: '2021-22',
    franchiseCode: 'BKN',
    gamesPlayed: 55,
    minutesPerGame: 37.2,
    pointsPerGame: 29.9,
    reboundsPerGame: 7.4,
    assistsPerGame: 6.4,
    stealsPerGame: 0.9,
    blocksPerGame: 0.9,
    turnoversPerGame: 3.5,
    fieldGoalPercentage: 0.518,
    threePointPercentage: 0.383,
    freeThrowPercentage: 0.91,
  },
  // Victor Wembanyama — exactly one season.
  {
    playerId: '1641705',
    season: '2023-24',
    franchiseCode: 'SAS',
    gamesPlayed: 71,
    minutesPerGame: 29.7,
    pointsPerGame: 21.4,
    reboundsPerGame: 10.6,
    assistsPerGame: 3.9,
    stealsPerGame: 1.2,
    blocksPerGame: 3.6,
    turnoversPerGame: 3.7,
    fieldGoalPercentage: 0.465,
    threePointPercentage: 0.325,
    freeThrowPercentage: 0.796,
  },
];
