import type { GameLocation, TeamSummary } from '@nba-performance-explorer/contracts';

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function formatGameDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError('Game date must use YYYY-MM-DD.');
  }

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const monthName = monthNames[month - 1];

  if (monthName === undefined || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError('Game date must be a real calendar date.');
  }

  return `${day} ${monthName} ${year}`;
}

export function formatMatchup(
  location: GameLocation,
  opponentAbbreviation: TeamSummary['abbreviation'],
): string {
  return `${location === 'home' ? 'vs' : '@'} ${opponentAbbreviation}`;
}
