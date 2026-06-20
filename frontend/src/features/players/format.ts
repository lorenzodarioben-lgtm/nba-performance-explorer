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
