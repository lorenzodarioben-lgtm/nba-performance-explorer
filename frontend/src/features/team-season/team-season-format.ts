import type { TeamSeasonGame } from '@nba-performance-explorer/contracts';

export type SeasonFocus =
  | 'all'
  | 'home'
  | 'away'
  | 'east'
  | 'west'
  | 'close'
  | 'back-to-back';

// Presentation filters over the games the API returned; the counts each one shows are the same
// definitions the backend uses for its splits (close = final margin of 5 or fewer).
export const FOCUS_OPTIONS: readonly { value: SeasonFocus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'east', label: 'vs East' },
  { value: 'west', label: 'vs West' },
  { value: 'close', label: 'Close' },
  { value: 'back-to-back', label: 'Back-to-back' },
];

export function focusMatches(game: TeamSeasonGame, focus: SeasonFocus) {
  switch (focus) {
    case 'all':
      return true;
    case 'home':
    case 'away':
      return game.location === focus;
    case 'east':
      return game.opponentConference === 'East';
    case 'west':
      return game.opponentConference === 'West';
    case 'close':
      return game.margin !== null && Math.abs(game.margin) <= 5;
    case 'back-to-back':
      return game.restDays === 0;
  }
}

/** A signed figure: +4.2, −3.0 (true minus sign), 0.0. */
export function signed(value: number | null, digits: number) {
  if (value === null) return '—';
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${value > 0 ? '+' : '−'}${text}`;
}

export function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}
