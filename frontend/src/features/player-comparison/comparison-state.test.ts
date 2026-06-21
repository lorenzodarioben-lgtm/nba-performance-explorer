import { describe, expect, it } from 'vitest';

import {
  buildComparisonParams,
  changeComparisonSeason,
  clearComparisonPlayer1,
  clearComparisonPlayer2,
  intersectSeasonsNewestFirst,
  isCommonSeason,
  newestCommonSeason,
  readComparisonUrlState,
  selectComparisonPlayer1,
  selectComparisonPlayer2,
  selectionFromUrlState,
} from './comparison-state';

function parse(query: string) {
  return readComparisonUrlState(new URLSearchParams(query));
}

describe('readComparisonUrlState', () => {
  it('treats an empty URL as no selection', () => {
    const state = parse('');

    expect(state.player1).toEqual({ raw: null, status: 'empty', playerId: null });
    expect(state.player2).toEqual({ raw: null, status: 'empty', playerId: null });
    expect(state.season).toEqual({ raw: null, status: 'empty', season: null });
    expect(state.duplicate).toBe(false);
  });

  it('parses a player1-only URL', () => {
    const state = parse('player1=2544');

    expect(state.player1).toEqual({ raw: '2544', status: 'valid', playerId: '2544' });
    expect(state.player2.status).toBe('empty');
    expect(state.duplicate).toBe(false);
  });

  it('parses a player2-only URL without promoting it to player1', () => {
    const state = parse('player2=201939');

    expect(state.player1.status).toBe('empty');
    expect(state.player2).toEqual({
      raw: '201939',
      status: 'valid',
      playerId: '201939',
    });
  });

  it('preserves player order for two distinct players', () => {
    const state = parse('player1=2544&player2=201939');

    expect(state.player1.playerId).toBe('2544');
    expect(state.player2.playerId).toBe('201939');
    expect(state.duplicate).toBe(false);
  });

  it('marks malformed player ids invalid without a request id', () => {
    const state = parse('player1=abc&player2=0');

    expect(state.player1).toEqual({ raw: 'abc', status: 'invalid', playerId: null });
    expect(state.player2).toEqual({ raw: '0', status: 'invalid', playerId: null });
  });

  it('treats a repeated recognized parameter as invalid', () => {
    const state = parse('player1=2544&player1=201939');

    expect(state.player1.status).toBe('invalid');
    expect(state.player1.playerId).toBeNull();
  });

  it('flags duplicate player ids', () => {
    const state = parse('player1=2544&player2=2544');

    expect(state.player1.status).toBe('valid');
    expect(state.player2.status).toBe('valid');
    expect(state.duplicate).toBe(true);
  });

  it('reports a missing season as empty', () => {
    expect(parse('player1=2544&player2=201939').season.status).toBe('empty');
  });

  it('reports a malformed season as invalid', () => {
    const state = parse('player1=2544&player2=201939&season=2023-26');

    expect(state.season).toEqual({ raw: '2023-26', status: 'invalid', season: null });
  });

  it('parses a valid season', () => {
    expect(parse('season=2023-24').season).toEqual({
      raw: '2023-24',
      status: 'valid',
      season: '2023-24',
    });
  });
});

describe('buildComparisonParams', () => {
  it('emits recognized parameters in a deterministic order', () => {
    const params = buildComparisonParams({
      season: '2023-24',
      player2: '201939',
      player1: '2544',
    });

    expect(params.toString()).toBe('player1=2544&player2=201939&season=2023-24');
  });

  it('omits absent parameters', () => {
    expect(
      buildComparisonParams({
        player1: '2544',
        player2: null,
        season: null,
      }).toString(),
    ).toBe('player1=2544');
  });
});

describe('selection actions', () => {
  const base = selectionFromUrlState(
    parse('player1=2544&player2=201939&season=2023-24'),
  );

  it('selecting Player A keeps Player B and drops the season', () => {
    expect(selectComparisonPlayer1(base, '203999')).toEqual({
      player1: '203999',
      player2: '201939',
      season: null,
    });
  });

  it('selecting (replacing) Player B keeps Player A and drops the season', () => {
    expect(selectComparisonPlayer2(base, '1641705')).toEqual({
      player1: '2544',
      player2: '1641705',
      season: null,
    });
  });

  it('clearing Player A preserves Player B and drops the season', () => {
    expect(clearComparisonPlayer1(base)).toEqual({
      player1: null,
      player2: '201939',
      season: null,
    });
  });

  it('clearing Player B preserves Player A and drops the season', () => {
    expect(clearComparisonPlayer2(base)).toEqual({
      player1: '2544',
      player2: null,
      season: null,
    });
  });

  it('changing the season keeps both players', () => {
    expect(changeComparisonSeason(base, '2017-18')).toEqual({
      player1: '2544',
      player2: '201939',
      season: '2017-18',
    });
  });

  it('drops invalid values from the action base', () => {
    const invalidBase = selectionFromUrlState(parse('player1=abc&player2=201939'));

    expect(invalidBase).toEqual({ player1: null, player2: '201939', season: null });
  });
});

describe('common-season helpers', () => {
  const lebron = ['2023-24', '2018-19', '2017-18'];
  const curry = ['2023-24', '2022-23', '2017-18'];
  const wembanyama = ['2023-24'];
  const durant = ['2021-22'];

  it('intersects season lists newest-first', () => {
    expect(intersectSeasonsNewestFirst(lebron, curry)).toEqual(['2023-24', '2017-18']);
  });

  it('selects the newest common season', () => {
    expect(newestCommonSeason(lebron, curry)).toBe('2023-24');
    expect(newestCommonSeason(lebron, wembanyama)).toBe('2023-24');
  });

  it('returns no common season for disjoint lists', () => {
    expect(intersectSeasonsNewestFirst(durant, wembanyama)).toEqual([]);
    expect(newestCommonSeason(durant, wembanyama)).toBeNull();
  });

  it('recognizes an explicit common season', () => {
    expect(isCommonSeason('2017-18', lebron, curry)).toBe(true);
  });

  it('recognizes an explicit unavailable season', () => {
    expect(isCommonSeason('2018-19', lebron, curry)).toBe(false);
  });
});
