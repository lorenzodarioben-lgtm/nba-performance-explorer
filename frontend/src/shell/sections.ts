// The platform's information architecture: six sections plus My NBA. Every existing URL keeps
// working; this only decides which section a route belongs to and what its sub-navigation is.

export type SectionId = 'players' | 'teams' | 'games' | 'seasons' | 'compare' | 'labs';

export interface SectionPage {
  to: string;
  label: string;
  /** Plain description used by the menu, search and landing pages. */
  blurb: string;
  match: (pathname: string) => boolean;
}

export interface Section {
  id: SectionId;
  label: string;
  to: string;
  blurb: string;
  pages: readonly SectionPage[];
}

const exact = (path: string) => (pathname: string) => pathname === path;
const SEASON_BOOK = new Set([
  'records',
  'progression',
  'awards',
  'draft',
  'calendar',
  'record-book',
]);

export const SECTIONS: readonly Section[] = [
  {
    id: 'players',
    label: 'Players',
    to: '/players',
    blurb: 'Profiles, form, game logs, careers and shooting for any player.',
    pages: [],
  },
  {
    id: 'teams',
    label: 'Teams',
    to: '/teams',
    blurb: 'Franchise directory and team hubs with recorded seasons.',
    pages: [],
  },
  {
    id: 'games',
    label: 'Games',
    to: '/games',
    blurb:
      'The scoreboard, box scores and play-by-play, the 2024 playoffs and game shooting.',
    pages: [
      {
        to: '/games',
        label: 'Scoreboard',
        blurb:
          'Games on any date since 1983–84 and NBA.com’s current schedule, with box scores and play-by-play.',
        match: (pathname) =>
          pathname === '/games' || /^\/games\/nba:00(?!423)/.test(pathname),
      },
      {
        to: '/games/recorded',
        label: 'Playoff games',
        blurb: 'Recorded 2023-24 playoff results by date, with quarter line scores.',
        match: (pathname) =>
          pathname === '/games/recorded' || /^\/games\/nba:00423/.test(pathname),
      },
      {
        to: '/games/bracket',
        label: 'Playoff bracket',
        blurb: 'The 2024 playoffs as series and a bracket, built from recorded games.',
        match: exact('/games/bracket'),
      },
      {
        to: '/games/series/r4-BOS-DAL',
        label: 'Series film room',
        blurb:
          'One 2024 playoff series game by game: margins, quarters and the series score.',
        match: (pathname) => pathname.startsWith('/games/series/'),
      },
      {
        to: '/history/calendar',
        label: 'Game calendar',
        blurb: 'Every recorded game on a date, from the season archive.',
        match: exact('/history/calendar'),
      },
      {
        to: '/games/shooting',
        label: 'Game shooting',
        blurb: 'Team shooting splits from the archived 2018 playoff shot events.',
        match: exact('/games/shooting'),
      },
    ],
  },
  {
    id: 'seasons',
    label: 'Seasons',
    to: '/history',
    blurb: 'The season archive: standings, leaders, records, awards and drafts.',
    pages: [
      {
        to: '/history',
        label: 'Seasons',
        blurb: 'Every season in the archive, with champions and facts.',
        match: (pathname) =>
          pathname === '/history' ||
          (pathname.startsWith('/history/') &&
            !SEASON_BOOK.has(pathname.slice('/history/'.length))),
      },
      {
        to: '/standings',
        label: 'Standings',
        blurb: 'East and West standings for every season since 1983–84, from NBA.com.',
        match: (pathname) =>
          pathname === '/standings' || pathname === '/standings/wikipedia',
      },
      {
        to: '/standings/recorded',
        label: 'Team rankings',
        blurb: 'Team records, splits and rankings calculated from recorded games.',
        match: exact('/standings/recorded'),
      },
      {
        to: '/standings/race',
        label: 'Standings race',
        blurb: 'Replay the 2023-24 season date by date as the ladder reorders.',
        match: exact('/standings/race'),
      },
      {
        to: '/leaders',
        label: 'Leaders',
        blurb:
          'Every player ranked by season, rate and qualification, from NBA.com box scores.',
        match: (pathname) =>
          pathname === '/leaders' || pathname === '/leaders/wikipedia',
      },
      {
        to: '/leaders/movement',
        label: 'Leader movement',
        blurb:
          'The league leaderboard rebuilt for every game date: who led on any day.',
        match: exact('/leaders/movement'),
      },
      {
        to: '/leaders/teams',
        label: 'Team leaders',
        blurb:
          'Every team in a season ranked on records, scoring, shooting, ratings and pace.',
        match: exact('/leaders/teams'),
      },
      {
        to: '/history/eras',
        label: 'Eras',
        blurb:
          'The league season by season since 1983–84, and players against their own league.',
        match: exact('/history/eras'),
      },
      {
        to: '/history/record-book',
        label: 'Record book',
        blurb:
          'Best single games and seasons since 1983–84, and how each record moved.',
        match: exact('/history/record-book'),
      },
      {
        to: '/leaders/recorded',
        label: 'Recorded leaders',
        blurb: 'Leaderboards ranked within a recorded group of players.',
        match: exact('/leaders/recorded'),
      },
      {
        to: '/history/records',
        label: 'Single-game records',
        blurb: 'The highest and lowest recorded single-game performances.',
        match: exact('/history/records'),
      },
      {
        to: '/history/progression',
        label: 'Record progression',
        blurb: 'How recorded season records and league trends moved over time.',
        match: exact('/history/progression'),
      },
      {
        to: '/history/awards',
        label: 'Awards',
        blurb: 'Yearly award winners from the archive.',
        match: exact('/history/awards'),
      },
      {
        to: '/history/draft',
        label: 'Draft',
        blurb: 'Historical draft classes, pick by pick.',
        match: exact('/history/draft'),
      },
    ],
  },
  {
    id: 'compare',
    label: 'Compare',
    to: '/compare',
    blurb: 'Head-to-head, multi-player, career-curve and team comparisons.',
    pages: [
      {
        to: '/compare',
        label: 'Head to head',
        blurb: 'Two players, one season, side by side.',
        match: exact('/compare'),
      },
      {
        to: '/compare/recorded',
        label: 'Comparison studio',
        blurb:
          'Two to four recorded 2023-24 seasons on one gap board, with plain statements.',
        match: exact('/compare/recorded'),
      },
      {
        to: '/lab/compare',
        label: 'Player lab',
        blurb: 'Up to four player-seasons on shared scales.',
        match: exact('/lab/compare'),
      },
      {
        to: '/lab/careers',
        label: 'Career curves',
        blurb: 'Careers aligned by season, age or experience.',
        match: exact('/lab/careers'),
      },
      {
        to: '/lab/profiles',
        label: 'Percentile profiles',
        blurb: 'Players placed within a recorded group, stat by stat.',
        match: exact('/lab/profiles'),
      },
      {
        to: '/lab/teams',
        label: 'Team vs team',
        blurb: 'Two recorded team seasons compared.',
        match: exact('/lab/teams'),
      },
    ],
  },
  {
    id: 'labs',
    label: 'Labs',
    to: '/labs',
    blurb: 'Shot Studio, lineups, group analytics and discovery tools.',
    pages: [
      {
        to: '/labs',
        label: 'All labs',
        blurb: 'Every research tool in one place.',
        match: exact('/labs'),
      },
      {
        to: '/lab/workbench',
        label: 'Workbench',
        blurb:
          'Rank, distribute or relate any recorded player or team metric, with the cohort shown.',
        match: exact('/lab/workbench'),
      },
      {
        to: '/lab/shots',
        label: 'Shot Studio',
        blurb: 'Archived 2018 playoff shot charts: dots, density and zones.',
        match: exact('/lab/shots'),
      },
      {
        to: '/lab/lineups',
        label: 'Lineups',
        blurb: 'Researcher-derived five-player units: minutes and plus-minus.',
        match: exact('/lab/lineups'),
      },
      {
        to: '/lab/lineups/nba',
        label: 'NBA.com lineups',
        blurb: 'Five-player units and on/off splits for any team since 2007–08.',
        match: exact('/lab/lineups/nba'),
      },
      {
        to: '/lab/analytics',
        label: 'Analytics',
        blurb: 'Player-season distributions and relationships.',
        match: exact('/lab/analytics'),
      },
      {
        to: '/lab/recorded',
        label: 'Group analytics',
        blurb: 'Distributions and correlations within a recorded group.',
        match: exact('/lab/recorded'),
      },
      {
        to: '/lab/formulas',
        label: 'Formula lab',
        blurb:
          'Every derived number written out: formula, missing-data rule and an example.',
        match: exact('/lab/formulas'),
      },
      {
        to: '/discover',
        label: 'Discover',
        blurb: 'Find player-seasons that match your filters.',
        match: exact('/discover'),
      },
      {
        to: '/discover/recorded',
        label: 'Group discovery',
        blurb: 'Filter a recorded group of players by any statistic.',
        match: exact('/discover/recorded'),
      },
      {
        to: '/discover/similar',
        label: 'Similarity finder',
        blurb: 'Seasons nearest to a player on the measures you choose.',
        match: exact('/discover/similar'),
      },
      {
        to: '/lab/groups',
        label: 'Hypothetical five',
        blurb: 'Build a hypothetical group from recorded player seasons.',
        match: exact('/lab/groups'),
      },
    ],
  },
];

export function sectionForPath(pathname: string): Section | null {
  if (pathname === '/players' || pathname.startsWith('/players/'))
    return SECTIONS[0] ?? null;
  for (const section of SECTIONS) {
    if (section.pages.some((page) => page.match(pathname))) return section;
    if (pathname === section.to || pathname.startsWith(`${section.to}/`))
      return section;
  }
  return null;
}

export function pageForPath(pathname: string): SectionPage | null {
  for (const section of SECTIONS) {
    const page = section.pages.find((candidate) => candidate.match(pathname));
    if (page) return page;
  }
  return null;
}

/** Whether a route shows the section sub-navigation strip under the masthead. */
export function hasSubnav(pathname: string) {
  const section = sectionForPath(pathname);
  return Boolean(section && section.pages.length > 1 && pageForPath(pathname));
}
