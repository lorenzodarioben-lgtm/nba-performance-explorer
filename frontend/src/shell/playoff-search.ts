import type { PlayoffSeries } from '@nba-performance-explorer/contracts';

import { ROUND_NAMES } from '../features/playoffs/bracket-layout';
import { fold } from './fold';

export interface PlayoffOption {
  key: string;
  group: 'Playoff series';
  title: string;
  meta: string;
  badge: string;
  to: string;
}

const ROUND_WORDS: Record<number, string> = {
  1: 'first round',
  2: 'conference semifinals second round',
  3: 'conference finals',
  4: 'nba finals',
};

/**
 * 2024 playoff series whose teams or round match every word typed ("bos dal", "celtics
 * finals"); "g4" or "game 4" adds that game of the best match. Links to the film room.
 */
export function playoffOptions(
  list: readonly PlayoffSeries[],
  term: string,
): PlayoffOption[] {
  const words = fold(term).split(/\s+/).filter(Boolean);
  const gameWord = words.findIndex(
    (w, i) =>
      /^g[1-7]$/.test(w) || (w === 'game' && /^[1-7]$/.test(words[i + 1] ?? '')),
  );
  const gameNo =
    gameWord < 0
      ? null
      : Number(
          words[gameWord] === 'game' ? words[gameWord + 1] : words[gameWord]!.slice(1),
        );
  const rest = words.filter((w, i) =>
    gameWord < 0
      ? true
      : i !== gameWord && !(words[gameWord] === 'game' && i === gameWord + 1),
  );
  if (!rest.length) return [];
  const hits = list.filter((s) => {
    const hay = [
      ...s.teams.flatMap((t) => [fold(t.name), t.abbreviation.toLowerCase()]),
      s.round ? ROUND_WORDS[s.round]! : '',
      'playoffs series 2024',
    ].join(' ');
    return rest.every((w) => hay.includes(w));
  });
  // Later rounds first: "celtics finals" leads with the Finals, not the semifinals.
  hits.sort((x, y) => (y.round ?? 0) - (x.round ?? 0));
  const options: PlayoffOption[] = hits.slice(0, 3).map((s) => ({
    key: `series:${s.id}`,
    group: 'Playoff series' as const,
    title: `${s.teams[0].abbreviation} vs ${s.teams[1].abbreviation} · ${s.round ? ROUND_NAMES[s.round] : 'Playoff series'}`,
    meta: s.winner
      ? `${s.winner.abbreviation} won ${Math.max(...s.wins)}–${Math.min(...s.wins)} · series film room`
      : 'Undecided in the record · series film room',
    badge: 'PO',
    to: `/games/series/${s.id}`,
  }));
  const top = hits[0];
  const game = top && gameNo ? top.games.find((g) => g.number === gameNo) : undefined;
  if (top && game)
    options.unshift({
      key: `game:${game.game.id}`,
      group: 'Playoff series',
      title: `Game ${game.number}: ${game.game.away.abbreviation} ${game.game.awayScore} @ ${game.game.home.abbreviation} ${game.game.homeScore}`,
      meta: `${top.round ? ROUND_NAMES[top.round] : 'Playoffs'} · ${game.game.date}`,
      badge: `G${game.number}`,
      to: `/games/${game.game.id}`,
    });
  return options;
}
