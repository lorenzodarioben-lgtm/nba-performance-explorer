import { describe, expect, it } from 'vitest';

import { formatDraft, formatHeight, formatTeamName, formatWeight } from './format';

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
});
