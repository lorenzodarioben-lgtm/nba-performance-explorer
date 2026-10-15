import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { RecordedDirectorySchema } from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { linkLeaderNames } from './leader-links';

/** A published leader label with exact-match player names linked to their 2023-24 rooms. */
export function LeaderText({ text, teamId }: { text: string | null; teamId: string }) {
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  if (text === null) return <>Unavailable</>;
  const players =
    directory.data?.players.filter((p) => p.teams.some((t) => t.id === teamId)) ?? [];
  return (
    <>
      {linkLeaderNames(text, players).map((s, i) =>
        s.playerId ? (
          <Link key={i} to={`/players/${s.playerId}/archive`}>
            {s.text}
          </Link>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
