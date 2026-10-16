import { describe, expect, it } from 'vitest';

import {
  getPlayerImage,
  getPlayerThumb,
  getPortraitImage,
  playerImageIds,
} from './playerImages';

// The registry maps strictly by NBA person id. Editorial ids are the ones verified in 3.0 against
// the app's own data; headshot ids come from the supplying manifests (docs/visual-assets). A
// mapping resolving to the wrong file would be a wrong-player photo.
const EDITORIAL: Record<string, string> = {
  '1641705': '/images/players/action/wembanyama-1199.webp', // Victor Wembanyama
  '201939': '/images/players/action/curry-1600.webp', // Stephen Curry
  '2544': '/images/players/action/lebron-1254.webp', // LeBron James
  '201142': '/images/players/action/durant-1600.webp', // Kevin Durant
  '203507': '/images/players/action/giannis-1600.webp', // Giannis Antetokounmpo
  '1628983': '/images/players/action/gilgeous-alexander-1067.webp', // Shai Gilgeous-Alexander
  '1628378': '/images/players/action/mitchell-1536.webp', // Donovan Mitchell
  '1629029': '/images/players/action/doncic-1436.webp', // Luka Doncic
  '203999': '/images/players/action/jokic-1536.webp', // Nikola Jokic
  '203954': '/images/players/action/embiid-1448.webp', // Joel Embiid
  '1630169': '/images/players/action/haliburton-1600.webp', // Tyrese Haliburton
  '201935': '/images/players/action/harden-1146.webp', // James Harden
  '202695': '/images/players/action/leonard-1600.webp', // Kawhi Leonard
  '1630595': '/images/players/action/cunningham-1536.webp', // Cade Cunningham
  '202681': '/images/players/action/irving-1536.webp', // Kyrie Irving
};
const HEADSHOTS: Record<string, string> = {
  '893': 'Michael Jordan',
  '77142': 'Magic Johnson',
  '1449': 'Larry Bird',
  '76003': 'Kareem Abdul-Jabbar',
  '977': 'Kobe Bryant',
  '1495': 'Tim Duncan',
  '1628369': 'Jayson Tatum',
  '1631096': 'Chet Holmgren',
};

describe('player image registry', () => {
  it('resolves each editorial id to its own correct image file', () => {
    for (const [id, src] of Object.entries(EDITORIAL)) {
      const image = getPlayerImage(id);
      expect(image?.src).toBe(src);
      expect(image?.kind).toBe('action');
    }
  });

  it('uses the supplied upgrades for the photos that were too soft, and keeps the sharper original', () => {
    // Replaced by the owner's upscaled versions after a side-by-side review.
    for (const id of [
      '1641705',
      '201939',
      '2544',
      '203507',
      '1628378',
      '1629029',
      '203999',
      '203954',
      '201935',
      '202695',
      '1630595',
    ])
      expect(getPlayerImage(id)?.width).toBeGreaterThanOrEqual(1146);
    // Kevin Durant's original 5000 px photograph beat its upgrade, which showed AI over-texture.
    expect(getPlayerImage('201142')?.src).toBe(
      '/images/players/action/durant-1600.webp',
    );
    // The home hero no longer stretches a 1140 x 760 source over a full-height frame.
    expect(getPlayerImage('1641705')).toMatchObject({ width: 1199, height: 1312 });
  });

  it('maps NBA.com headshots by the manifest id, with their names', () => {
    for (const [id, name] of Object.entries(HEADSHOTS)) {
      const image = getPlayerImage(id);
      expect(image).toMatchObject({ kind: 'headshot', name });
      expect(image?.src).toBe(`/images/players/headshots/${id}-1040.webp`);
      expect(image?.thumb).toBe(`/images/players/thumbs/${id}.webp`);
    }
  });

  it('gives every mapping dimensions, alt text, a responsive set and a face thumbnail', () => {
    const ids = playerImageIds();
    expect(ids).toHaveLength(73);
    for (const id of ids) {
      const image = getPlayerImage(id)!;
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.alt.trim().length).toBeGreaterThan(0);
      expect(image.src.startsWith('/images/players/')).toBe(true);
      expect(image.srcSet).toMatch(/ \d+w(, |$)/);
      expect(image.srcSet).toContain(image.src);
      expect(getPlayerThumb(id)).toBe(`/images/players/thumbs/${id}.webp`);
    }
  });

  it('offers a tall alternate where one was supplied, and the main photo otherwise', () => {
    expect(getPortraitImage('1641705')?.src).toBe(
      '/images/players/portrait/wembanyama-1086.webp',
    );
    expect(getPortraitImage('2544')?.src).toBe(
      '/images/players/portrait/lebron-1100.webp',
    );
    expect(getPortraitImage('203999')?.src).toBe(getPlayerImage('203999')?.src);
  });

  it('returns undefined for unmapped, ambiguous, or empty ids so they use the photo-free fallback', () => {
    expect(getPlayerImage('999999')).toBeUndefined();
    expect(getPlayerImage('')).toBeUndefined();
    expect(getPlayerImage('constructor')).toBeUndefined();
    // Patrick Ewing: the supplier's source returned a generic silhouette, so he has no photo
    // rather than a placeholder or another player's photo.
    expect(getPlayerImage('121')).toBeUndefined();
    expect(getPlayerThumb('121')).toBeUndefined();
  });

  it('never maps two different players to the same photo file', () => {
    const files = playerImageIds().flatMap((id) => {
      const image = getPlayerImage(id)!;
      return [image.src, image.thumb, image.portrait?.src].filter(Boolean);
    });
    expect(new Set(files).size).toBe(files.length);
  });
});
