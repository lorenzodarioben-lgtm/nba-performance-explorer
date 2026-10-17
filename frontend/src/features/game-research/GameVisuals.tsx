import type { GameResearchResponse } from '@nba-performance-explorer/contracts';

import { BarChart } from '../../charts/BarChart';
import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';

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
const shortDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}`;
};

/** Points in each game on the current ledger page, in date order, with the result encoded. */
export function LedgerBars({ games }: { games: GameResearchResponse['games'] }) {
  const ordered = [...games].sort((a, b) => a.game.date.localeCompare(b.game.date));
  return (
    <div className="panel frchart" data-chart="ledger-points">
      <ChartLegend
        items={[
          { id: 'w', label: 'Points in a win', color: '#cfcdc9' },
          { id: 'l', label: 'Points in a loss', color: '#6c6b69' },
        ]}
      />
      <BarChart
        label="Points in each game on this ledger page, in date order"
        format={(value) => String(Math.round(value))}
        height={200}
        color="#cfcdc9"
        data={ordered.map(({ game, raw }) => ({
          key: game.id,
          label: `${shortDate(game.date)} ${game.location === 'home' ? 'vs' : '@'} ${game.opponent.abbreviation}`,
          value: game.points,
          tone: game.result === 'W' ? 'default' : 'muted',
          detail: [
            { label: 'Result', value: game.result === 'W' ? 'Win' : 'Loss' },
            { label: 'Minutes', value: String(game.minutes) },
            {
              label: 'FG',
              value:
                raw.fieldGoalsMade === null || raw.fieldGoalsAttempted === null
                  ? 'Unavailable'
                  : `${raw.fieldGoalsMade}/${raw.fieldGoalsAttempted}`,
            },
          ],
        }))}
        tickLabel={(datum) => datum.label.split(' ').slice(0, 2).join(' ')}
      />
    </div>
  );
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Trailing-window shooting efficiency; windows below the attempt minimum stay gaps. */
export function RollingEfficiency({
  rolling,
  window,
}: {
  rolling: GameResearchResponse['rolling'];
  window: number;
}) {
  const series = [
    {
      id: 'ts',
      label: 'TS%',
      color: '#3b82f6',
      shape: 'circle' as const,
      values: rolling.map((row) => row.summary.metrics.trueShooting),
    },
    {
      id: 'efg',
      label: 'eFG%',
      color: '#0ea594',
      dash: '6 3',
      shape: 'square' as const,
      values: rolling.map((row) => row.summary.metrics.effectiveFieldGoal),
    },
  ];
  return (
    <div className="panel frchart" data-chart="rolling-efficiency">
      <ChartLegend items={series} />
      <LineChart
        label={`Rolling ${window}-game true shooting and effective field-goal percentage`}
        categories={rolling.map((row) => row.date)}
        series={series}
        height={240}
        format={pct}
        formatCategory={shortDate}
        footnote="Attempt-weighted across each trailing window; a window without attempts is a gap."
      />
    </div>
  );
}
