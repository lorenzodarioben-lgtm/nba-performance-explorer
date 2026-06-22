import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProviderError, providerErrorToHttp } from '../provider-error.js';
import {
  createConsoleDiagnosticReporter,
  hasProperty,
  noopDiagnosticReporter,
  primitiveCategory,
  topLevelPropertyNames,
  type ResponseDiagnostic,
} from './nba-stats-diagnostics.js';
import { parseDirectory } from './nba-stats-mappers.js';
import { requireString, selectResultSet } from './nba-stats-response.js';

// A distinctive sentinel placed only in *cell values* (the data we must never expose). Every
// assertion below proves it never reaches a serialized diagnostic.
const SECRET = 'SSN-SENTINEL-DEADBEEF-9000';

// The complete set of fields a diagnostic is allowed to carry. Any key outside this set would be a
// leak risk, so the sanitation test asserts diagnostics use only these.
const ALLOWED_KEYS = new Set<keyof ResponseDiagnostic>([
  'stage',
  'category',
  'endpoint',
  'expectedResultSet',
  'topLevelKeys',
  'hasResultSets',
  'hasResultSet',
  'resultSetCount',
  'resultSetNames',
  'headerCount',
  'rowCount',
  'missingColumns',
  'duplicateColumns',
  'rejectedRowIndex',
  'rejectedColumn',
  'rejectedColumnIndex',
  'valueCategory',
  'zodIssues',
]);

const DIRECTORY_HEADERS = [
  'PERSON_ID',
  'DISPLAY_LAST_COMMA_FIRST',
  'DISPLAY_FIRST_LAST',
  'ROSTERSTATUS',
  'FROM_YEAR',
  'TO_YEAR',
  'PLAYERCODE',
  'PLAYER_SLUG',
  'TEAM_ID',
  'TEAM_CITY',
  'TEAM_NAME',
  'TEAM_ABBREVIATION',
  'TEAM_CODE',
  'TEAM_SLUG',
  'GAMES_PLAYED_FLAG',
  'OTHERLEAGUE_EXPERIENCE_CH',
];

function resultSet(name: string, headers: string[], rowSet: unknown[][]) {
  return { name, headers, rowSet };
}
function envelope(...sets: ReturnType<typeof resultSet>[]): unknown {
  return { resource: 'data', parameters: {}, resultSets: sets };
}
function rowFor(
  headers: readonly string[],
  values: Readonly<Record<string, unknown>>,
): unknown[] {
  return headers.map((header) =>
    Object.prototype.hasOwnProperty.call(values, header) ? values[header] : null,
  );
}

function captureProviderError(fn: () => unknown): ProviderError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ProviderError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a ProviderError to be thrown');
}

function diagnosticOf(fn: () => unknown): ResponseDiagnostic {
  const diagnostic = captureProviderError(fn).diagnostic;
  if (!diagnostic) {
    throw new Error('expected the ProviderError to carry a diagnostic');
  }
  return diagnostic;
}

function expectOnlyAllowedKeys(diagnostic: ResponseDiagnostic): void {
  for (const key of Object.keys(diagnostic)) {
    expect(ALLOWED_KEYS.has(key as keyof ResponseDiagnostic)).toBe(true);
  }
}

describe('diagnostic helpers', () => {
  it('categorizes values without exposing them', () => {
    expect(primitiveCategory(null)).toBe('null');
    expect(primitiveCategory([1, 2])).toBe('array');
    expect(primitiveCategory({})).toBe('object');
    expect(primitiveCategory('x')).toBe('string');
    expect(primitiveCategory(3)).toBe('number');
    expect(primitiveCategory(true)).toBe('boolean');
    expect(primitiveCategory(undefined)).toBe('undefined');
  });

  it('lists sorted top-level keys only for plain objects', () => {
    expect(topLevelPropertyNames({ b: 1, a: 2 })).toEqual(['a', 'b']);
    expect(topLevelPropertyNames(null)).toBeUndefined();
    expect(topLevelPropertyNames([1, 2])).toBeUndefined();
    expect(topLevelPropertyNames('text')).toBeUndefined();
  });

  it('detects own properties of plain objects', () => {
    expect(hasProperty({ resultSets: [] }, 'resultSets')).toBe(true);
    expect(hasProperty({ resultSet: {} }, 'resultSets')).toBe(false);
    expect(hasProperty(null, 'resultSets')).toBe(false);
    expect(hasProperty([], 'resultSets')).toBe(false);
  });
});

