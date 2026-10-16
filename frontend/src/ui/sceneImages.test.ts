import { describe, expect, it } from 'vitest';

import { getPlayerImage } from '../features/players/playerImages';
import { getSceneImage } from './sceneImages';

describe('scene images', () => {
  it('keeps the Kyrie Irving matchup as a scene, separate from his profile photo', () => {
    const scene = getSceneImage('kyrie-matchup');
    expect(scene?.src).toBe('/images/scenes/kyrie-matchup-1536.webp');
    expect(scene?.alt).toMatch(/Kyrie Irving/);
    // The defender is not identified, so the alt text never names him.
    expect(scene?.alt).toMatch(/a Brooklyn Nets defender/);
    expect(getPlayerImage('202681')?.src).toBe(
      '/images/players/action/irving-1500.webp',
    );
    expect(getPlayerImage('202681')?.src).not.toBe(scene?.src);
  });

  it('returns nothing for an unknown or inherited key', () => {
    expect(getSceneImage('nope')).toBeUndefined();
    expect(getSceneImage('toString')).toBeUndefined();
  });
});
