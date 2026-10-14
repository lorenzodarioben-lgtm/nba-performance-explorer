import type { ArchiveGame, PlayoffSeries } from '@nba-performance-explorer/contracts';
import { recordedConferences } from '../recorded-archive/recorded-team-rankings.js';

type Team = ArchiveGame['home'];
const WINS_TO_ADVANCE = 4;
const ROUND_SIZES = [8, 4, 2, 1] as const;

const winnerOf = (g: ArchiveGame) => (g.homeScore > g.awayScore ? g.home : g.away);
const conferenceOf = (id: string) =>
  recordedConferences.teams.find((t) => t.id === id)?.conference ?? null;
/** NBA playoff game IDs encode the round in their eighth digit (0042300401: round 4). */
export const sourceIdRound = (game: ArchiveGame) => Number(game.sourceId[7]);

/**
 * Groups recorded playoff games into series (one per team pair), counts wins in date order and
 * names a winner only when a team reaches four wins in the series' final recorded game. Rounds
 * come from each team's own sequence of series; the two teams must agree. Nothing is inferred
 * for a series the recorded games do not finish.
 */
export function buildPlayoffBracket(games: readonly ArchiveGame[]) {
  const issues: string[] = [];
  const pairs = new Map<string, ArchiveGame[]>();
  for (const game of games) {
    const key = [game.home.id, game.away.id].sort().join('|');
    pairs.set(key, [...(pairs.get(key) ?? []), game]);
  }

  interface Draft {
    teams: [Team, Team];
    games: ArchiveGame[];
    first: string;
  }
  const drafts: Draft[] = [...pairs.values()].map((list) => {
    const ordered = [...list].sort(
      (a, b) => a.date.localeCompare(b.date) || a.sourceId.localeCompare(b.sourceId),
    );
    const g = ordered[0]!;
    const teams = [g.home, g.away].sort((a, b) =>
      a.abbreviation.localeCompare(b.abbreviation),
    ) as [Team, Team];
    return { teams, games: ordered, first: g.date };
  });

  // Each team's series in date order: the first is its first round, and so on.
  const byTeam = new Map<string, Draft[]>();
  for (const d of drafts)
    for (const t of d.teams) byTeam.set(t.id, [...(byTeam.get(t.id) ?? []), d]);
  for (const list of byTeam.values())
    list.sort((a, b) => a.first.localeCompare(b.first));
  const roundFor = (d: Draft) => {
    const [a, b] = d.teams.map((t) => byTeam.get(t.id)!.indexOf(d) + 1);
    return a === b && a! <= ROUND_SIZES.length ? a! : null;
  };

  const idOf = (d: Draft) => {
    const round = roundFor(d);
    const names = `${d.teams[0].abbreviation}-${d.teams[1].abbreviation}`;
    return round ? `r${round}-${names}` : `unplaced-${names}`;
  };

  const series: PlayoffSeries[] = drafts.map((d) => {
    const round = roundFor(d);
    const label = `${d.teams[0].abbreviation}–${d.teams[1].abbreviation}`;
    if (round === null)
      issues.push(
        `${label}: the two teams' series orders disagree, so no round is assigned.`,
      );
    let tally: [number, number] = [0, 0];
    const rows = d.games.map((game, i) => {
      const winner = winnerOf(game);
      tally =
        winner.id === d.teams[0].id
          ? [tally[0] + 1, tally[1]]
          : [tally[0], tally[1] + 1];
      return { game, number: i + 1, winner, after: tally };
    });
    const clinchedAt = rows.findIndex((r) => Math.max(...r.after) === WINS_TO_ADVANCE);
    const decided =
      d.games.length <= 7 &&
      clinchedAt === rows.length - 1 &&
      Math.min(...tally) < WINS_TO_ADVANCE;
    if (!decided)
      issues.push(
        `${label}: the recorded games (${tally[0]}–${tally[1]}) do not end with a team's fourth win, so no winner is named.`,
      );
    const conferences = d.teams.map((t) => conferenceOf(t.id));
    const sameConference = conferences[0] !== null && conferences[0] === conferences[1];
    if (round !== null && round < 4 && !sameConference)
      issues.push(
        `${label}: a round ${round} series between conferences is unexpected.`,
      );
    const feeders =
      round !== null && round > 1
        ? (d.teams.map((t) => {
            const earlier = byTeam.get(t.id)![round - 2];
            return earlier ? idOf(earlier) : null;
          }) as [string | null, string | null])
        : null;
    const points = (team: Team) =>
      d.games.reduce(
        (s, g) => s + (g.home.id === team.id ? g.homeScore : g.awayScore),
        0,
      );
    return {
      id: idOf(d),
      round,
      conference:
        round !== null && round < 4 && sameConference ? conferences[0]! : null,
      teams: d.teams,
      wins: tally,
      games: rows,
      status: decided ? 'decided' : 'incomplete',
      winner: decided ? (tally[0] > tally[1] ? d.teams[0] : d.teams[1]) : null,
      feeders,
      sourceIdRoundAgrees:
        round !== null && d.games.every((g) => sourceIdRound(g) === round),
      totalPoints: [points(d.teams[0]), points(d.teams[1])],
      overtimeGames: d.games.filter((g) => g.quarters.length > 4).length,
      homeWins: d.games.filter((g) => winnerOf(g).id === g.home.id).length,
    };
  });

  for (const s of series)
    if (s.round !== null && !s.sourceIdRoundAgrees)
      issues.push(
        `${s.id}: the NBA game IDs encode a different round than the derived one.`,
      );

  // A complete bracket: 8/4/2/1 decided series, each later team having won its feeder series.
  const counts = ROUND_SIZES.map(
    (_, i) => series.filter((s) => s.round === i + 1).length,
  );
  const byId = new Map(series.map((s) => [s.id, s]));
  const fed = series.every(
    (s) =>
      !s.feeders ||
      s.feeders.every(
        (f, i) => f !== null && byId.get(f)?.winner?.id === s.teams[i]!.id,
      ),
  );
  const complete =
    counts.every((c, i) => c === ROUND_SIZES[i]) &&
    series.length === 15 &&
    series.every((s) => s.status === 'decided') &&
    fed;
  if (!complete)
    issues.push(
      `The recorded games do not form a complete four-round bracket (series per round: ${counts.join('/')}).`,
    );
  const finals = series.find((s) => s.round === 4);
  series.sort(
    (a, b) =>
      (a.round ?? 9) - (b.round ?? 9) ||
      (a.conference ?? '').localeCompare(b.conference ?? '') ||
      a.games[0]!.game.date.localeCompare(b.games[0]!.game.date) ||
      a.id.localeCompare(b.id),
  );
  return {
    series,
    complete,
    champion: complete && finals?.winner ? finals.winner : null,
    issues,
  };
}
