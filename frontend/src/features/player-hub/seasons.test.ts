import { describe, expect, it } from 'vitest';

import { alignToSeasons, fillSeasonGaps, formatSeason, shortSeason } from './seasons';

describe('season helpers', () => {
  it('fills unreported seasons so chart lines break across them', () => {
    const axis = fillSeasonGaps(['2023-24', '2017-18', '2018-19']);
    expect(axis).toEqual([
      '2017-18',
      '2018-19',
      '2019-20',
      '2020-21',
      '2021-22',
      '2022-23',
      '2023-24',
    ]);
    const values = alignToSeasons(
      axis,
      [
        { s: '2017-18', v: 27.5 },
        { s: '2018-19', v: 27.4 },
        { s: '2023-24', v: 25.7 },
      ],
      (row) => row.s,
      (row) => row.v,
    );
    expect(values).toEqual([27.5, 27.4, null, null, null, null, 25.7]);
  });

  it('handles the century turn and display forms', () => {
    expect(fillSeasonGaps(['1998-99', '2000-01'])).toEqual([
      '1998-99',
      '1999-00',
      '2000-01',
    ]);
    expect(formatSeason('2023-24')).toBe('2023–24');
    expect(shortSeason('1999-00')).toBe('’99–00');
  });
});
