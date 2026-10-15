// Play-by-play normalisation and scoring analysis. Two NBA.com formats are read: the CDN live
// feed (2019-20 on; every action carries the running score) and the Stats v3 feed (older games;
// the score is set only on scoring actions, so it is carried forward). Everything derived here —
// lead changes, ties, largest leads and scoring runs — comes from the ordered score states, never
// from period totals.
import type {
  LeaguePlayAnalysis,
  LeaguePlayEvent,
  LeagueRun,
} from '@nba-performance-explorer/contracts';

type EventType = LeaguePlayEvent['type'];
export const RUN_THRESHOLD = 8;

const periodLength = (period: number) => (period <= 4 ? 720 : 300);
/** "PT11M39.00S" or "11:39" → seconds remaining in the period. */
export function clockSeconds(clock: unknown): number | null {
  if (typeof clock !== 'string') return null;
  const iso = /^PT(\d+)M(\d+(?:\.\d+)?)S$/.exec(clock);
  if (iso) return Number(iso[1]) * 60 + Number(iso[2]);
  const mmss = /^(\d+):(\d+(?:\.\d+)?)$/.exec(clock);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  return null;
}
const clockText = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export function elapsedSeconds(period: number, remaining: number) {
  let before = 0;
  for (let p = 1; p < period; p++) before += periodLength(p);
  return before + Math.max(0, periodLength(period) - remaining);
}

const CDN_TYPES: Record<string, EventType> = {
  freethrow: 'free-throw',
  rebound: 'rebound',
  turnover: 'turnover',
  steal: 'steal',
  block: 'block',
  foul: 'foul',
  violation: 'violation',
  substitution: 'substitution',
  timeout: 'timeout',
  jumpball: 'jump-ball',
  period: 'period',
  game: 'game',
};
const V3_TYPES: Record<string, EventType> = {
  'Made Shot': 'made-shot',
  'Missed Shot': 'missed-shot',
  'Free Throw': 'free-throw',
  Rebound: 'rebound',
  Turnover: 'turnover',
  Foul: 'foul',
  Violation: 'violation',
  Substitution: 'substitution',
  Timeout: 'timeout',
  'Jump Ball': 'jump-ball',
  period: 'period',
};

interface RawEvent {
  period: number;
  remaining: number;
  side: 'home' | 'away' | null;
  playerId: string | null;
  player: string | null;
  type: EventType;
  description: string;
  /** The running score after this action, or null when the action does not set one. */
  score: [number, number] | null;
}
const num = (v: unknown) =>
  typeof v === 'number'
    ? v
    : typeof v === 'string' && v.trim() !== ''
      ? Number(v)
      : NaN;
const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const playerIdOf = (v: unknown) => (typeof v === 'number' && v > 0 ? String(v) : null);

export function readCdnActions(actions: unknown[], homeId: number): RawEvent[] {
  const out: RawEvent[] = [];
  for (const raw of actions) {
    const a = raw as Record<string, unknown>;
    const period = num(a.period);
    const remaining = clockSeconds(a.clock);
    if (!Number.isInteger(period) || period < 1 || remaining === null) continue;
    const kind = text(a.actionType, 30);
    const type: EventType =
      kind === '2pt' || kind === '3pt'
        ? a.shotResult === 'Made'
          ? 'made-shot'
          : 'missed-shot'
        : (CDN_TYPES[kind] ?? 'other');
    const h = num(a.scoreHome),
      w = num(a.scoreAway);
    const teamId = num(a.teamId);
    out.push({
      period,
      remaining,
      side:
        Number.isFinite(teamId) && teamId > 0
          ? teamId === homeId
            ? 'home'
            : 'away'
          : null,
      playerId: playerIdOf(a.personId),
      player: text(a.playerNameI, 80) || null,
      type,
      description: text(a.description, 200) || kind,
      score: Number.isFinite(h) && Number.isFinite(w) ? [h, w] : null,
    });
  }
  return out;
}

export function readV3Actions(actions: unknown[]): RawEvent[] {
  const out: RawEvent[] = [];
  for (const raw of actions) {
    const a = raw as Record<string, unknown>;
    const period = num(a.period);
    const remaining = clockSeconds(a.clock);
    if (!Number.isInteger(period) || period < 1 || remaining === null) continue;
    const kind = text(a.actionType, 30);
    const h = num(a.scoreHome),
      w = num(a.scoreAway);
    // v3 fills the score only on scoring actions (pointsTotal > 0); elsewhere it reads 0-0.
    const sets = num(a.pointsTotal) > 0 && Number.isFinite(h) && Number.isFinite(w);
    out.push({
      period,
      remaining,
      side: a.location === 'h' ? 'home' : a.location === 'v' ? 'away' : null,
      playerId: playerIdOf(a.personId),
      player: text(a.playerNameI, 80) || null,
      type:
        V3_TYPES[kind] ??
        (/STEAL/i.test(String(a.description))
          ? 'steal'
          : /BLOCK/i.test(String(a.description))
            ? 'block'
            : 'other'),
      description: text(a.description, 200) || kind || 'Event',
      score: sets ? [h, w] : null,
    });
  }
  return out;
}

