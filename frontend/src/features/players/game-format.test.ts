import { describe, expect, it } from 'vitest';

import { formatGameDate, formatMatchup } from './game-format';

describe('game formatting', () => {
  it('formats game dates without locale or timezone conversion', () => {
    expect(formatGameDate('2024-04-14')).toBe('14 Apr 2024');
    expect(formatGameDate('2024-02-29')).toBe('29 Feb 2024');
  });

  it.each(['2024-4-14', '04/14/2024', '2023-02-29', '2024-13-01', '2024-04-31'])(
    'rejects malformed or impossible date %s',
    (date) => {
      expect(() => formatGameDate(date)).toThrow(RangeError);
    },
  );

  it('formats home and away matchups', () => {
    expect(formatMatchup('home', 'NOP')).toBe('vs NOP');
    expect(formatMatchup('away', 'NOP')).toBe('@ NOP');
  });
});
