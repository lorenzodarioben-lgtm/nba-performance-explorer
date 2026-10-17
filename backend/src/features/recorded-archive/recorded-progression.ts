import {
  type RecordedProgressionQuery,
  type RecordedProgressionResponse,
  type VerifiedRecordedGame,
} from '@nba-performance-explorer/contracts';
export function observedProgression(
  games: readonly VerifiedRecordedGame[],
  q: RecordedProgressionQuery,
  from: string,
  to: string,
) {
  const valueOf = (g: VerifiedRecordedGame) =>
    q.metric === 'combinedPoints'
      ? g.homeScore + g.awayScore
      : q.metric === 'finalMargin'
        ? Math.abs(g.homeScore - g.awayScore)
        : q.team
          ? g.home.id === q.team
            ? g.homeScore
            : g.awayScore
          : Math.max(g.homeScore, g.awayScore);
  const groups = new Map<string, VerifiedRecordedGame[]>();
  for (const g of games)
    if (
      g.date >= from &&
      g.date <= to &&
      (!q.team || g.home.id === q.team || g.away.id === q.team)
    )
      groups.set(g.date, [...(groups.get(g.date) ?? []), g]);
  const series: RecordedProgressionResponse['series'] = [],
    progression: RecordedProgressionResponse['progression'] = [];
  let high: number | null = null;
  for (
    let stamp = Date.parse(`${from}T12:00:00Z`);
    stamp <= Date.parse(`${to}T12:00:00Z`);
    stamp += 86400000
  ) {
    if (series.length >= 300) throw new Error('Recorded date-window cap exceeded.');
    const date = new Date(stamp).toISOString().slice(0, 10),
      rows = groups.get(date) ?? [],
      values = rows.map(valueOf),
      dayHigh = values.length ? Math.max(...values) : null;
    series.push({
      date,
      games: rows.length,
      meanValue:
        rows.length >= q.minDailyGames
          ? values.reduce((s, n) => s + n, 0) / rows.length
          : null,
      highValue: dayHigh,
    });
    if (dayHigh !== null && (high === null || dayHigh >= high)) {
      progression.push({
        date,
        previousHigh: high,
        value: dayHigh,
        kind: high === null || dayHigh > high ? 'new-high' : 'ties-current-high',
        games: rows
          .filter((g) => valueOf(g) === dayHigh)
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
      high = dayHigh;
    }
  }
  return {
    series,
    progression,
    matchingGames: [...groups.values()].reduce((s, a) => s + a.length, 0),
  };
}
