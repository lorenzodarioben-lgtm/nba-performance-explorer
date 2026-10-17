import { GameDateSchema } from '@nba-performance-explorer/contracts';
export function shiftCalendarDate(value: string, days: -1 | 1): string {
  GameDateSchema.parse(value);
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