describe('parser diagnostics identify the failing stage', () => {
  it('flags a malformed envelope and distinguishes resultSets from resultSet', () => {
    const diagnostic = diagnosticOf(() =>
      selectResultSet(
        { resultSet: { name: 'X', headers: [], rowSet: [] }, leaked: SECRET },
        'CommonAllPlayers',
        [],
      ),
    );

    expect(diagnostic.stage).toBe('envelope');
    expect(diagnostic.category).toBe('malformed-envelope');
    expect(diagnostic.hasResultSets).toBe(false);
    expect(diagnostic.hasResultSet).toBe(true);
    expect(diagnostic.topLevelKeys).toEqual(['leaked', 'resultSet']);
    expect(
      diagnostic.zodIssues?.some((issue) => issue.path.includes('resultSets')),
    ).toBe(true);
    expectOnlyAllowedKeys(diagnostic);
    expect(JSON.stringify(diagnostic)).not.toContain(SECRET);
  });

  it('flags a missing target result set and lists the present names', () => {
    const diagnostic = diagnosticOf(() =>
      selectResultSet(
        envelope(resultSet('SomethingElse', ['A'], [])),
        'CommonAllPlayers',
        [],
      ),
    );

    expect(diagnostic.stage).toBe('result-set');
    expect(diagnostic.category).toBe('missing-result-set');
    expect(diagnostic.expectedResultSet).toBe('CommonAllPlayers');
    expect(diagnostic.resultSetNames).toEqual(['SomethingElse']);
    expectOnlyAllowedKeys(diagnostic);
  });

  it('flags a missing required column', () => {
    const headers = DIRECTORY_HEADERS.filter((header) => header !== 'PLAYER_SLUG');
    const diagnostic = diagnosticOf(() =>
      parseDirectory(envelope(resultSet('CommonAllPlayers', headers, []))),
    );

    expect(diagnostic.stage).toBe('required-columns');
    expect(diagnostic.category).toBe('missing-column');
    expect(diagnostic.missingColumns).toContain('PLAYER_SLUG');
    expectOnlyAllowedKeys(diagnostic);
  });

  it('flags a row-width mismatch with the offending row index', () => {
    const diagnostic = diagnosticOf(() =>
      selectResultSet(
        envelope(resultSet('CommonAllPlayers', ['PERSON_ID', 'X'], [[1, 2], [SECRET]])),
        'CommonAllPlayers',
        ['PERSON_ID'],
      ),
    );

    expect(diagnostic.stage).toBe('row-width');
    expect(diagnostic.category).toBe('row-width-mismatch');
    expect(diagnostic.headerCount).toBe(2);
    expect(diagnostic.rejectedRowIndex).toBe(1);
    expectOnlyAllowedKeys(diagnostic);
    expect(JSON.stringify(diagnostic)).not.toContain(SECRET);
  });

  it('flags a cell type mismatch with the column and primitive category but not the value', () => {
    const table = selectResultSet(
      envelope(resultSet('CommonAllPlayers', ['PERSON_ID'], [[42]])),
      'CommonAllPlayers',
      ['PERSON_ID'],
    );
    const row = table.rows[0];
    if (!row) {
      throw new Error('expected a row');
    }

    const diagnostic = diagnosticOf(() => requireString(table, row, 'PERSON_ID'));

    expect(diagnostic.stage).toBe('cell-type');
    expect(diagnostic.category).toBe('expected-string');
    expect(diagnostic.rejectedColumn).toBe('PERSON_ID');
    expect(diagnostic.rejectedColumnIndex).toBe(0);
    expect(diagnostic.valueCategory).toBe('number');
    expectOnlyAllowedKeys(diagnostic);
    expect(JSON.stringify(diagnostic)).not.toContain('42');
  });

  it('flags a value-format rejection without exposing surrounding cell values', () => {
    const diagnostic = diagnosticOf(() =>
      parseDirectory(
        envelope(
          resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
            rowFor(DIRECTORY_HEADERS, {
              PERSON_ID: 2544,
              DISPLAY_LAST_COMMA_FIRST: `${SECRET}, ${SECRET}`,
              DISPLAY_FIRST_LAST: SECRET,
              ROSTERSTATUS: 7, // not 0 or 1
              TEAM_ABBREVIATION: SECRET,
            }),
          ]),
        ),
      ),
    );

    expect(diagnostic.stage).toBe('value-format');
    expect(diagnostic.category).toBe('invalid-roster-status');
    expect(diagnostic.rejectedColumn).toBe('ROSTERSTATUS');
    expect(diagnostic.rejectedRowIndex).toBe(0);
    expect(diagnostic.valueCategory).toBe('number');
    expectOnlyAllowedKeys(diagnostic);
    expect(JSON.stringify(diagnostic)).not.toContain(SECRET);
  });
});

describe('diagnostics never expose upstream payload data', () => {
  it('keeps sentinel cell values out of every diagnostic field', () => {
    // A directory row stuffed with sentinel values that still fails parsing.
    const diagnostic = diagnosticOf(() =>
      parseDirectory(
        envelope(
          resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
            rowFor(DIRECTORY_HEADERS, {
              PERSON_ID: 2544,
              DISPLAY_LAST_COMMA_FIRST: 'no-comma-here-just-secret',
              DISPLAY_FIRST_LAST: SECRET,
              ROSTERSTATUS: 1,
              TEAM_ABBREVIATION: SECRET,
              PLAYERCODE: SECRET,
            }),
          ]),
        ),
      ),
    );

    const serialized = JSON.stringify(diagnostic);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('no-comma-here-just-secret');
    // Cookies / headers / tokens / URLs were never available to the parser, but assert the shape
    // is purely structural regardless.
    expect(serialized).not.toMatch(
      /cookie|authorization|bearer|set-cookie|https?:\/\//i,
    );
    expectOnlyAllowedKeys(diagnostic);
  });
});

describe('public error behavior is unchanged by diagnostics', () => {
  it('still maps an invalid response to a generic 502', () => {
    const error = captureProviderError(() =>
      selectResultSet({}, 'CommonAllPlayers', []),
    );

    expect(error.code).toBe('PROVIDER_INVALID_RESPONSE');
    expect(providerErrorToHttp(error)).toEqual({
      status: 502,
      code: 'PROVIDER_INVALID_RESPONSE',
      message: 'The NBA data source returned an unexpected response.',
    });
  });
});

describe('diagnostic reporters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('the no-op reporter emits nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    noopDiagnosticReporter.report({
      stage: 'envelope',
      category: 'malformed-envelope',
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('the console reporter emits sanitized structural metadata only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reporter = createConsoleDiagnosticReporter();

    reporter.report({
      stage: 'value-format',
      category: 'invalid-roster-status',
      endpoint: 'commonallplayers',
      rejectedColumn: 'ROSTERSTATUS',
      valueCategory: 'number',
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0] ?? '');
    expect(message).toContain('commonallplayers');
    expect(message).toContain('invalid-roster-status');
    expect(message).not.toContain(SECRET);
  });
});
