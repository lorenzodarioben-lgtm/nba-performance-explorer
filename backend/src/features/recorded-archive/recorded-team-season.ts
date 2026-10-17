import type {
  RecordedDataset,
  RecordedTeamSeasonResponse,
  TeamSeasonGame,
  TeamSeasonSplit,
  TeamSeasonSplitKey,
  VerifiedRecordedGame,
} from '@nba-performance-explorer/contracts';
import { recordedConferences } from './recorded-team-rankings.js';

type Snapshot = RecordedDataset['snapshots'][number];
type Conference = 'East' | 'West';
type Streak = NonNullable<RecordedTeamSeasonResponse['longestWinStreak']>;

/** Final margin of five points or fewer, overtime included. */
export const CLOSE_GAME_MARGIN = 5;
/** Final margin of fifteen points or more. */
export const DECISIVE_GAME_MARGIN = 15;
/** Splits with fewer verified games than this are flagged as small samples. */
export const SMALL_SAMPLE_GAMES = 5;
export const ROLLING_WINDOW = 10;
const MARGIN_BIN = 5;

export function conferenceOf(teamId: string): Conference {
  const conference = recordedConferences.teams.find((t) => t.id === teamId)?.conference;
  if (!conference) throw new Error('Recorded conference identity unavailable.');
  return conference;
}

const dayNumber = (date: string) =>
  Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000;

/** The team's source schedule in calendar order, joined to the source-agreed final scores. */
export function teamSeasonGames(
  source: Snapshot,
  verified: readonly VerifiedRecordedGame[],
): { games: TeamSeasonGame[]; chronologyKnown: boolean } {
  const byId = new Map(verified.map((g) => [g.id, g]));
  const schedule = [...source.results].sort(
    (a, b) => a.date.localeCompare(b.date) || a.sourceId.localeCompare(b.sourceId),
  );
  const chronologyKnown = new Set(schedule.map((g) => g.date)).size === schedule.length;
  let wins = 0,
    losses = 0;
  const games: TeamSeasonGame[] = [];
  schedule.forEach((row, index) => {
    const id = `nba:${row.sourceId}`;
    const game = byId.get(id);
    const home = game?.home.id === source.team.id;
    const teamScore = game ? (home ? game.homeScore : game.awayScore) : null;
    const opponentScore = game ? (home ? game.awayScore : game.homeScore) : null;
    const margin =
      teamScore !== null && opponentScore !== null ? teamScore - opponentScore : null;
    if (margin !== null) {
      if (margin > 0) wins++;
      else losses++;
    }
    const previous = schedule[index - 1];
    const recent = games.slice(-(ROLLING_WINDOW - 1));
    const window = [...recent.map((g) => g.margin), margin];
    games.push({
      gameNumber: index + 1,
      id,
      date: row.date,
      opponent: row.opponent,
      opponentConference: conferenceOf(row.opponent.id),
      location: row.location,
      verified: Boolean(game),
      teamScore,
      opponentScore,
      result: margin === null ? null : margin > 0 ? 'W' : 'L',
      margin,
      overtime: row.overtime,
      restDays:
        chronologyKnown && previous
          ? dayNumber(row.date) - dayNumber(previous.date) - 1
          : null,
      observedWins: wins,
      observedLosses: losses,
      rollingMargin:
        chronologyKnown &&
        window.length === ROLLING_WINDOW &&
        window.every((m): m is number => m !== null)
          ? window.reduce((s, m) => s + m, 0) / ROLLING_WINDOW
          : null,
      recapUrl: row.recapUrl,
    });
  });
  return { games, chronologyKnown };
}

const MONTHS: readonly [TeamSeasonSplitKey, string, string][] = [
  ['month-10', 'October', '10'],
  ['month-11', 'November', '11'],
  ['month-12', 'December', '12'],
  ['month-01', 'January', '01'],
  ['month-02', 'February', '02'],
  ['month-03', 'March', '03'],
  ['month-04', 'April', '04'],
];

function split(
  key: TeamSeasonSplitKey,
  group: TeamSeasonSplit['group'],
  label: string,
  definition: string,
  games: readonly TeamSeasonGame[],
): TeamSeasonSplit {
  const sample = games.filter((g) => g.verified);
  const wins = sample.filter((g) => g.result === 'W').length;
  const mean = (pick: (g: TeamSeasonGame) => number) =>
    sample.length ? sample.reduce((s, g) => s + pick(g), 0) / sample.length : null;
  return {
    key,
    group,
    label,
    definition,
    games: sample.length,
    wins,
    losses: sample.length - wins,
    winPercentage: sample.length ? wins / sample.length : null,
    pointsFor: mean((g) => g.teamScore!),
    pointsAgainst: mean((g) => g.opponentScore!),
    marginPerGame: mean((g) => g.margin!),
    smallSample: sample.length < SMALL_SAMPLE_GAMES,
  };
}

