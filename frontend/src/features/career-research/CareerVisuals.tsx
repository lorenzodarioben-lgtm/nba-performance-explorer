import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';
import { alignToSeasons, fillSeasonGaps, shortSeason } from '../player-hub/seasons';

interface CareerRow {
  totals: { season: string };
  pointsPerGame: number | null;
  reboundsPerGame: number | null;
  assistsPerGame: number | null;
}

const SERIES = [
  { id: 'pointsPerGame', label: 'PTS/G', color: '#3b82f6', shape: 'circle' },
  {
    id: 'reboundsPerGame',
    label: 'REB/G',
    color: '#bd8008',
    dash: '6 3',
    shape: 'square',
  },
  {
    id: 'assistsPerGame',
    label: 'AST/G',
    color: '#0ea594',
    dash: '2 4',
    shape: 'triangle',
  },
] as const;

/** The reported career on a calendar axis: unreported seasons are gaps, never bridged. */
export function CareerArc({
  seasons,
  scope,
}: {
  seasons: readonly CareerRow[];
  scope: string;
}) {
  const axis = fillSeasonGaps(seasons.map((row) => row.totals.season));
  const series = SERIES.map((entry) => ({
    ...entry,
    values: alignToSeasons(
      axis,
      seasons,
      (row) => row.totals.season,
      (row) => row[entry.id],
    ),
  }));
  const gaps = axis.length - new Set(seasons.map((row) => row.totals.season)).size;
  return (
    <div className="panel frchart" data-chart="career-arc">
      <ChartLegend items={series} />
      <LineChart
        label={`Reported ${scope} career: points, rebounds and assists per game by season`}
        categories={axis}
        series={series}
        height={300}
        format={(value) => value.toFixed(1)}
        formatCategory={shortSeason}
        footnote={
          gaps > 0
            ? `${gaps} season${gaps === 1 ? '' : 's'} not reported in this scope; the lines break there.`
            : 'Every season in range is reported in this scope.'
        }
      />
    </div>
  );
}
