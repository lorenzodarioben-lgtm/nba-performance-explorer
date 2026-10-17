import { describe, expect, it } from 'vitest';

import { linkLeaderNames } from './leader-links';

const players = [
  { playerId: '1629029', name: 'Luka Dončić' },
  { playerId: '1', name: 'Gary Payton' },
  { playerId: '2', name: 'Gary Payton II' },
  { playerId: '3', name: 'Al Horford' },
];

describe('published leader names', () => {
  it('links exact whole-word names and keeps the rest as text', () => {
    expect(linkLeaderNames('Luka Dončić 29', players)).toEqual([
      { text: 'Luka Dončić', playerId: '1629029' },
      { text: ' 29', playerId: null },
    ]);
    // The longer name wins; it is never split into a shorter one.
    expect(linkLeaderNames('Gary Payton II 8', players)[0]).toEqual({
      text: 'Gary Payton II',
      playerId: '2',
    });
    expect(
      linkLeaderNames('Al Horford, Luka Dončić 6', players).filter((s) => s.playerId),
    ).toHaveLength(2);
  });

  it('never guesses: unlisted, accent-stripped, partial or embedded names stay text', () => {
    for (const text of [
      'Luka Doncic 29',
      'Two players 8 each',
      'Al Horfordson 4',
      'XAl Horford 4',
    ])
      expect(
        linkLeaderNames(text, players).every((s) => s.playerId === null),
        text,
      ).toBe(true);
    expect(linkLeaderNames('', players)).toEqual([]);
  });
});
