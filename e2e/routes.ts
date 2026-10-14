// One representative URL for every registered route template, plus home and the catch-all.
// Player routes use fixture identities that ship with demo mode; archive routes use the committed
// genuine datasets, so every page renders deterministically without network access to NBA.com.
export interface RouteExample {
  name: string;
  path: string;
}

export const routeExamples: readonly RouteExample[] = [
  { name: 'home', path: '/' },
  { name: 'players-landing', path: '/players' },
  { name: 'player-profile', path: '/players/201939' },
  { name: 'player-insights', path: '/players/2544/insights' },
  { name: 'player-games', path: '/players/2544/games?season=2023-24' },
  { name: 'player-career', path: '/players/201939/career' },
  { name: 'player-shooting', path: '/players/201939/shooting' },
  { name: 'compare', path: '/compare?player1=2544&player2=201939' },
  { name: 'explore', path: '/explore' },
  { name: 'teams', path: '/teams' },
  { name: 'team-detail', path: '/teams/nba:1610612744' },
  { name: 'games', path: '/games' },
  { name: 'game-detail', path: '/games/nba:0042300405' },
  { name: 'games-shooting', path: '/games/shooting' },
  { name: 'standings', path: '/standings' },
  { name: 'standings-recorded', path: '/standings/recorded' },
  { name: 'leaders', path: '/leaders' },
  { name: 'leaders-recorded', path: '/leaders/recorded' },
  { name: 'history', path: '/history' },
  { name: 'history-season', path: '/history/2023-24' },
  { name: 'history-records', path: '/history/records' },
  { name: 'history-calendar', path: '/history/calendar' },
  { name: 'history-awards', path: '/history/awards' },
  { name: 'history-draft', path: '/history/draft' },
  { name: 'history-progression', path: '/history/progression' },
  { name: 'labs-landing', path: '/labs' },
  {
    name: 'lab-compare',
    path: '/lab/compare?players=2544,201939&seasons=2023-24,2023-24',
  },
  {
    name: 'lab-analytics',
    path: '/lab/analytics?players=2544,201939&seasons=2023-24,2023-24',
  },
  { name: 'lab-careers', path: '/lab/careers?players=2544,201939' },
  { name: 'lab-teams', path: '/lab/teams' },
  { name: 'lab-groups', path: '/lab/groups' },
  { name: 'lab-recorded', path: '/lab/recorded' },
  { name: 'lab-profiles', path: '/lab/profiles' },
  { name: 'lab-shots', path: '/lab/shots?players=201939,201935' },
  { name: 'lab-lineups', path: '/lab/lineups' },
  { name: 'discover', path: '/discover?players=2544,201939&seasons=2023-24,2023-24' },
  { name: 'discover-recorded', path: '/discover/recorded' },
  { name: 'my-nba', path: '/my-nba' },
  // NBA 3.0
  { name: 'team-season', path: '/teams/nba:1610612738/season?focus=close&game=3' },
  { name: 'standings-race', path: '/standings/race?conference=West' },
  { name: 'playoff-bracket', path: '/games/bracket?series=r2-DEN-MIN' },
  { name: 'player-archive', path: '/players/203999/archive' },
  { name: 'lab-shots-zones', path: '/lab/shots?players=201939,2544&view=zones' },
  { name: 'not-found', path: '/this-route-does-not-exist' },
];
