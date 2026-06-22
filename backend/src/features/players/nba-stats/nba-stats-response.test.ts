import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ProviderError } from '../provider-error.js';
import {
  optionalString,
  ratioOrZero,
  requireFiniteNumber,
  requireString,
  selectResultSet,
  validateMapped,
} from './nba-stats-response.js';

function envelope(sets: unknown[]): unknown {
  return { resource: 'data', parameters: { x: 1 }, resultSets: sets };
}

const sampleSet = {
  name: 'CommonPlayerInfo',
  headers: ['PERSON_ID', 'DISPLAY_FIRST_LAST', 'PTS', 'FG3_PCT', 'EXTRA'],
  rowSet: [[2544, 'LeBron James', 27.4, null, 'ignored']],
};

function expectProviderInvalid(fn: () => unknown): void {
  expect(fn).toThrowError(ProviderError);
  let code: string | undefined;
  try {
    fn();
  } catch (error) {
    code = (error as ProviderError).code;
  }
  expect(code).toBe('PROVIDER_INVALID_RESPONSE');
}

function firstRow(table: ReturnType<typeof selectResultSet>): readonly unknown[] {
  const row = table.rows[0];
  if (!row) {
    throw new Error('expected at least one row');
  }
  return row;
}

describe('selectResultSet', () => {
  it('selects a result set and tolerates extra sets and columns', () => {
    const table = selectResultSet(
      envelope([{ name: 'Other', headers: ['X'], rowSet: [['y']] }, sampleSet]),
      'CommonPlayerInfo',
      ['PERSON_ID', 'DISPLAY_FIRST_LAST'],
    );

    expect(table.rows).toHaveLength(1);
    expect(requireString(table, firstRow(table), 'DISPLAY_FIRST_LAST')).toBe(
      'LeBron James',
    );
  });

  it('rejects a malformed envelope', () => {
    expectProviderInvalid(() => selectResultSet({}, 'CommonPlayerInfo', []));
    expectProviderInvalid(() =>
      selectResultSet({ resultSets: 'nope' }, 'CommonPlayerInfo', []),
    );
    expectProviderInvalid(() => selectResultSet('<html>', 'CommonPlayerInfo', []));
  });

  it('rejects a missing result set', () => {
    expectProviderInvalid(() =>
      selectResultSet(envelope([sampleSet]), 'PlayerGameLog', []),
    );
  });

  it('rejects a duplicate result set', () => {
    expectProviderInvalid(() =>
      selectResultSet(envelope([sampleSet, sampleSet]), 'CommonPlayerInfo', []),
    );
  });

  it('rejects duplicate names in unused result sets', () => {
    const duplicateUnused = {
      name: 'Other',
      headers: ['X'],
      rowSet: [['y']],
    };
    expectProviderInvalid(() =>
      selectResultSet(
        envelope([duplicateUnused, duplicateUnused, sampleSet]),
        'CommonPlayerInfo',
        [],
      ),
    );
  });

  it('rejects a missing required column', () => {
    expectProviderInvalid(() =>
      selectResultSet(envelope([sampleSet]), 'CommonPlayerInfo', ['NOT_THERE']),
    );
  });

  it('rejects a duplicate required column', () => {
    const duplicated = {
      name: 'CommonPlayerInfo',
      headers: ['PERSON_ID', 'PTS', 'PTS'],
      rowSet: [[2544, 27, 27]],
    };
    expectProviderInvalid(() =>
      selectResultSet(envelope([duplicated]), 'CommonPlayerInfo', ['PTS']),
    );
  });

  it('rejects a row whose width does not match the headers', () => {
    const mismatched = {
      name: 'CommonPlayerInfo',
      headers: ['PERSON_ID', 'PTS'],
      rowSet: [[2544]],
    };
    expectProviderInvalid(() =>
      selectResultSet(envelope([mismatched]), 'CommonPlayerInfo', ['PERSON_ID']),
    );
  });

  it('rejects a row-width mismatch in an unused result set', () => {
    const mismatchedUnused = {
      name: 'Other',
      headers: ['X', 'Y'],
      rowSet: [['x']],
    };
    expectProviderInvalid(() =>
      selectResultSet(envelope([mismatchedUnused, sampleSet]), 'CommonPlayerInfo', [
        'PERSON_ID',
      ]),
    );
  });
});

describe('cell accessors', () => {
  const table = selectResultSet(envelope([sampleSet]), 'CommonPlayerInfo', [
    'PERSON_ID',
    'DISPLAY_FIRST_LAST',
    'PTS',
    'FG3_PCT',
  ]);
  const row = firstRow(table);

  it('reads a required string and rejects a non-string', () => {
    expect(requireString(table, row, 'DISPLAY_FIRST_LAST')).toBe('LeBron James');
    expectProviderInvalid(() => requireString(table, row, 'PERSON_ID'));
  });

  it('reads a finite number and rejects a non-number', () => {
    expect(requireFiniteNumber(table, row, 'PTS')).toBe(27.4);
    expectProviderInvalid(() => requireFiniteNumber(table, row, 'DISPLAY_FIRST_LAST'));
  });

  it('treats a null percentage as zero', () => {
    expect(ratioOrZero(table, row, 'FG3_PCT')).toBe(0);
  });

  it('returns undefined for an absent optional string', () => {
    expect(optionalString(table, row, 'FG3_PCT')).toBeUndefined();
  });
});

describe('validateMapped', () => {
  const schema = z.object({ a: z.number() }).strict();

  it('returns the parsed value on success', () => {
    expect(validateMapped(schema, { a: 1 }, 'thing')).toEqual({ a: 1 });
  });

  it('throws a provider-invalid error on failure', () => {
    expectProviderInvalid(() => validateMapped(schema, { a: 'x' }, 'thing'));
  });
});
