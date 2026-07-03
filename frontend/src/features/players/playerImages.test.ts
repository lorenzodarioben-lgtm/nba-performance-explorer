import { describe, expect, it } from 'vitest';

import { getPlayerImage } from './playerImages';

// The registry maps strictly by NBA person id. These ids are verified against the application's own
// data (fixtures and the live search directory), so a mapping resolving to the wrong file would be a
// wrong-player photo.
const KNOWN: Record<string, string> = {
  '1641705': '/images/wembanyama-hero.webp', // Victor Wembanyama
  '201939': '/images/curry-action.avif', // Stephen Curry
  '2544': '/images/lebron-dunk.avif', // LeBron James
  '201142': '/images/durant.avif', // Kevin Durant
  '203507': '/images/giannis.avif', // Giannis Antetokounmpo
  '1628983': '/images/shai-gilgeous-alexander.webp', // Shai Gilgeous-Alexander
  '1628378': '/images/donovan-mitchell.jpg', // Donovan Mitchell
  '1629029': '/images/luka-doncic.jpg', // Luka Doncic
  '203999': '/images/jokic.webp', // Nikola Jokic
  '203954': '/images/embiid.webp', // Joel Embiid
  '1630169': '/images/haliburton.webp', // Tyrese Haliburton
  '201935': '/images/harden.avif', // James Harden
  '202695': '/images/kawhi-leonard.jpg', // Kawhi Leonard
  '1630595': '/images/cade-cunningham.jpg', // Cade Cunningham
};

describe('player image registry', () => {
  it('resolves each known id to its own correct image file', () => {
    for (const [id, src] of Object.entries(KNOWN)) {
      expect(getPlayerImage(id)?.src).toBe(src);
    }
  });

  it('gives every mapping explicit dimensions and non-empty alt text', () => {
    for (const id of Object.keys(KNOWN)) {
      const image = getPlayerImage(id);
      expect(image).toBeDefined();
      expect(image?.width).toBeGreaterThan(0);
      expect(image?.height).toBeGreaterThan(0);
      expect(image?.alt.trim().length).toBeGreaterThan(0);
      expect(image?.src.startsWith('/images/')).toBe(true);
    }
  });

  it('returns undefined for unmapped, ambiguous, or empty ids so they use the photo-free fallback', () => {
    expect(getPlayerImage('999999')).toBeUndefined();
    expect(getPlayerImage('')).toBeUndefined();
    // A real player with no supplied photo (Kyrie Irving) must fall back, not borrow another photo.
    expect(getPlayerImage('202681')).toBeUndefined();
  });

  it('never maps two different players to the same photo file', () => {
    const srcs = Object.keys(KNOWN).map((id) => getPlayerImage(id)?.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
