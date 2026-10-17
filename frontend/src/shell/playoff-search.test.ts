import { describe, expect, it } from 'vitest';
import type { PlayoffSeries } from '@nba-performance-explorer/contracts';

import { playoffOptions } from './playoff-search';

const team = (abbreviation: string, name: string, id: string) => ({
  id: `nba:${id}`,
  sourceId: id,
  abbreviation,
  name,
});
const BOS = team('BOS', 'Boston Celtics', '1610612738');
const DAL = team('DAL', 'Dallas Mavericks', '1610612742');
const IND = team('IND', 'Indiana Pacers', '1610612754');
const game = (n: number) =>
  ({
    number: n,
    game: {
      id: `nba:004230040${n}`,
      date: `2024-06-0${n}`,
      away: DAL,
      home: BOS,
      awayScore: 90 + n,
      homeScore: 100 + n,
    },
  }) as unknown as PlayoffSeries['games'][number];
const finals = {
  id: 'r4-BOS-DAL',
  round: 4,
  teams: [BOS, DAL],
  wins: [4, 1],
  winner: BOS,
  games: [1, 2, 3, 4, 5].map(game),
} as unknown as PlayoffSeries;
const ecf = {
  ...finals,
  id: 'r3-BOS-IND',
  round: 3,
  teams: [BOS, IND],
  wins: [4, 0],
} as unknown as PlayoffSeries;

describe('playoff search', () => {
  it('matches every typed word against team names, abbreviations and the round', () => {
    expect(playoffOptions([finals, ecf], 'bos dal').map((o) => o.to)).toEqual([
      '/games/series/r4-BOS-DAL',
    ]);
    expect(playoffOptions([ecf, finals], 'celtics finals').map((o) => o.to)).toEqual([
      '/games/series/r4-BOS-DAL',
      '/games/series/r3-BOS-IND',
    ]);
    expect(playoffOptions([finals, ecf], 'pacers')[0]!.title).toBe(
      'BOS vs IND · Conference finals',
    );
    expect(playoffOptions([finals, ecf], 'lakers')).toEqual([]);
  });

  it('opens a numbered game of the best match, and ignores a game number alone', () => {
    const options = playoffOptions([finals, ecf], 'dal game 4');
    expect(options[0]).toMatchObject({ to: '/games/nba:0042300404', badge: 'G4' });
    expect(playoffOptions([finals], 'bos g9').some((o) => o.badge === 'G9')).toBe(
      false,
    );
    expect(playoffOptions([finals], 'g4')).toEqual([]);
  });
});
