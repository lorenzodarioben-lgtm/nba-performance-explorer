import { describe, expect, it } from 'vitest';

import { searchDirectory, type DirectoryPlayer } from './nba-stats-search.js';

function player(
  personId: string,
  fullName: string,
  isActive = true,
  team?: { abbreviation: string },
  names?: { firstName: string; surname: string },
): DirectoryPlayer {
  const tokens = fullName.split(' ');
  return {
    personId,
    fullName,
    firstName: names?.firstName ?? tokens[0] ?? fullName,
    surname: names?.surname ?? tokens[tokens.length - 1] ?? fullName,
    isActive,
    ...(team ? { team } : {}),
  };
}

const directory: DirectoryPlayer[] = [
  player('2544', 'LeBron James', true, { abbreviation: 'LAL' }),
  player('201939', 'Stephen Curry', true, { abbreviation: 'GSW' }),
  player('201935', 'James Harden', true, { abbreviation: 'LAC' }),
  player('977', 'Kobe Bryant', false),
  player('203999', 'Nikola Jokić', true, { abbreviation: 'DEN' }),
];

function ids(results: { id: string }[]): string[] {
  return results.map((result) => result.id);
}

describe('searchDirectory', () => {
  it('returns nothing below the two-character minimum', () => {
    expect(searchDirectory(directory, 'a', 8)).toEqual([]);
  });

  it('matches a full-name prefix on two characters', () => {
    expect(ids(searchDirectory(directory, 'le', 8))).toEqual(['2544']);
  });

  it('matches an exact full name', () => {
    expect(ids(searchDirectory(directory, 'lebron james', 8))).toEqual(['2544']);
  });

  it('ranks an exact first/surname match and orders ties alphabetically', () => {
    // "james" is James Harden's first name and LeBron James's surname (both rank 2).
    expect(ids(searchDirectory(directory, 'james', 8))).toEqual(['201935', '2544']);
  });

  it('matches a surname prefix', () => {
    expect(ids(searchDirectory(directory, 'cur', 8))).toEqual(['201939']);
  });

  it('uses the explicit surname rather than assuming the final name token', () => {
    const players = [
      player('1', 'Gary Trent Jr.', true, undefined, {
        firstName: 'Gary',
        surname: 'Trent Jr.',
      }),
      player('2', 'Trent Forrest', true, undefined, {
        firstName: 'Trent',
        surname: 'Forrest',
      }),
    ];

    expect(ids(searchDirectory(players, 'trent jr.', 8))).toEqual(['1']);
  });

  it('normalizes case, whitespace, and diacritics', () => {
    expect(ids(searchDirectory(directory, '  JOKIC  ', 8))).toEqual(['203999']);
  });

  it('orders exact matches before prefix matches', () => {
    const players = [player('1', 'Markelle Fultz'), player('2', 'Mark Williams')];
    expect(ids(searchDirectory(players, 'mark', 8))).toEqual(['2', '1']);
  });

  it('orders exact/prefix matches before substring matches', () => {
    const players = [player('1', 'Aaron Gordon'), player('2', 'Ron Harper')];
    expect(ids(searchDirectory(players, 'ron', 8))).toEqual(['2', '1']);
  });

  it('prefers active players when rank is otherwise equal', () => {
    // "ry" is a substring of both "Curry" and "Bryant"; the active player ranks first.
    expect(ids(searchDirectory(directory, 'ry', 8))).toEqual(['201939', '977']);
  });

  it('breaks remaining ties by ascending numeric id', () => {
    const players = [player('200', 'John Smith'), player('100', 'John Smith')];
    expect(ids(searchDirectory(players, 'john smith', 8))).toEqual(['100', '200']);
  });

  it('de-duplicates by person id', () => {
    const players = [player('5', 'Jane Doe', true), player('5', 'Jane Doe', false)];
    expect(searchDirectory(players, 'jane', 8)).toHaveLength(1);
  });

  it('returns at most the requested limit', () => {
    const players = Array.from({ length: 10 }, (_value, index) =>
      player(String(index + 1), `Player Number${index}`),
    );
    expect(searchDirectory(players, 'player', 8)).toHaveLength(8);
  });

  it('omits the team for a player without one', () => {
    const [kobe] = searchDirectory(directory, 'kobe', 8);
    expect(kobe).toEqual({ id: '977', fullName: 'Kobe Bryant' });
  });
});