/** Each team's observed win percentage over its source-agreed games. */
export function observedWinPercentages(verified: readonly VerifiedRecordedGame[]) {
  const tally = new Map<string, { wins: number; games: number }>();
  const add = (id: string, won: boolean) => {
    const t = tally.get(id) ?? { wins: 0, games: 0 };
    t.games++;
    if (won) t.wins++;
    tally.set(id, t);
  };
  for (const g of verified) {
    add(g.home.id, g.homeScore > g.awayScore);
    add(g.away.id, g.awayScore > g.homeScore);
  }
  return new Map([...tally].map(([id, t]) => [id, t.wins / t.games]));
}

export function teamSeasonSplits(
  games: readonly TeamSeasonGame[],
  chronologyKnown: boolean,
  opponentWinPercentage?: ReadonlyMap<string, number>,
): TeamSeasonSplit[] {
  const out: TeamSeasonSplit[] = [
    split(
      'all',
      'overall',
      'All verified games',
      'Every source-agreed regular-season final.',
      games,
    ),
    split(
      'home',
      'venue',
      'Home',
      'Games listed as home by both source team pages.',
      games.filter((g) => g.location === 'home'),
    ),
    split(
      'away',
      'venue',
      'Away',
      'Games listed as away by both source team pages.',
      games.filter((g) => g.location === 'away'),
    ),
    split(
      'vs-east',
      'opponent',
      'vs East',
      'Opponent in the Eastern Conference (sourced 2023-24 alignment).',
      games.filter((g) => g.opponentConference === 'East'),
    ),
    split(
      'vs-west',
      'opponent',
      'vs West',
      'Opponent in the Western Conference (sourced 2023-24 alignment).',
      games.filter((g) => g.opponentConference === 'West'),
    ),
  ];
  if (opponentWinPercentage)
    out.push(
      split(
        'vs-winning',
        'opponent',
        'vs winning teams',
        'Opponent finished above .500 in its own source-agreed games (meetings with this team included). Teams at exactly .500 are in neither group.',
        games.filter((g) => (opponentWinPercentage.get(g.opponent.id) ?? 0.5) > 0.5),
      ),
      split(
        'vs-losing',
        'opponent',
        'vs losing teams',
        'Opponent finished below .500 in its own source-agreed games (meetings with this team included). Teams at exactly .500 are in neither group.',
        games.filter((g) => (opponentWinPercentage.get(g.opponent.id) ?? 0.5) < 0.5),
      ),
    );
  if (chronologyKnown)
    out.push(
      split(
        'back-to-back',
        'rest',
        'Second of a back-to-back',
        'Played the calendar day after the previous source-listed game (0 rest days).',
        games.filter((g) => g.restDays === 0),
      ),
      split(
        'one-day-rest',
        'rest',
        'One day of rest',
        'Exactly one calendar day without a source-listed game before this one.',
        games.filter((g) => g.restDays === 1),
      ),
      split(
        'two-plus-rest',
        'rest',
        'Two or more days of rest',
        'Two or more calendar days without a source-listed game; excludes the season opener.',
        games.filter((g) => g.restDays !== null && g.restDays >= 2),
      ),
    );
  out.push(
    split(
      'close',
      'margin',
      `Decided by ${CLOSE_GAME_MARGIN} or fewer`,
      `Final margin of ${CLOSE_GAME_MARGIN} points or fewer, overtime included. Final margin only, not the in-game lead.`,
      games.filter((g) => g.margin !== null && Math.abs(g.margin) <= CLOSE_GAME_MARGIN),
    ),
    split(
      'decisive',
      'margin',
      `Decided by ${DECISIVE_GAME_MARGIN} or more`,
      `Final margin of ${DECISIVE_GAME_MARGIN} points or more.`,
      games.filter(
        (g) => g.margin !== null && Math.abs(g.margin) >= DECISIVE_GAME_MARGIN,
      ),
    ),
    split(
      'overtime',
      'margin',
      'Overtime games',
      "One or more overtime periods on the team's own source row.",
      games.filter((g) => g.overtime > 0),
    ),
    ...MONTHS.map(([key, label, month]) =>
      split(
        key,
        'month',
        label,
        `Games on ${label} calendar dates as listed by the source.`,
        games.filter((g) => g.date.slice(5, 7) === month),
      ),
    ),
  );
  return out;
}

/**
 * Maximal runs of the same result. A run ends at an unverified game: its result is unknown, so a
 * streak is never bridged across it. Requires a known chronology.
 */
export function streakRuns(
  games: readonly TeamSeasonGame[],
  chronologyKnown: boolean,
): Streak[] {
  if (!chronologyKnown) return [];
  const runs: Streak[] = [];
  let current: Streak | null = null;
  for (const g of games) {
    if (!g.result) {
      current = null;
      continue;
    }
    if (current && current.kind === g.result) {
      current.length++;
      current.toGame = g.gameNumber;
      current.to = g.date;
    } else {
      current = {
        kind: g.result,
        length: 1,
        fromGame: g.gameNumber,
        toGame: g.gameNumber,
        from: g.date,
        to: g.date,
      };
      runs.push(current);
    }
  }
  return runs;
}

function longest(runs: readonly Streak[], kind: 'W' | 'L') {
  return runs
    .filter((r) => r.kind === kind)
    .reduce<Streak | null>(
      (best, r) => (!best || r.length > best.length ? r : best),
      null,
    );
}

