import { describe, expect, it } from 'vitest';
import { addLabPlayer, buildLabParams, readLabState } from './lab-state';

describe('multi-player URL state', () => {
  it('round trips independent seasons, missing picks and metric selection', () => {
    const slots = [
      { playerId: '2544', season: '2023-24' },
      { playerId: '201939', season: null },
      { playerId: '1641705', season: '2024-25' },
    ];
    expect(readLabState(buildLabParams(slots, 'pointsPerGame'))).toEqual({
      slots,
      metric: 'pointsPerGame',
      invalid: false,
    });
  });
  it.each([
    'players=2544,2544',
    'players=2544&players=201939',
    'players=2544&seasons=2023-25',
    'players=2544,201939&seasons=2023-24',
    'players=1,2,3,4,5',
    'players=espn:123',
    'metric=usage',
    'seasons=2023-24',
    'url=https://example.com',
  ])('rejects malformed state %s', (query) => {
    expect(readLabState(new URLSearchParams(query)).invalid).toBe(true);
  });
  it('accepts an empty editor without issuing a ready comparison', () => {
    expect(readLabState(new URLSearchParams())).toEqual({
      slots: [],
      metric: 'all',
      invalid: false,
    });
  });
  it('prevents duplicate selection and enforces four slots', () => {
    const slots = [{ playerId: '2544', season: '2023-24' }];
    expect(() => addLabPlayer(slots, '2544')).toThrow();
    expect(addLabPlayer(slots, '201939')[1]).toEqual({
      playerId: '201939',
      season: null,
    });
    expect(() =>
      addLabPlayer(
        ['1', '2', '3', '4'].map((playerId) => ({ playerId, season: null })),
        '5',
      ),
    ).toThrow();
  });
});
