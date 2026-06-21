import { useNavigate } from 'react-router';

import { PlayerCombobox } from './PlayerCombobox';

// The home-page player search: the shared combobox wired to navigate to the selected player's
// profile. All search behaviour lives in `PlayerCombobox`.
export function PlayerSearch() {
  const navigate = useNavigate();

  return (
    <PlayerCombobox
      label="Search NBA players"
      className="mt-8 max-w-xl"
      onSelect={(player) => {
        navigate(`/players/${encodeURIComponent(player.id)}`);
      }}
    />
  );
}
