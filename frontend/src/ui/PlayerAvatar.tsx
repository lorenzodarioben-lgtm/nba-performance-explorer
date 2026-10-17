import { getPlayerThumb } from '../features/players/playerImages';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * A compact round face for lists and tables, keyed by NBA person id. Players without a verified
 * photo show their initials, never another player's face. Decorative: the name is printed beside it.
 */
export function PlayerAvatar({
  playerId,
  name,
  size = 32,
  className = '',
}: {
  playerId: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const thumb = getPlayerThumb(playerId);
  const box = { width: size, height: size };
  return thumb ? (
    <img
      className={`pavatar ${className}`}
      src={thumb}
      width={size}
      height={size}
      style={box}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      data-player-photo={playerId}
    />
  ) : (
    <span
      className={`pavatar pavatar--initials ${className}`}
      style={{ ...box, fontSize: Math.max(9, Math.round(size * 0.36)) }}
      aria-hidden="true"
      data-player-photo="none"
    >
      {initials(name)}
    </span>
  );
}
