import type {
  RecordedDataset,
  VerifiedRecordedGame,
  RecordedTeamSummary,
  RecordedTeamRankingsQuery,
} from '@nba-performance-explorer/contracts';
import {
  CanonicalTeamIdSchema,
  WikiAttributionSchema,
} from '@nba-performance-explorer/contracts';
import { z } from 'zod';
import facts from './recorded-conferences.json' with { type: 'json' };
export const recordedConferences = z
  .object({
    source: WikiAttributionSchema,
    teams: z
      .array(
        z
          .object({ id: CanonicalTeamIdSchema, conference: z.enum(['East', 'West']) })
          .strict(),
      )
      .length(30),
  })
  .strict()
  .refine(
    (d) =>
      new Set(d.teams.map((t) => t.id)).size === 30 &&
      ['East', 'West'].every(
        (c) => d.teams.filter((t) => t.conference === c).length === 15,
      ),
  )
  .parse(facts);
export function summarizeRecordedTeam(
  source: RecordedDataset['snapshots'][number],
  verified: readonly VerifiedRecordedGame[],
): RecordedTeamSummary {
  const conference = recordedConferences.teams.find(
    (t) => t.id === source.team.id,
  )?.conference;
  if (!conference) throw new Error('Recorded conference identity unavailable.');
  const own = verified.filter(
    (g) => g.home.id === source.team.id || g.away.id === source.team.id,
  );
  const byId = new Map(own.map((g) => [g.id, g]));
  const schedule = [...source.results].sort(
    (a, b) => a.date.localeCompare(b.date) || a.sourceId.localeCompare(b.sourceId),
  );
  const win = (g: VerifiedRecordedGame) =>
    g.home.id === source.team.id
      ? g.homeScore > g.awayScore
      : g.awayScore > g.homeScore;
  const record = (games: readonly VerifiedRecordedGame[]) => ({
    games: games.length,
    wins: games.filter(win).length,
    losses: games.filter((g) => !win(g)).length,
  });
  const last = schedule.slice(-10),
    observedLast = last.flatMap((g) => {
      const v = byId.get(`nba:${g.sourceId}`);
      return v ? [v] : [];
    });
  const chronologyKnown = new Set(schedule.map((g) => g.date)).size === schedule.length;
  const completeLast =
    chronologyKnown && last.length === 10 && observedLast.length === 10;
  let streak: RecordedTeamSummary['streak'] = {
    kind: null,
    length: null,
    through: schedule.at(-1)?.date ?? null,
  };
  if (chronologyKnown) {
    let kind: 'W' | 'L' | null = null,
      length = 0,
      known = true;
    for (const entry of [...schedule].reverse()) {
      const g = byId.get(`nba:${entry.sourceId}`);
      if (!g) {
        known = false;
        break;
      }
      const result = win(g) ? 'W' : 'L';
      if (kind && result !== kind) break;
      kind = result;
      length++;
    }
    if (known && kind && length)
      streak = { kind, length, through: schedule.at(-1)!.date };
  }
  const totals = own.reduce(
    (s, g) => {
      const points = g.home.id === source.team.id ? g.homeScore : g.awayScore,
        opponent = g.home.id === source.team.id ? g.awayScore : g.homeScore;
      return { points: s.points + points, opponent: s.opponent + opponent };
    },
    { points: 0, opponent: 0 },
  );
  const r = record(own),
    missing = schedule
      .filter((g) => !byId.has(`nba:${g.sourceId}`))
      .map((g) => `nba:${g.sourceId}`);
  return {
    team: source.team,
    conference,
    observedGames: own.length,
    wins: r.wins,
    losses: r.losses,
    completeSeason: own.length === 82 && !missing.length,
    missingGameIds: missing,
    winPercentage: own.length ? r.wins / own.length : null,
    pointsPerGame: own.length ? totals.points / own.length : null,
    opponentPointsPerGame: own.length ? totals.opponent / own.length : null,
    finalMarginPerGame: own.length
      ? (totals.points - totals.opponent) / own.length
      : null,
    home: record(own.filter((g) => g.home.id === source.team.id)),
    away: record(own.filter((g) => g.away.id === source.team.id)),
    lastTen: {
      expectedGames: last.length,
      observedGames: observedLast.length,
      complete: completeLast,
      wins: completeLast ? record(observedLast).wins : null,
      losses: completeLast ? record(observedLast).losses : null,
      from: last[0]?.date ?? null,
      to: last.at(-1)?.date ?? null,
    },
    streak,
    source: source.attribution,
  };
}
export function rankRecordedTeams(
  summaries: readonly RecordedTeamSummary[],
  q: RecordedTeamRankingsQuery,
) {
  const eligible = summaries.filter(
    (r) => !q.conference || r.conference === q.conference,
  );
  const belowMinimumTeams = eligible.filter((r) => r.observedGames < q.minGames).length;
  const gp = eligible.filter((r) => r.observedGames >= q.minGames);
  const incompleteExcludedTeams =
    q.completeOnly === 'true' ? gp.filter((r) => !r.completeSeason).length : 0;
  const covered = gp.filter((r) => q.completeOnly !== 'true' || r.completeSeason);
  const value = (r: RecordedTeamSummary) =>
    q.metric === 'lastTenWins' ? r.lastTen.wins : r[q.metric];
  const rows = covered
    .flatMap((r) => {
      const v = value(r);
      return v === null ? [] : [{ ...r, value: v }];
    })
    .sort(
      (a, b) =>
        (q.order === 'desc' ? b.value - a.value : a.value - b.value) ||
        a.team.id.localeCompare(b.team.id),
    );
  let previous: number | undefined,
    rank = 0;
  const ranked = rows.map((r, i) => {
    if (previous !== r.value) rank = i + 1;
    previous = r.value;
    return { ...r, rank };
  });
  return {
    rows: ranked.filter(
      (r) =>
        !q.search ||
        `${r.team.name} ${r.team.abbreviation}`
          .toLowerCase()
          .includes(q.search.toLowerCase()),
    ),
    rankingPopulation: rows.length,
    belowMinimumTeams,
    incompleteExcludedTeams,
    missingMetricTeams: covered.length - rows.length,
  };
}
