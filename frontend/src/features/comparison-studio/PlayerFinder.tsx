import { useState } from 'react';

import { fold } from '../../shell/fold';

/** Type two letters of a recorded player's name; matching players appear as buttons. */
export function PlayerFinder({
  label = 'Add a player',
  players,
  exclude,
  onPick,
}: {
  players: readonly {
    playerId: string;
    name: string;
    teams: readonly { abbreviation: string }[];
  }[];
  exclude: readonly string[];
  onPick: (id: string) => void;
  label?: string;
}) {
  const [term, setTerm] = useState('');
  const needle = fold(term.trim());
  const matches =
    needle.length >= 2
      ? players
          .filter((p) => !exclude.includes(p.playerId) && fold(p.name).includes(needle))
          .slice(0, 8)
      : [];
  return (
    <div className="cs-finder">
      <label>
        {label}
        <input
          value={term}
          maxLength={60}
          placeholder="Type a name, e.g. Doncic"
          onChange={(e) => setTerm(e.target.value)}
        />
      </label>
      {matches.length ? (
        <ul className="cs-finder__list" aria-label="Matching recorded players">
          {matches.map((p) => (
            <li key={p.playerId}>
              <button
                type="button"
                className="reset cs-finder__pick"
                onClick={() => {
                  onPick(p.playerId);
                  setTerm('');
                }}
              >
                {p.name} <small>{p.teams.map((t) => t.abbreviation).join(' / ')}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : needle.length >= 2 ? (
        <p className="cs-finder__none">No recorded 2023–24 player matches.</p>
      ) : null}
    </div>
  );
}