export function marginBins(games: readonly TeamSeasonGame[]) {
  const margins = games.flatMap((g) => (g.margin === null ? [] : [g.margin]));
  if (!margins.length) return [];
  const lo = Math.floor(Math.min(...margins, -1) / MARGIN_BIN) * MARGIN_BIN;
  // Bins are half-open, so the top bin must start at or below the largest margin.
  const hi = (Math.floor(Math.max(...margins, 1) / MARGIN_BIN) + 1) * MARGIN_BIN;
  const bins = [];
  for (let from = lo; from < hi; from += MARGIN_BIN) {
    // Bins are [from, from + 5); margins are never zero, so the bin at zero holds only wins.
    const inBin = margins.filter((m) => m >= from && m < from + MARGIN_BIN);
    bins.push({
      from,
      to: from + MARGIN_BIN,
      wins: inBin.filter((m) => m > 0).length,
      losses: inBin.filter((m) => m < 0).length,
    });
  }
  return bins;
}

export function opponentSeries(games: readonly TeamSeasonGame[]) {
  const map = new Map<string, TeamSeasonGame[]>();
  for (const g of games) map.set(g.opponent.id, [...(map.get(g.opponent.id) ?? []), g]);
  return [...map.values()]
    .map((list) => {
      const sample = list.filter((g) => g.verified);
      return {
        opponent: list[0]!.opponent,
        conference: list[0]!.opponentConference,
        scheduled: list.length,
        verified: sample.length,
        wins: sample.filter((g) => g.result === 'W').length,
        losses: sample.filter((g) => g.result === 'L').length,
        pointsFor: sample.reduce((s, g) => s + g.teamScore!, 0),
        pointsAgainst: sample.reduce((s, g) => s + g.opponentScore!, 0),
        gameNumbers: list.map((g) => g.gameNumber),
      };
    })
    .sort((a, b) => a.opponent.name.localeCompare(b.opponent.name));
}

function extremes(games: readonly TeamSeasonGame[], sign: 1 | -1) {
  const pool = games.filter((g) => g.margin !== null && Math.sign(g.margin) === sign);
  if (!pool.length) return [];
  const peak = Math.max(...pool.map((g) => g.margin! * sign));
  return pool.filter((g) => g.margin! * sign === peak).map((g) => g.gameNumber);
}

export function buildTeamSeason(
  source: Snapshot,
  verified: readonly VerifiedRecordedGame[],
) {
  const { games, chronologyKnown } = teamSeasonGames(source, verified);
  const runs = streakRuns(games, chronologyKnown);
  return {
    team: source.team,
    conference: conferenceOf(source.team.id),
    chronologyKnown,
    games,
    verifiedGames: games.filter((g) => g.verified).length,
    splits: teamSeasonSplits(games, chronologyKnown, observedWinPercentages(verified)),
    longestWinStreak: longest(runs, 'W'),
    longestLosingStreak: longest(runs, 'L'),
    streakRuns: runs,
    marginBins: marginBins(games),
    opponents: opponentSeries(games),
    largestWins: extremes(games, 1),
    largestLosses: extremes(games, -1),
    attribution: source.attribution,
  };
}

/**
 * Observed wins and losses for every team through the end of each date with a verified game.
 * Quarantined games never count; `scheduled` keeps how many source games had been listed.
 */
export function buildStandingsRace(
  snapshots: readonly Snapshot[],
  verified: readonly VerifiedRecordedGame[],
  conference?: Conference,
) {
  const dates = [...new Set(verified.map((g) => g.date))].sort();
  const teams = snapshots
    .filter((s) => !conference || conferenceOf(s.team.id) === conference)
    .map((s) => {
      const own = verified.filter(
        (g) => g.home.id === s.team.id || g.away.id === s.team.id,
      );
      const verifiedIds = new Set(own.map((g) => g.id));
      const scheduleDates = s.results.map((r) => r.date).sort();
      const wins: number[] = [],
        losses: number[] = [],
        scheduled: number[] = [];
      let w = 0,
        l = 0,
        cursor = 0,
        listed = 0;
      const ordered = [...own].sort((a, b) => a.date.localeCompare(b.date));
      for (const date of dates) {
        while (cursor < ordered.length && ordered[cursor]!.date <= date) {
          const g = ordered[cursor++]!;
          const home = g.home.id === s.team.id;
          if ((home ? g.homeScore : g.awayScore) > (home ? g.awayScore : g.homeScore))
            w++;
          else l++;
        }
        while (listed < scheduleDates.length && scheduleDates[listed]! <= date)
          listed++;
        wins.push(w);
        losses.push(l);
        scheduled.push(listed);
      }
      return {
        team: s.team,
        conference: conferenceOf(s.team.id),
        wins,
        losses,
        scheduled,
        quarantinedGameIds: s.results
          .map((r) => `nba:${r.sourceId}`)
          .filter((id) => !verifiedIds.has(id)),
      };
    })
    .sort((a, b) => a.team.name.localeCompare(b.team.name));
  return { dates, teams };
}