/** Orders events, carries the score forward and records each event's scoring delta. */
export function toEvents(raw: RawEvent[]): {
  events: LeaguePlayEvent[];
  corrections: number;
} {
  let home = 0,
    away = 0,
    corrections = 0;
  const events: LeaguePlayEvent[] = [];
  raw.forEach((r, i) => {
    const [h, w] = r.score ?? [home, away];
    const dh = h - home,
      dw = w - away;
    if (dh < 0 || dw < 0) corrections++;
    events.push({
      index: i,
      period: r.period,
      clock: clockText(r.remaining),
      elapsed: elapsedSeconds(r.period, r.remaining),
      team: r.side,
      playerId: r.playerId,
      player: r.player,
      type: r.type,
      description: r.description,
      home: h,
      away: w,
      points: dh + dw,
      scoringTeam: dh > 0 && dw === 0 ? 'home' : dw > 0 && dh === 0 ? 'away' : null,
    });
    home = h;
    away = w;
  });
  return { events, corrections };
}

/**
 * Lead changes: the leading team switches (ties in between do not count as a change on their
 * own). Times tied: a scoring action that leaves the score level (0-0 at tip-off excluded).
 * Runs: consecutive points by one team with none by the other; a score correction ends a run.
 */
export function analyse(
  events: LeaguePlayEvent[],
  corrections: number,
): LeaguePlayAnalysis {
  let leadChanges = 0,
    timesTied = 0,
    leader: 'home' | 'away' | null = null;
  const largest = {
    home: { points: 0, atIndex: null as number | null },
    away: { points: 0, atIndex: null as number | null },
  };
  const runs: LeagueRun[] = [];
  let current: LeagueRun | null = null;
  const closeRun = () => {
    if (current && current.points >= 1) runs.push(current);
    current = null;
  };
  let prev = { home: 0, away: 0 };
  for (const e of events) {
    if (e.points < 0 || (e.points !== 0 && e.scoringTeam === null)) {
      // A correction or a simultaneous change: no run continues across it.
      closeRun();
    } else if (e.points > 0 && e.scoringTeam) {
      const run = current as LeagueRun | null;
      if (run && run.team === e.scoringTeam) {
        run.points += e.points;
        run.endIndex = e.index;
        run.endScore = `${e.home}-${e.away}`;
      } else {
        closeRun();
        current = {
          team: e.scoringTeam,
          points: e.points,
          startIndex: e.index,
          endIndex: e.index,
          startScore: `${prev.home}-${prev.away}`,
          endScore: `${e.home}-${e.away}`,
          period: e.period,
        };
      }
    }
    if (e.points !== 0) {
      const margin = e.home - e.away;
      if (margin === 0) {
        if (e.home + e.away > 0) timesTied++;
      } else {
        const now = margin > 0 ? 'home' : 'away';
        if (leader && now !== leader) leadChanges++;
        leader = now;
      }
      if (margin > largest.home.points)
        largest.home = { points: margin, atIndex: e.index };
      if (-margin > largest.away.points)
        largest.away = { points: -margin, atIndex: e.index };
    }
    prev = { home: e.home, away: e.away };
  }
  closeRun();
  const biggest = (team: 'home' | 'away') =>
    runs
      .filter((r) => r.team === team)
      .reduce<LeagueRun | null>((b, r) => (!b || r.points > b.points ? r : b), null);
  const periodScores: LeaguePlayAnalysis['periodScores'] = [];
  let before = { home: 0, away: 0 };
  for (const period of [...new Set(events.map((e) => e.period))].sort(
    (a, b) => a - b,
  )) {
    const last = events.filter((e) => e.period === period).at(-1)!;
    periodScores.push({
      period,
      home: last.home - before.home,
      away: last.away - before.away,
    });
    before = { home: last.home, away: last.away };
  }
  return {
    leadChanges,
    timesTied,
    largestLead: largest,
    runs: runs.filter((r) => r.points >= RUN_THRESHOLD),
    runThreshold: RUN_THRESHOLD,
    biggestRun: { home: biggest('home'), away: biggest('away') },
    periodScores,
    scoreCorrections: corrections,
  };
}
