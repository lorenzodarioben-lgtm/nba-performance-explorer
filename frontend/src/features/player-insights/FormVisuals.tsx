import type {
  PlayerInsightsResponse,
  GameSummaryStats,
} from '@nba-performance-explorer/contracts';

import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';
import { FlipValue, Stagger, StaggerItem } from '../../motion/choreography';
import { NullValue } from '../../ui/DataState';

const SERIES = [
  { id: 'points', label: 'Points', color: '#3b82f6', dash: undefined, shape: 'circle' },
  { id: 'rebounds', label: 'Rebounds', color: '#bd8008', dash: '6 3', shape: 'square' },
  { id: 'assists', label: 'Assists', color: '#0ea594', dash: '2 4', shape: 'triangle' },
] as const;

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

function shortDate(date: string) {
  const [, month, day] = date.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}`;
}

/** Trailing-window averages across the filtered games, oldest to newest. */
export function FormChart({
  rolling,
  window,
}: {
  rolling: PlayerInsightsResponse['rolling'];
  window: number;
}) {
  const series = SERIES.map((entry) => ({
    ...entry,
    values: rolling.map((row) => row.summary[entry.id]),
  }));
  return (
    <div className="panel frchart" data-chart="rolling-form">
      <ChartLegend items={series} />
      <LineChart
        label={`Rolling ${window}-game averages for points, rebounds and assists`}
        categories={rolling.map((row) => row.date)}
        series={series}
        height={280}
        format={(value) => value.toFixed(1)}
        formatCategory={shortDate}
        footnote={`Each point averages the trailing ${window} matching games, including that game; early points use fewer games.`}
      />
    </div>
  );
}

function Figure({ value }: { value: number | null }) {
  return value === null ? <NullValue /> : <FlipValue value={value.toFixed(1)} />;
}

/** All matching games against the most recent window, as two broadcast scoreboards. */
export function FormScoreboard({
  summary,
  recent,
  window,
}: {
  summary: GameSummaryStats;
  recent: GameSummaryStats;
  window: number;
}) {
  const columns = [
    { key: 'points', label: 'PTS' },
    { key: 'rebounds', label: 'REB' },
    { key: 'assists', label: 'AST' },
    { key: 'minutes', label: 'MIN' },
  ] as const;
  const boards = [
    { title: 'All matching games', stats: summary },
    { title: `Last ${window}`, stats: recent },
  ];
  return (
    <Stagger className="formboard" gap={0.1}>
      {boards.map((board) => (
        <StaggerItem key={board.title} className="formboard__board">
          <p className="formboard__title">
            {board.title}
            <span>
              {board.stats.sample} {board.stats.sample === 1 ? 'game' : 'games'} ·{' '}
              {board.stats.wins}–{board.stats.losses}
            </span>
          </p>
          <dl className="formboard__row">
            {columns.map((column) => (
              <div key={column.key}>
                <dt>{column.label}</dt>
                <dd>
                  <Figure value={board.stats[column.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
