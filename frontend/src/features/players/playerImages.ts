// Editorial player photography, mapped strictly by NBA person id so a profile never shows the wrong
// player's photo. Any player without an entry falls back to a photo-free dark composition (never a
// stand-in or another player's photo). These are the same isolated, replaceable assets described in
// ADR-017; adding or swapping a mapping is a drop-in change with no layout or logic impact.
//
// Every id below is a real NBA person id verified against the application's own data (the fixture
// player set and the live search directory), never inferred from a photo. Ambiguous or unlabelled
// source files are deliberately left unmapped so they fall through to the photo-free composition.
export interface PlayerImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  // Per-image focal point so the crop keeps the player in frame across breakpoints.
  objectPosition: string;
}

const PLAYER_IMAGES: Record<string, PlayerImage> = {
  // Victor Wembanyama
  '1641705': {
    src: '/images/wembanyama-hero.webp',
    alt: 'Victor Wembanyama of the San Antonio Spurs holding the ball above a defender',
    width: 1140,
    height: 760,
    objectPosition: 'center 22%',
  },
  // Stephen Curry
  '201939': {
    src: '/images/curry-action.avif',
    alt: 'Stephen Curry of the Golden State Warriors during a game',
    width: 2400,
    height: 1422,
    objectPosition: 'center top',
  },
  // LeBron James
  '2544': {
    src: '/images/lebron-dunk.avif',
    alt: 'LeBron James rising toward the rim for a dunk',
    width: 1200,
    height: 1200,
    objectPosition: 'center',
  },
  // Kevin Durant
  '201142': {
    src: '/images/durant.avif',
    alt: 'Kevin Durant in action during an NBA game',
    width: 5000,
    height: 3333,
    objectPosition: 'center 28%',
  },
  // Giannis Antetokounmpo
  '203507': {
    src: '/images/giannis.avif',
    alt: 'Giannis Antetokounmpo driving during an NBA game',
    width: 1920,
    height: 1080,
    objectPosition: 'center 25%',
  },
  // Shai Gilgeous-Alexander
  '1628983': {
    src: '/images/shai-gilgeous-alexander.webp',
    alt: 'Shai Gilgeous-Alexander during an NBA game',
    width: 1067,
    height: 1600,
    objectPosition: 'center 18%',
  },
  // Donovan Mitchell
  '1628378': {
    src: '/images/donovan-mitchell.jpg',
    alt: 'Donovan Mitchell during an NBA game',
    width: 678,
    height: 452,
    objectPosition: 'center 28%',
  },
  // Luka Doncic
  '1629029': {
    src: '/images/luka-doncic.jpg',
    alt: 'Luka Doncic during an NBA game',
    width: 1200,
    height: 915,
    objectPosition: 'center 25%',
  },
  // Nikola Jokic
  '203999': {
    src: '/images/jokic.webp',
    alt: 'Nikola Jokic during an NBA game',
    width: 1500,
    height: 1000,
    objectPosition: 'center 22%',
  },
  // Joel Embiid
  '203954': {
    src: '/images/embiid.webp',
    alt: 'Joel Embiid during an NBA game',
    width: 2048,
    height: 1153,
    objectPosition: 'center 25%',
  },
  // Tyrese Haliburton
  '1630169': {
    src: '/images/haliburton.webp',
    alt: 'Tyrese Haliburton during an NBA game',
    width: 2560,
    height: 1707,
    objectPosition: 'center 25%',
  },
  // James Harden
  '201935': {
    src: '/images/harden.avif',
    alt: 'James Harden during an NBA game',
    width: 980,
    height: 1174,
    objectPosition: 'center 20%',
  },
  // Kawhi Leonard
  '202695': {
    src: '/images/kawhi-leonard.jpg',
    alt: 'Kawhi Leonard during an NBA game',
    width: 1920,
    height: 1081,
    objectPosition: 'center 22%',
  },
  // Cade Cunningham
  '1630595': {
    src: '/images/cade-cunningham.jpg',
    alt: 'Cade Cunningham during an NBA game',
    width: 640,
    height: 420,
    objectPosition: 'center 28%',
  },
};

export function getPlayerImage(playerId: string): PlayerImage | undefined {
  return PLAYER_IMAGES[playerId];
}
