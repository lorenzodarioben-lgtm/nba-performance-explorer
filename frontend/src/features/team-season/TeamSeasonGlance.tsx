import { useQuery } from '@tanstack/react-query';
import { RecordedTeamSeasonResponseSchema } from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { signed } from './team-season-format';

/**
 * A team hub's one-line summary of its recorded 2023–24 season, from the same cached query as
 * the season room. Renders nothing until the data is there, and nothing if it never arrives.
 */
export function TeamSeasonGlance({ team }: { team: string }) {
  const query = useQuery({
    queryKey: ['research', 'recorded-team-season', team],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/team-season?team=${encodeURIComponent(team)}`,
        signal,
        RecordedTeamSeasonResponseSchema.parse,
      ),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  if (!data) return null;
  const by = Object.fromEntries(data.splits.map((s) => [s.key, s]));
  const all = by.all!;
  return (
    <dl className="glance" aria-label="Recorded 2023–24 season at a glance">
      <div>
        <dt>Record</dt>
        <dd>
          {all.wins}–{all.losses}
        </dd>
      </div>
      <div>
        <dt>Margin</dt>
        <dd>{signed(all.marginPerGame, 1)}</dd>
      </div>
      {by.home && by.away ? (
        <div>
          <dt>Home · Away</dt>
          <dd>
            {by.home.wins}–{by.home.losses} · {by.away.wins}–{by.away.losses}
          </dd>
        </div>
      ) : null}
      {data.longestWinStreak ? (
        <div>
          <dt>Best streak</dt>
          <dd>{data.longestWinStreak.length} W</dd>
        </div>
      ) : null}
    </dl>
  );
}
