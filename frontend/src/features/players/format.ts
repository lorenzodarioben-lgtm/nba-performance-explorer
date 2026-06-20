import type { DraftInfo, TeamProfile } from '@nba-performance-explorer/contracts';

// Pure display formatters. The shared contracts store raw values (integers, structured
// draft); these turn them into human-readable strings for the profile UI only.

export function formatHeight(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′ ${inches}″`;
}

export function formatWeight(pounds: number): string {
  return `${pounds} lb`;
}

export function formatDraft(draft: DraftInfo): string {
  return `${draft.year}, Round ${draft.round}, Pick ${draft.pick}`;
}

export function formatTeamName(team: Pick<TeamProfile, 'city' | 'name'>): string {
  return `${team.city} ${team.name}`;
}

// Per-game averages render to one decimal place (`27` -> `27.0`). Contracts are the primary
// guard against bad data; these defensive checks ensure a non-finite value can never reach
// rendered text as `NaN`/`Infinity`.
export function formatPerGame(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Cannot format a non-finite per-game value: ${value}`);
  }

  return value.toFixed(1);
}

// Ratios in 0..1 render as a one-decimal percentage (`0.542` -> `54.2%`).
export function formatPercentage(ratio: number): string {
  if (!Number.isFinite(ratio)) {
    throw new RangeError(`Cannot format a non-finite percentage ratio: ${ratio}`);
  }

  return `${(ratio * 100).toFixed(1)}%`;
}
