import { PlayerIdSchema, SeasonIdSchema } from '@nba-performance-explorer/contracts';

// Pure, framework-free helpers for the two-player comparison URL state. They accept
// `URLSearchParams` or plain values (no browser globals, no React) so they can be unit-tested
// directly and reused by the page without duplicating parsing or URL-building logic.

export type ComparisonSlotStatus = 'empty' | 'valid' | 'invalid';

export interface PlayerSlotUrlState {
  // The raw query value (or null when the parameter is absent). A repeated parameter is
  // represented by its joined values and is always treated as invalid.
  raw: string | null;
  status: ComparisonSlotStatus;
  // The validated player id, present only when `status === 'valid'`.
  playerId: string | null;
}

export interface SeasonSlotUrlState {
  raw: string | null;
  status: ComparisonSlotStatus;
  // The validated season id, present only when `status === 'valid'`.
  season: string | null;
}

export interface ComparisonUrlState {
  player1: PlayerSlotUrlState;
  player2: PlayerSlotUrlState;
  season: SeasonSlotUrlState;
  // True only when both players are syntactically valid and identical.
  duplicate: boolean;
}

export interface ComparisonSelection {
  player1: string | null;
  player2: string | null;
  season: string | null;
}

export function isValidComparisonPlayerId(value: string | null | undefined): boolean {
  return (
    value !== null && value !== undefined && PlayerIdSchema.safeParse(value).success
  );
}

export function isValidComparisonSeason(value: string | null | undefined): boolean {
  return (
    value !== null && value !== undefined && SeasonIdSchema.safeParse(value).success
  );
}

// A recognized parameter may appear at most once; a repeated parameter is rejected as invalid
// rather than silently picking one value.
function readPlayerSlot(
  searchParams: URLSearchParams,
  key: string,
): PlayerSlotUrlState {
  const values = searchParams.getAll(key);

  if (values.length === 0) {
    return { raw: null, status: 'empty', playerId: null };
  }

  if (values.length > 1) {
    return { raw: values.join(','), status: 'invalid', playerId: null };
  }

  const [value] = values;

  if (value !== undefined && isValidComparisonPlayerId(value)) {
    return { raw: value, status: 'valid', playerId: value };
  }

  return { raw: value ?? null, status: 'invalid', playerId: null };
}

function readSeasonSlot(searchParams: URLSearchParams): SeasonSlotUrlState {
  const values = searchParams.getAll('season');

  if (values.length === 0) {
    return { raw: null, status: 'empty', season: null };
  }

  if (values.length > 1) {
    return { raw: values.join(','), status: 'invalid', season: null };
  }

  const [value] = values;

  if (value !== undefined && isValidComparisonSeason(value)) {
    return { raw: value, status: 'valid', season: value };
  }

  return { raw: value ?? null, status: 'invalid', season: null };
}

export function readComparisonUrlState(
  searchParams: URLSearchParams,
): ComparisonUrlState {
  const player1 = readPlayerSlot(searchParams, 'player1');
  const player2 = readPlayerSlot(searchParams, 'player2');
  const season = readSeasonSlot(searchParams);
  const duplicate =
    player1.status === 'valid' &&
    player2.status === 'valid' &&
    player1.playerId === player2.playerId;

  return { player1, player2, season, duplicate };
}

// The current valid selection, used as the base for selection/replacement/clearing actions.
// Invalid or repeated values are dropped so an action never writes a malformed value back.
export function selectionFromUrlState(state: ComparisonUrlState): ComparisonSelection {
  return {
    player1: state.player1.status === 'valid' ? state.player1.playerId : null,
    player2: state.player2.status === 'valid' ? state.player2.playerId : null,
    season: state.season.status === 'valid' ? state.season.season : null,
  };
}

// Selecting or replacing a player always drops the season so old comparison statistics
// disappear immediately and a fresh common season is resolved for the new pairing.
export function selectComparisonPlayer1(
  base: ComparisonSelection,
  playerId: string,
): ComparisonSelection {
  return { player1: playerId, player2: base.player2, season: null };
}

export function selectComparisonPlayer2(
  base: ComparisonSelection,
  playerId: string,
): ComparisonSelection {
  return { player1: base.player1, player2: playerId, season: null };
}

// Clearing one player preserves the other player in its slot and drops the season.
export function clearComparisonPlayer1(base: ComparisonSelection): ComparisonSelection {
  return { player1: null, player2: base.player2, season: null };
}

export function clearComparisonPlayer2(base: ComparisonSelection): ComparisonSelection {
  return { player1: base.player1, player2: null, season: null };
}

// Changing the season keeps both players and only updates the season.
export function changeComparisonSeason(
  base: ComparisonSelection,
  season: string,
): ComparisonSelection {
  return { player1: base.player1, player2: base.player2, season };
}

// Build a query string with recognized parameters in a deterministic order
// (`player1`, `player2`, `season`), omitting any that are absent.
export function buildComparisonParams(selection: ComparisonSelection): URLSearchParams {
  const params = new URLSearchParams();

  if (selection.player1) {
    params.set('player1', selection.player1);
  }
  if (selection.player2) {
    params.set('player2', selection.player2);
  }
  if (selection.season) {
    params.set('season', selection.season);
  }

  return params;
}

function seasonStartYear(season: string): number {
  return Number(season.slice(0, 4));
}

// Seasons present in both lists, de-duplicated and ordered newest-first by the numeric
// four-digit starting year (so `2023-24` precedes `2017-18`).
export function intersectSeasonsNewestFirst(
  seasonsA: readonly string[],
  seasonsB: readonly string[],
): string[] {
  const inB = new Set(seasonsB);
  const common = [...new Set(seasonsA)].filter((season) => inB.has(season));

  return common.sort((left, right) => seasonStartYear(right) - seasonStartYear(left));
}

export function newestCommonSeason(
  seasonsA: readonly string[],
  seasonsB: readonly string[],
): string | null {
  return intersectSeasonsNewestFirst(seasonsA, seasonsB)[0] ?? null;
}

export function isCommonSeason(
  season: string,
  seasonsA: readonly string[],
  seasonsB: readonly string[],
): boolean {
  return seasonsA.includes(season) && seasonsB.includes(season);
}
