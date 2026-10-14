import type { PlayoffSeries } from '@nba-performance-explorer/contracts';

export const ROUND_NAMES: Record<number, string> = {
  1: 'First round',
  2: 'Conference semifinals',
  3: 'Conference finals',
  4: 'NBA Finals',
};

export interface BracketColumn {
  key: string;
  round: number;
  side: 'west' | 'east' | 'finals';
  label: string;
  /** Series in pairs that feed the same next-round series, top to bottom. */
  pairs: PlayoffSeries[][];
}

/**
 * Lays a complete bracket out as seven columns (West rounds 1–3, Finals, East rounds 3–1), with
 * each column ordered by the feeder tree so connected series sit side by side.
 */
export function bracketColumns(series: readonly PlayoffSeries[]): BracketColumn[] {
  const byId = new Map(series.map((s) => [s.id, s]));
  const finals = series.find((s) => s.round === 4);
  if (!finals?.feeders) return [];
  const conferenceFinal = (conference: 'East' | 'West') =>
    finals
      .feeders!.map((id) => (id ? byId.get(id) : undefined))
      .find((s) => s?.conference === conference);
  // With published seeds, each pair follows the official layout: the series holding the better
  // seed on top (1 v 8 above 4 v 5). Without seeds the feeder order is kept as derived.
  const bestSeed = (x: PlayoffSeries) => (x.seeds ? Math.min(...x.seeds) : 99);
  const expand = (list: readonly PlayoffSeries[]) =>
    list.flatMap((s) =>
      (s.feeders ?? [])
        .flatMap((id) => {
          const feeder = id ? byId.get(id) : undefined;
          return feeder ? [feeder] : [];
        })
        .sort((x, y) => bestSeed(x) - bestSeed(y)),
    );
  const sideColumns = (conference: 'East' | 'West') => {
    const r3 = conferenceFinal(conference);
    const rounds: PlayoffSeries[][] = [r3 ? [r3] : []];
    rounds.push(expand(rounds[0]!));
    rounds.push(expand(rounds[1]!));
    return rounds; // [round 3, round 2, round 1]
  };
  const pairsOf = (list: readonly PlayoffSeries[]) =>
    list.length < 2
      ? [list.slice()]
      : Array.from({ length: list.length / 2 }, (_, i) => list.slice(i * 2, i * 2 + 2));
  const west = sideColumns('West');
  const east = sideColumns('East');
  const column = (
    side: 'west' | 'east',
    round: number,
    list: readonly PlayoffSeries[],
  ): BracketColumn => ({
    key: `${side}-${round}`,
    round,
    side,
    label: `${side === 'west' ? 'West' : 'East'} · ${ROUND_NAMES[round]}`,
    pairs: pairsOf(list),
  });
  return [
    column('west', 1, west[2]!),
    column('west', 2, west[1]!),
    column('west', 3, west[0]!),
    {
      key: 'finals',
      round: 4,
      side: 'finals',
      label: ROUND_NAMES[4]!,
      pairs: [[finals]],
    },
    column('east', 3, east[0]!),
    column('east', 2, east[1]!),
    column('east', 1, east[2]!),
  ];
}

export function seriesForGame(series: readonly PlayoffSeries[], gameId: string) {
  return series.find((s) => s.games.some((g) => g.game.id === gameId)) ?? null;
}

/** A team's wins and losses across every recorded playoff game it played. */
export function playoffRecord(series: readonly PlayoffSeries[], teamId: string) {
  let wins = 0,
    losses = 0;
  for (const s of series)
    for (const g of s.games) {
      if (g.game.home.id !== teamId && g.game.away.id !== teamId) continue;
      if (g.winner.id === teamId) wins++;
      else losses++;
    }
  return { wins, losses };
}
