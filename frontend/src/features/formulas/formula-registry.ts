// Every derived number the platform shows, in one registry: what it is, how it is computed,
// what happens when inputs are missing, a hand-checked example (the same numbers the unit tests
// assert) and where it is used. The computations themselves live in the backend domain modules
// named in `implementedIn`; this page explains them and never recomputes data.

export type FormulaArea = 'Player' | 'Team' | 'Playoffs' | 'Shots' | 'Cohorts';

export interface Formula {
  id: string;
  name: string;
  area: FormulaArea;
  formula: string;
  definition: string;
  missing: string;
  example: string;
  implementedIn: string;
  usedIn: readonly { to: string; label: string }[];
  /** Added in the 3.0 expansion. */
  added?: boolean;
}

export const FORMULAS: readonly Formula[] = [
  {
    id: 'efg',
    name: 'Effective field-goal percentage (eFG%)',
    area: 'Player',
    formula: '(FGM + 0.5 × 3PM) / FGA',
    definition:
      'Field-goal percentage that credits a made three with the extra half-point it is worth.',
    missing:
      'Needs raw makes and attempts; zero or missing FGA is unavailable. May exceed 100%.',
    example: 'FGM 35, 3PM 10, FGA 70 → (35 + 5) / 70 = 57.1%.',
    implementedIn: 'backend/src/features/research/efficiency.ts',
    usedIn: [
      { to: '/lab/analytics', label: 'Analytics lab' },
      { to: '/lab/shots', label: 'Shot Studio' },
    ],
  },
  {
    id: 'ts',
    name: 'True shooting estimate (TS%)',
    area: 'Player',
    formula: 'PTS / [2 × (FGA + 0.44 × FTA)]',
    definition:
      'Scoring per shooting chance, counting free-throw trips with the conventional 0.44 weight.',
    missing:
      'The 0.44 weight is an estimate, not counted possessions. Missing or zero denominator is unavailable.',
    example: 'PTS 100, FGA 70, FTA 20 → 100 / [2 × 78.8] = 63.5%.',
    implementedIn: 'backend/src/features/research/efficiency.ts',
    usedIn: [{ to: '/lab/analytics', label: 'Analytics lab' }],
  },
  {
    id: 'rolling-form',
    name: 'Rolling form',
    area: 'Player',
    formula: 'Mean of the trailing N matching games, including the row game',
    definition: 'How a player averaged over the last N recorded games at each point.',
    missing:
      'N is 1–20; early games use their actual, smaller sample, which is always shown.',
    example:
      'Points 10, 15, 25, 30 with N = 2 → 10, 12.5, 20, 27.5 (samples 1, 2, 2, 2).',
    implementedIn: 'backend/src/features/research/stats-core.ts',
    usedIn: [{ to: '/players', label: 'Player hub · Form' }],
  },
  {
    id: 'cohort-percentile',
    name: 'Cohort percentile',
    area: 'Cohorts',
    formula: '100 × (strictly lower + ½ × tied) / cohort size',
    definition:
      'The share of a stated, games-qualified group of recorded players below a value; ties count half.',
    missing:
      'Players without every category are outside the cohort, never plotted at zero. Higher is numerically higher, not better.',
    example: 'Values 1, 2, 2, 4 → the 2s sit at 100 × (1 + 1) / 4 = 50th percentile.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-profiles.ts',
    usedIn: [
      { to: '/lab/profiles', label: 'Percentile profiles' },
      { to: '/players', label: 'Player hub · 2023–24' },
    ],
  },
  {
    id: 'z-score',
    name: 'Cohort z-score',
    area: 'Cohorts',
    formula: '(value − cohort mean) / population SD',
    definition: 'How many standard deviations a value sits from the cohort mean.',
    missing: 'A constant category has z = 0. Same cohort for every category.',
    example: 'X = 10, 20, 30 → mean 20, SD √(200/3) ≈ 8.16, so 30 has z ≈ 1.22.',
    implementedIn: 'backend/src/features/research/cohort-core.ts',
    usedIn: [
      { to: '/lab/analytics', label: 'Analytics lab' },
      { to: '/discover/recorded', label: 'Group discovery' },
    ],
  },
  {
    id: 'similar-seasons',
    name: 'Similar recorded seasons',
    area: 'Cohorts',
    formula: '√ Σ (z_other − z_player)² over six per-game categories',
    definition:
      'Euclidean distance between two seasons’ z-scores for points, rebounds, assists, steals, blocks and minutes, equally weighted, inside one cohort.',
    missing:
      'Only players in the cohort have neighbours; each category difference is shown. A resemblance in box-score volume, not a quality or role judgement.',
    example: 'z differences +0.5, −0.4, +0.1, 0, −1.2, +2.5 → √8.11 ≈ 2.85.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-player-season.ts',
    usedIn: [{ to: '/players', label: 'Player hub · 2023–24' }],
    added: true,
  },
  {
    id: 'agreed-final',
    name: 'Source-agreed final',
    area: 'Team',
    formula:
      'Both team pages list the game with matching teams, date, venue sides and score',
    definition:
      'The rule every recorded 2023-24 team result passes before it counts toward anything.',
    missing:
      'Conflicting or one-sided games are quarantined: their slot and date stay, their score never counts.',
    example: 'Boston: 81 of 82 games agree, so its observed record is 63–18.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-provider.ts',
    usedIn: [
      { to: '/standings/recorded', label: 'Team rankings' },
      { to: '/teams', label: 'Team seasons' },
    ],
  },
  {
    id: 'rest-days',
    name: 'Rest days and back-to-backs',
    area: 'Team',
    formula: 'Calendar days between consecutive source-listed games − 1',
    definition:
      'Zero rest days is the second game of a back-to-back. Travel and tipoff times are unknown.',
    missing: 'Withheld for the whole season if two schedule games share a date.',
    example: 'Games on Jan 1, 2 and 4 → rest 0 (back-to-back), then 1.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-team-season.ts',
    usedIn: [{ to: '/teams', label: 'Team season · splits' }],
    added: true,
  },
  {
    id: 'rolling-margin',
    name: 'Ten-game rolling margin',
    area: 'Team',
    formula: 'Mean final margin over the last ten schedule games',
    definition: 'A team’s recent scoring difference, game by game.',
    missing: 'Unavailable unless all ten games in the window are verified.',
    example: 'Margins summing to +99 over ten verified games → +9.9.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-team-season.ts',
    usedIn: [{ to: '/teams', label: 'Team season · record path' }],
    added: true,
  },
  {
    id: 'streaks',
    name: 'Win and losing streaks',
    area: 'Team',
    formula: 'Maximal runs of the same result in schedule order',
    definition: 'Longest consecutive wins or losses.',
    missing:
      'A run ends at an unverified game: a streak is never bridged across an unknown result.',
    example: 'W W L W W ? W → runs W2, L1, W2, W1 (the ? splits them).',
    implementedIn: 'backend/src/features/recorded-archive/recorded-team-season.ts',
    usedIn: [{ to: '/teams', label: 'Team season' }],
    added: true,
  },
  {
    id: 'close-decisive',
    name: 'Close and decisive games',
    area: 'Team',
    formula: '|final margin| ≤ 5 (close); ≥ 15 (decisive)',
    definition: 'Game types by final-score difference, overtime included.',
    missing: 'Final margin only; the largest in-game lead is not in the source.',
    example: 'A 105–104 overtime win is close; a 120–100 win is decisive.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-team-season.ts',
    usedIn: [{ to: '/teams', label: 'Team season · splits' }],
    added: true,
  },
  {
    id: 'opponent-quality',
    name: 'Record against winning and losing teams',
    area: 'Team',
    formula:
      'Split by the opponent’s observed season win % (> .500 winning, < .500 losing)',
    definition:
      'How a team fared against opponents that finished above or below .500 in their own source-agreed games.',
    missing:
      'The opponent’s record includes its games against this team. Opponents at exactly .500 belong to neither group.',
    example: 'Boston 2023–24: 32–15 against winning teams, 31–3 against losing teams.',
    implementedIn: 'backend/src/features/recorded-archive/recorded-team-season.ts',
    usedIn: [{ to: '/teams', label: 'Team season · splits' }],
    added: true,
  },
  {
    id: 'games-behind',
    name: 'Games behind (observed)',
    area: 'Team',
    formula: '[(leader W − team W) + (team L − leader L)] / 2',
    definition: 'Distance from the observed leader on a race date.',
    missing:
      'Computed from observed (agreed) records, so it can differ from the published figure. No official tiebreakers.',
    example: 'Leader 3–1, team 1–2 → [(3 − 1) + (2 − 1)] / 2 = 1.5.',
    implementedIn: 'frontend/src/features/team-season/race-standings.ts',
    usedIn: [{ to: '/standings/race', label: 'Standings race' }],
    added: true,
  },
  {
    id: 'series-winner',
    name: 'Series winner and round',
    area: 'Playoffs',
    formula: 'A team’s fourth win in the series’ final recorded game',
    definition:
      'A series is every recorded game between two teams. Rounds come from each team’s own order of series and are cross-checked against the round digit in NBA game IDs. Seeds are read from the source page’s series headings only when every team keeps one seed and seeds are unique within a conference.',
    missing:
      'A series that does not end on a fourth win is incomplete and names no winner; the bracket then shows series by round without a tree.',
    example: 'Games won A, B, A, A, A → A wins 4–1 in five.',
    implementedIn: 'backend/src/features/wiki-archive/playoff-series.ts',
    usedIn: [{ to: '/games/bracket', label: 'Playoff bracket' }],
    added: true,
  },
  {
    id: 'shot-zone',
    name: 'Zone FG% and points per attempt',
    area: 'Shots',
    formula: 'Makes / attempts; (2 × makes + made threes) / attempts',
    definition:
      'Shooting by the source’s own zone label, never reassigned from coordinates.',
    missing:
      'Ratios are withheld below the minimum-attempts rule (default 10); counts remain.',
    example: '57 restricted-area attempts, 43 makes → FG 75.4%.',
    implementedIn: 'backend/src/features/shot-archive/shot-provider.ts',
    usedIn: [{ to: '/lab/shots?view=zones', label: 'Shot Studio · Zones' }],
  },
  {
    id: 'shot-distance',
    name: 'Shot distance profile',
    area: 'Shots',
    formula:
      'Attempts and makes in 3-foot bins of the source distance field (0–2 … 27–29, 30+)',
    definition:
      'Where a player’s attempts come from, with the three-point share of each bin.',
    missing:
      'Every filtered attempt counts once; FG% follows the minimum-attempts rule.',
    example: 'Curry 2018 playoffs: 261 attempts, mean source distance 17.3 ft.',
    implementedIn: 'backend/src/features/shot-archive/shot-provider.ts',
    usedIn: [{ to: '/lab/shots', label: 'Shot Studio' }],
    added: true,
  },
];

export const AREAS: readonly FormulaArea[] = [
  'Player',
  'Team',
  'Playoffs',
  'Shots',
  'Cohorts',
];
