import type { PlayerSummary } from '@nba-performance-explorer/contracts';

// Pure local search over the cached NBA.com player directory. No network access and no upstream
// request per keystroke: the provider fetches the directory once (cached) and calls this for
// every query. Ranking is deterministic so identical queries always return identical results.

export interface DirectoryPlayer {
  personId: string;
  fullName: string;
  firstName: string;
  surname: string;
  isActive: boolean;
  team?: { abbreviation: string } | undefined;
}

const MINIMUM_SEARCH_LENGTH = 2;

// Lowercase, strip diacritics (NFD decomposition then remove combining marks), collapse spaces.
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Lower rank number = stronger match. Returns null when the player does not match at all.
function rankFor(
  normalizedTerm: string,
  normalizedFullName: string,
  normalizedFirstName: string,
  normalizedSurname: string,
  tokens: readonly string[],
): number | null {
  if (normalizedFullName === normalizedTerm) {
    return 1;
  }
  if (normalizedFirstName === normalizedTerm || normalizedSurname === normalizedTerm) {
    return 2;
  }
  if (normalizedFullName.startsWith(normalizedTerm)) {
    return 3;
  }
  if (
    normalizedFirstName.startsWith(normalizedTerm) ||
    normalizedSurname.startsWith(normalizedTerm)
  ) {
    return 4;
  }
  if (tokens.some((token) => token.startsWith(normalizedTerm))) {
    return 5;
  }
  if (normalizedFullName.includes(normalizedTerm)) {
    return 6;
  }
  return null;
}

export function searchDirectory(
  players: readonly DirectoryPlayer[],
  term: string,
  limit: number,
): PlayerSummary[] {
  const normalizedTerm = normalize(term);
  if (normalizedTerm.length < MINIMUM_SEARCH_LENGTH) {
    return [];
  }

  const matched: {
    player: DirectoryPlayer;
    normalizedFullName: string;
    rank: number;
  }[] = [];

  for (const player of players) {
    const normalizedFullName = normalize(player.fullName);
    if (normalizedFullName === '') {
      continue;
    }
    const normalizedFirstName = normalize(player.firstName);
    const normalizedSurname = normalize(player.surname);
    const tokens = normalizedFullName.split(' ').filter(Boolean);
    const rank = rankFor(
      normalizedTerm,
      normalizedFullName,
      normalizedFirstName,
      normalizedSurname,
      tokens,
    );
    if (rank !== null) {
      matched.push({ player, normalizedFullName, rank });
    }
  }

  // Deterministic ordering: stronger rank, then active players, then name, then numeric id.
  matched.sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    if (left.player.isActive !== right.player.isActive) {
      return left.player.isActive ? -1 : 1;
    }
    if (left.normalizedFullName !== right.normalizedFullName) {
      return left.normalizedFullName < right.normalizedFullName ? -1 : 1;
    }
    return Number(left.player.personId) - Number(right.player.personId);
  });

  const seen = new Set<string>();
  const results: PlayerSummary[] = [];
  for (const { player } of matched) {
    if (seen.has(player.personId)) {
      continue;
    }
    seen.add(player.personId);
    results.push({
      id: player.personId,
      fullName: player.fullName,
      ...(player.team ? { team: player.team } : {}),
    });
    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
