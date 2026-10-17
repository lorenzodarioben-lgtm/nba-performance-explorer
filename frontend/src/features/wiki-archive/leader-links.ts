export type LeaderSegment = { text: string; playerId: string | null };

const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);

/**
 * Splits a published leader label ("Jayson Tatum 15", "Two players 8 each") into text and
 * player segments. A name links only on an exact, whole-word match against the recorded
 * 2023-24 players listed for that team; anything else stays plain text, never a guess.
 */
export function linkLeaderNames(
  text: string,
  players: readonly { playerId: string; name: string }[],
): LeaderSegment[] {
  const found: { start: number; end: number; playerId: string }[] = [];
  // Longer names first, so "Gary Payton II" wins over a shorter overlapping name.
  for (const p of [...players].sort((a, b) => b.name.length - a.name.length)) {
    let from = 0;
    while (from < text.length) {
      const at = text.indexOf(p.name, from);
      if (at < 0) break;
      const end = at + p.name.length;
      const whole = !isLetter(text[at - 1]) && !isLetter(text[end]);
      const free = !found.some((f) => at < f.end && end > f.start);
      if (whole && free) found.push({ start: at, end, playerId: p.playerId });
      from = end;
    }
  }
  found.sort((a, b) => a.start - b.start);
  const out: LeaderSegment[] = [];
  let cursor = 0;
  for (const f of found) {
    if (f.start > cursor)
      out.push({ text: text.slice(cursor, f.start), playerId: null });
    out.push({ text: text.slice(f.start, f.end), playerId: f.playerId });
    cursor = f.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), playerId: null });
  return out;
}
