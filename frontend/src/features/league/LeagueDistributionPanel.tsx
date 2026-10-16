import { useQuery } from '@tanstack/react-query';
import {
  LeagueDistributionResponseSchema,
  type LeagueLeaderMetric,
  type LeagueScope,
} from '@nba-performance-explorer/contracts';
import { BarChart } from '../../charts/BarChart';
import { Slate } from '../../ui/Slate';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback } from './LeagueSourceNote';

/** The qualified league population for one measure, with an optional player marked. */
export function LeagueDistributionPanel({
  season,
  scope,
  metric,
  player,
  onClear,
}: {
  season: string;
  scope: LeagueScope;
  metric: LeagueLeaderMetric;
  player: string | null;
  onClear: () => void;
}) {
  const api = new URLSearchParams({ season, scope, metric });
  if (player) api.set('player', player);
  const query = useQuery({
    queryKey: ['league', 'distribution', api.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/distribution?${api}`,
        signal,
        LeagueDistributionResponseSchema.parse,
      ),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  const percent = /Percentage$/.test(metric);
  const fmt = (v: number) => (percent ? `${(v * 100).toFixed(1)}%` : v.toFixed(1));
  const markerBin =
    data?.marker?.value !== null && data?.marker?.value !== undefined
      ? data.bins.findIndex(
          (b, i) =>
            data.marker!.value! >= b.from &&
            (data.marker!.value! < b.to || i === data.bins.length - 1),
        )
      : -1;
  return (
    <section className="pmod" aria-labelledby="league-distribution">
      <Slate
        id="league-distribution"
        title="How the league is spread"
        tapes={[{ code: 'ƒ', source: 'Cohort', variant: 'derived' }]}
        meta={data ? [`n = ${data.n}`, seasonDisplay(data.query.season)] : []}
      />
      <LeagueFeedback pending={query.isPending} error={query.error} />
      {data ? (
        <>
          <p className="team-note">
            {data.definition} {percent ? '' : 'Per game. '}
            {data.qualification}
          </p>
          {data.summary ? (
            <BarChart
              label={`Distribution of ${metric} among ${data.n} qualified players`}
              data={data.bins.map((b, i) => ({
                key: String(i),
                label: `${fmt(b.from)} to ${fmt(b.to)}`,
                value: b.count,
                tone: i === markerBin ? 'accent' : 'default',
                detail: [{ label: 'Players', value: String(b.count) }],
              }))}
              format={(v) => String(Math.round(v))}
              tickLabel={(_, i) => fmt(data.bins[i]!.from)}
              height={200}
            />
          ) : (
            <p role="status">No qualified players for this measure.</p>
          )}
          {data.summary ? (
            <p className="league-population">
              Min {fmt(data.summary.min)} · Q1 {fmt(data.summary.q1)} · median{' '}
              {fmt(data.summary.median)} · Q3 {fmt(data.summary.q3)} · max{' '}
              {fmt(data.summary.max)} · mean {fmt(data.summary.mean)}
            </p>
          ) : null}
          {data.marker ? (
            <p role="status">
              <b>{data.marker.name}</b>:{' '}
              {data.marker.value === null
                ? data.marker.reason
                : `${fmt(data.marker.value)}, rank ${data.marker.rank} of ${data.n}, ${data.marker.percentile?.toFixed(1)}th percentile (highlighted bar).`}{' '}
              <button type="button" className="reset link-button" onClick={onClear}>
                Clear
              </button>
            </p>
          ) : (
            <p className="team-note">
              Choose “Mark” in the table to place a player on the distribution.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
