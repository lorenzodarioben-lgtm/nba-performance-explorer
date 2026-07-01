// Editorial player photography, mapped strictly by NBA person id so a profile never shows the wrong
// player's photo. Any player without an entry falls back to a photo-free dark composition. These are
// the same isolated, replaceable assets described in ADR-017; adding or swapping a mapping is a
// drop-in change with no layout or logic impact.
export interface PlayerImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  // Per-image focal point so the crop keeps the player in frame across breakpoints.
  objectPosition: string;
}

const PLAYER_IMAGES: Record<string, PlayerImage> = {
  // Victor Wembanyama (San Antonio Spurs)
  '1641705': {
    src: '/images/wembanyama-hero.webp',
    alt: 'Victor Wembanyama of the San Antonio Spurs holding the ball above a defender',
    width: 1140,
    height: 760,
    objectPosition: 'center 22%',
  },
  // Stephen Curry (Golden State Warriors)
  '201939': {
    src: '/images/curry-action.avif',
    alt: 'Stephen Curry of the Golden State Warriors during a game',
    width: 2400,
    height: 1422,
    objectPosition: 'center top',
  },
  // LeBron James (Los Angeles Lakers)
  '2544': {
    src: '/images/lebron-dunk.avif',
    alt: 'LeBron James rising toward the rim for a dunk',
    width: 1200,
    height: 1200,
    objectPosition: 'center',
  },
};

export function getPlayerImage(playerId: string): PlayerImage | undefined {
  return PLAYER_IMAGES[playerId];
}
