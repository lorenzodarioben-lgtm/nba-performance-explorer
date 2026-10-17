import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useId, useState } from 'react';
import { LeaguePlayerSearchResponseSchema } from '@nba-performance-explorer/contracts';
import { fetchLeague, seasonDisplay } from './league-api';

/** Finds players in the league archive (works offline); each result is a button. */
export function ArchivePlayerPicker({
  label,
  onPick,
  disabled = false,
}: {
  label: string;
  onPick: (player: { playerId: string; name: string }) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const deferred = useDeferredValue(text.trim());
  const id = useId();
  const query = useQuery({
    queryKey: ['league', 'player-search', deferred],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/player-search?q=${encodeURIComponent(deferred)}`,
        signal,
        LeaguePlayerSearchResponseSchema.parse,
      ),
    enabled: deferred.length >= 2,
    retry: false,
    staleTime: 60 * 60_000,
  });
  return (
    <div className="archive-picker">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        value={text}
        maxLength={60}
        disabled={disabled}
        placeholder="Type a name"
        onChange={(e) => setText(e.target.value)}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="team-note">
        Players with games in the archive (1983–84 on).
      </p>
      {deferred.length >= 2 && query.data ? (
        query.data.results.length ? (
          <ul
            className="archive-picker__results"
            aria-label={`Players matching ${deferred}`}
          >
            {query.data.results.map((r) => (
              <li key={r.playerId}>
                <button
                  type="button"
                  className="reset link-button"
                  onClick={() => {
                    onPick({ playerId: r.playerId, name: r.name });
                    setText('');
                  }}
                >
                  {r.name}
                </button>{' '}
                <small>
                  {seasonDisplay(r.firstSeason)} to {seasonDisplay(r.lastSeason)}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">No archived player matches “{deferred}”.</p>
        )
      ) : null}
    </div>
  );
}
