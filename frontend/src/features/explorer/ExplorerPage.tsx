import { CapabilityResponseSchema } from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchShell } from '../research/ResearchShell';

export function ExplorerPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['research', 'capabilities'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/data-sources/status', signal, (v) =>
        CapabilityResponseSchema.parse(v),
      ),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <ResearchShell title="NBA Explorer">
      <p>
        Functional research tools. The original home, player profiles and two-player
        comparison remain available.
      </p>
      <PlayerCombobox
        label="Find a player for insights"
        onSelect={(player) => {
          void navigate(`/players/${player.id}/insights`);
        }}
      />
      <h2>Data capabilities</h2>
      <QueryFeedback pending={query.isPending} failed={query.isError} />
      {query.data && (
        <>
          <p>
            <strong>
              {query.data.playerSource === 'fixture'
                ? 'DEMO MODE: player results are deterministic fixtures.'
                : `Configured player source: ${query.data.playerSource}`}
            </strong>
          </p>
          <p>
            Configuration report only; source freshness and deployment-host reachability
            are unverified.
          </p>
          <ul>
            {query.data.capabilities.map((capability) => (
              <li key={capability.id}>
                <strong>
                  {capability.id}: {capability.status}
                </strong>{' '}
                — {capability.reason}
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        Historical standings, published category leaders and recorded playoff games are
        available through separately attributed snapshot tools. Live/current league
        feeds and observed lineups require additional verified source coverage. The
        separate recorded shot studio covers part of the2018 playoffs with CC0 events
        and explicit coverage/coordinate evidence.
      </p>
    </ResearchShell>
  );
}
