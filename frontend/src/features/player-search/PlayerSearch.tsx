import { useNavigate } from 'react-router';

import { PlayerCombobox } from './PlayerCombobox';

// The home-page player search: the shared combobox wired to navigate to the selected player's
// profile. All search behaviour lives in `PlayerCombobox`; this only chooses layout and tone so the
// same accessible control can sit on the dark hero or a light view.
export function PlayerSearch({
  tone = 'light',
  className = 'mt-8 max-w-xl',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <PlayerCombobox
      label="Search NBA players"
      tone={tone}
      className={className}
      onSelect={(player) => {
        navigate(`/players/${encodeURIComponent(player.id)}`);
      }}
    />
  );
}
