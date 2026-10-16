// Player photography, mapped strictly by NBA person id so a profile never shows the wrong player's
// photo. Any player without an entry falls back to a photo-free composition (never a stand-in or
// another player's photo). The data lives in playerImageData.ts, generated from the owner-supplied
// assets by scripts/assets/build_visual_assets.py (docs/visual-assets/INTEGRATION_REPORT.md).
//
// Two kinds of image exist:
// - `action`: editorial game photography, shown cover-fit with a per-image focal point;
// - `headshot`: NBA.com's transparent portrait cutouts, shown contained and anchored to the bottom.
// A headshot's uniform is whatever the source photo shows; it is never evidence of a season's team.
import { PLAYER_IMAGE_DATA } from './playerImageData';

export interface PlayerImageVariant {
  src: string;
  /** Width descriptors for the responsive variants of this image. */
  srcSet: string;
  alt: string;
  width: number;
  height: number;
  // Per-image focal point so the crop keeps the player in frame across breakpoints.
  objectPosition: string;
}

export interface PlayerImage extends PlayerImageVariant {
  /** The player's name as the supplying manifest gives it (labels only, never identity). */
  name: string;
  /** editorial: game photography; current / legend: NBA.com headshot packs. */
  group: 'editorial' | 'current' | 'legend';
  kind: 'action' | 'headshot';
  /** A 192 px square face crop for compact lists, when one could be made from verified photos. */
  thumb?: string;
  /** An alternate photo for tall (3:4) frames, when a better-composed one was supplied. */
  portrait?: PlayerImageVariant;
}

export function getPlayerImage(playerId: string): PlayerImage | undefined {
  return Object.prototype.hasOwnProperty.call(PLAYER_IMAGE_DATA, playerId)
    ? PLAYER_IMAGE_DATA[playerId]
    : undefined;
}

/** The photo for a tall frame: the portrait alternate when there is one, else the main photo. */
export function getPortraitImage(playerId: string): PlayerImageVariant | undefined {
  const image = getPlayerImage(playerId);
  return image ? (image.portrait ?? image) : undefined;
}

export function getPlayerThumb(playerId: string): string | undefined {
  return getPlayerImage(playerId)?.thumb;
}

/** Every player id with a photo; used by tests and the asset inventory. */
export function playerImageIds(): string[] {
  return Object.keys(PLAYER_IMAGE_DATA);
}
