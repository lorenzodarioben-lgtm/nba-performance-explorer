import { describe, expect, it } from 'vitest';
import {
  analyse,
  clockSeconds,
  elapsedSeconds,
  readCdnActions,
  readV3Actions,
  toEvents,
} from './league-pbp.js';

const HOME = 1610612749;
const AWAY = 1610612737;
/** A CDN-format action: the running score is on every action. */
const cdn = (
  period: number,
  clock: string,
  team: number | 0,
  type: string,
  home: number,
  away: number,
  made = true,
) => ({
  period,
  clock: `PT${clock.split(':')[0]}M${clock.split(':')[1]}.00S`,
  teamId: team,
  actionType: type,
  shotResult: made ? 'Made' : 'Missed',
  scoreHome: String(home),
  scoreAway: String(away),
  description: `${type} ${home}-${away}`,
  personId: team ? 2544 : 0,
  playerNameI: team ? 'L. James' : '',
});
const run = (actions: ReturnType<typeof cdn>[]) => {
  const { events, corrections } = toEvents(readCdnActions(actions, HOME));
  return { events, a: analyse(events, corrections) };
};

describe('play-by-play clock and order', () => {
  it('reads both clock formats and counts elapsed time through overtime', () => {
    expect(clockSeconds('PT11M39.00S')).toBe(699);
    expect(clockSeconds('4:31')).toBe(271);
    expect(clockSeconds('soon')).toBeNull();
    expect(elapsedSeconds(1, 720)).toBe(0);
    expect(elapsedSeconds(4, 0)).toBe(2880);
    expect(elapsedSeconds(5, 0)).toBe(3180); // one 5-minute overtime
  });

  it('carries the v3 score forward between scoring actions', () => {
    const v3 = [
      {
        period: 1,
        clock: 'PT11M30.00S',
        actionType: 'Made Shot',
        location: 'v',
        scoreHome: '0',
        scoreAway: '2',
        pointsTotal: 2,
        description: 'Layup',
      },
      {
        period: 1,
        clock: 'PT11M20.00S',
        actionType: 'Missed Shot',
        location: 'h',
        scoreHome: '0',
        scoreAway: '0',
        pointsTotal: 0,
        description: 'Miss',
      },
      {
        period: 1,
        clock: 'PT11M10.00S',
        actionType: 'Made Shot',
        location: 'h',
        scoreHome: '3',
        scoreAway: '2',
        pointsTotal: 5,
        description: '3PT',
      },
    ];
    const { events } = toEvents(readV3Actions(v3));
    expect(events.map((e) => [e.home, e.away, e.points, e.scoringTeam])).toEqual([
      [0, 2, 2, 'away'],
      [0, 2, 0, null],
      [3, 2, 3, 'home'],
    ]);
  });
});

describe('scoring analysis', () => {
  it('counts lead changes only when the leader switches, and ties excluding tip-off', () => {
    const { a } = run([
      cdn(1, '12:00', 0, 'period', 0, 0),
      cdn(1, '11:40', HOME, '2pt', 2, 0), // home leads
      cdn(1, '11:20', AWAY, '2pt', 2, 2), // tie
      cdn(1, '11:00', AWAY, '3pt', 2, 5), // away leads: change 1
      cdn(1, '10:40', HOME, '3pt', 5, 5), // tie
      cdn(1, '10:20', AWAY, 'freethrow', 5, 6), // away again: no change
      cdn(1, '10:00', HOME, '3pt', 8, 6), // home: change 2
    ]);
    expect(a.leadChanges).toBe(2);
    expect(a.timesTied).toBe(2);
    expect(a.largestLead).toEqual({
      home: { points: 2, atIndex: 1 },
      away: { points: 3, atIndex: 3 },
    });
  });

  it('finds runs of unanswered points across periods and ends them at a correction', () => {
    const { a } = run([
      cdn(1, '1:00', HOME, '3pt', 3, 0),
      cdn(1, '0:30', HOME, '3pt', 6, 0),
      cdn(2, '11:40', HOME, '2pt', 8, 0), // the run continues into the next period
      cdn(2, '11:00', AWAY, '2pt', 8, 2),
      cdn(2, '10:30', HOME, '3pt', 11, 2),
      cdn(2, '10:20', HOME, '3pt', 8, 2), // correction: the three is taken back
      cdn(2, '10:00', HOME, '2pt', 10, 2),
    ]);
    expect(a.runs).toEqual([
      {
        team: 'home',
        points: 8,
        startIndex: 0,
        endIndex: 2,
        startScore: '0-0',
        endScore: '8-0',
        period: 1,
      },
    ]);
    expect(a.biggestRun.away?.points).toBe(2);
    expect(a.scoreCorrections).toBe(1);
    // The corrected three does not join the next basket into one run.
    expect(a.biggestRun.home?.points).toBe(8);
  });

  it('splits period scores from the score at each period’s last event', () => {
    const { a } = run([
      cdn(1, '0:00', HOME, '2pt', 20, 18),
      cdn(2, '0:00', AWAY, '2pt', 41, 44),
      cdn(5, '0:00', HOME, '2pt', 110, 108),
    ]);
    expect(a.periodScores).toEqual([
      { period: 1, home: 20, away: 18 },
      { period: 2, home: 21, away: 26 },
      { period: 5, home: 69, away: 64 },
    ]);
  });

  it('marks missed shots as non-scoring and keeps actors and sides', () => {
    const { events } = run([
      cdn(1, '11:00', AWAY, '2pt', 0, 0, false),
      cdn(1, '10:00', AWAY, '2pt', 0, 2),
    ]);
    expect(events[0]).toMatchObject({
      type: 'missed-shot',
      team: 'away',
      points: 0,
      playerId: '2544',
    });
    expect(events[1]).toMatchObject({
      type: 'made-shot',
      scoringTeam: 'away',
      points: 2,
    });
  });
});
