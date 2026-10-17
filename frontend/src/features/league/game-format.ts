import type { LeagueGameSummary } from '@nba-performance-explorer/contracts';

const MONTHS = [
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
];
/** A calendar date as NBA.com lists it (the US Eastern game date); never shifted. */
export const longDate = (date: string) =>
  `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8))}, ${date.slice(0, 4)}`;
const periodLabel = (p: number) => (p <= 4 ? `Q${p}` : p === 5 ? 'OT' : `${p - 4}OT`);
/** Tip-off in the reader's own time zone, from the source's UTC time. */
export const tipOff = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));

/** The state line: the source's own state, with period and clock only when supplied. */
export function statusLine(g: LeagueGameSummary) {
  switch (g.status) {
    case 'scheduled':
      return g.startTimeTbd || !g.startTimeUtc
        ? 'Scheduled · time to be decided'
        : `Scheduled · ${tipOff(g.startTimeUtc)}`;
    case 'live':
      return `Live${g.period ? ` · ${periodLabel(g.period)}${g.clock ? ` ${g.clock}` : ''}` : ''}`;
    case 'final':
      return g.overtimePeriods
        ? `Final · ${g.overtimePeriods > 1 ? `${g.overtimePeriods}OT` : 'OT'}`
        : 'Final';
    case 'postponed':
      return 'Postponed';
    case 'canceled':
      return 'Not played';
    default:
      return g.statusText || 'State not reported';
  }
}
