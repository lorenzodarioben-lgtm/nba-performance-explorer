import { describe, expect, it } from 'vitest';

import {
  formatDraft,
  formatHeight,
  formatPercentage,
  formatPerGame,
  formatTeamName,
  formatWeight,
} from './format';

describe('player profile formatters', () => {
  it('formats height as feet and inches', () => {
    expect(formatHeight(81)).toBe('6′ 9″');
    expect(formatHeight(72)).toBe('6′ 0″');
    expect(formatHeight(85)).toBe('7′ 1″');
  });

  it('formats weight in pounds', () => {
    expect(formatWeight(250)).toBe('250 lb');
    expect(formatWeight(185)).toBe('185 lb');
  });

  it('formats draft information', () => {
    expect(formatDraft({ year: 2003, round: 1, pick: 1 })).toBe(
      '2003, Round 1, Pick 1',
    );
    expect(formatDraft({ year: 2014, round: 2, pick: 41 })).toBe(
      '2014, Round 2, Pick 41',
    );
  });

  it('composes the full team display name from city and nickname', () => {
    expect(formatTeamName({ city: 'Los Angeles', name: 'Lakers' })).toBe(
      'Los Angeles Lakers',
    );
  });

  it('formats per-game values to one decimal place', () => {
    expect(formatPerGame(27)).toBe('27.0');
    expect(formatPerGame(0)).toBe('0.0');
    expect(formatPerGame(25.7)).toBe('25.7');
    expect(formatPerGame(8.34)).toBe('8.3');
  });

  it('formats percentage ratios to one decimal percent', () => {
    expect(formatPercentage(0.542)).toBe('54.2%');
    expect(formatPercentage(0)).toBe('0.0%');
    expect(formatPercentage(1)).toBe('100.0%');
  });

  it('throws rather than formatting non-finite values', () => {
    expect(() => formatPerGame(Number.NaN)).toThrow(RangeError);
    expect(() => formatPerGame(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => formatPercentage(Number.NaN)).toThrow(RangeError);
  });
});
