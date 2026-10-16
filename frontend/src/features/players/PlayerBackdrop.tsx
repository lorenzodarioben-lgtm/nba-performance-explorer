import { getPlayerImage } from './playerImages';

/**
 * The player's photo behind a page head (decorative; the page title names the player). A
 * headshot stands on the head's baseline; an action photo is framed with its own focal point.
 * Renders nothing for a player without a verified photo.
 */
export function PlayerBackdrop({ playerId }: { playerId: string }) {
  const image = getPlayerImage(playerId);
  if (!image) return null;
  const photo = image.kind === 'action' ? (image.portrait ?? image) : image;
  return (
    <span className={`roomshot roomshot--${image.kind}`}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(max-width: 767px) 50vw, 360px"
        width={photo.width}
        height={photo.height}
        alt=""
        decoding="async"
        fetchPriority="high"
        style={
          image.kind === 'action' ? { objectPosition: photo.objectPosition } : undefined
        }
      />
    </span>
  );
}
