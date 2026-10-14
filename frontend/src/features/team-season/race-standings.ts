import type { RecordedStandingsRaceResponse } from '@nba-performance-explorer/contracts';

type RaceTeam = RecordedStandingsRaceResponse['teams'][number];

export interface RaceRow {
  team: RaceTeam['team'];
  rank: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
  /** Games behind the observed leader, from observed records only (not the published figure). */
  gamesBehind: number;
  /** Source-listed games through this date that are quarantined and not counted. */
  uncounted: number;
}

/**
 * The observed table on one race date: ordered by win percentage, then wins, then name. Teams
 * with no counted game sort last. Competition ranks share a place only on identical records.
 */
export function standingsAt(teams: readonly RaceTeam[], index: number): RaceRow[] {
  const rows = teams.map((t) => {
    const wins = t.wins[index] ?? 0;
    const losses = t.losses[index] ?? 0;
    const played = wins + losses;
    return {
      team: t.team,
      wins,
      losses,
      winPercentage: played ? wins / played : null,
      uncounted: Math.max(0, (t.scheduled[index] ?? 0) - played),
    };
  });
  rows.sort(
    (a, b) =>
      (b.winPercentage ?? -1) - (a.winPercentage ?? -1) ||
      b.wins - a.wins ||
      a.team.name.localeCompare(b.team.name),
  );
  const leader = rows[0];
  let rank = 0;
  return rows.map((row, i) => {
    const previous = rows[i - 1];
    if (!previous || previous.wins !== row.wins || previous.losses !== row.losses)
      rank = i + 1;
    return {
      ...row,
      rank,
      gamesBehind: leader
        ? (leader.wins - row.wins + (row.losses - leader.losses)) / 2
        : 0,
    };
  });
}

/** Wins minus losses for each team on each date: the y value of the race chart. */
export function aboveFiveHundred(team: RaceTeam) {
  return team.wins.map((w, i) => w - (team.losses[i] ?? 0));
}

/** The index of the last race date on or before `date`, or -1 when none is. */
export function dateIndex(dates: readonly string[], date: string) {
  let found = -1;
  for (let i = 0; i < dates.length; i++) if (dates[i]! <= date) found = i;
  return found;
}

export type RaceView = 'above' | 'gb' | 'rank';

/**
 * The y value of every team on every race date for a chosen view: wins minus losses, games behind
 * the observed leader, or the observed ladder position. Keyed by canonical team ID.
 */
export function raceSeries(teams: readonly RaceTeam[], view: RaceView, dates: number) {
  const out = new Map<string, number[]>(teams.map((t) => [t.team.id, []]));
  if (view === 'above') {
    for (const t of teams) out.set(t.team.id, aboveFiveHundred(t));
    return out;
  }
  for (let i = 0; i < dates; i++)
    for (const row of standingsAt(teams, i))
      out.get(row.team.id)!.push(view === 'gb' ? row.gamesBehind : row.rank);
  return out;
}
