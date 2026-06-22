// Strict, backend-private validation of NBA.com Stats responses. NBA.com returns a tabular
// envelope of named result sets (each with a `headers` array and a `rowSet` of value arrays).
// This module validates the envelope shape, selects a required result set by name, enforces the
// required columns and per-row width, and exposes typed, column-name-based cell accessors. Extra
// result sets and extra columns are tolerated so harmless NBA.com additions do not break us. Any
// violation becomes a `PROVIDER_INVALID_RESPONSE`. These shapes never leave the backend.

import { z } from 'zod';

import { providerInvalidResponse } from '../provider-error.js';

const ResultSetSchema = z.object({
  name: z.string(),
  headers: z.array(z.string()),
  rowSet: z.array(z.array(z.unknown())),
});

// Unknown top-level keys (resource, parameters, ...) and unused result sets are stripped/ignored.
const EnvelopeSchema = z.object({
  resultSets: z.array(ResultSetSchema),
});

export interface ResultSetTable {
  name: string;
  headers: readonly string[];
  rows: readonly (readonly unknown[])[];
  columnIndex: ReadonlyMap<string, number>;
}

export function selectResultSet(
  body: unknown,
  resultSetName: string,
  requiredColumns: readonly string[],
): ResultSetTable {
  const envelope = EnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    throw providerInvalidResponse('NBA Stats envelope is malformed.');
  }

  const resultSetNames = new Set<string>();
  for (const resultSet of envelope.data.resultSets) {
    if (resultSetNames.has(resultSet.name)) {
      throw providerInvalidResponse(
        `NBA Stats result set "${resultSet.name}" is duplicated.`,
      );
    }
    resultSetNames.add(resultSet.name);

    for (const row of resultSet.rowSet) {
      if (row.length !== resultSet.headers.length) {
        throw providerInvalidResponse(
          `NBA Stats result set "${resultSet.name}" has a row whose width does not match its headers.`,
        );
      }
    }
  }

  const matches = envelope.data.resultSets.filter((set) => set.name === resultSetName);
  if (matches.length === 0) {
    throw providerInvalidResponse(
      `NBA Stats result set "${resultSetName}" is missing.`,
    );
  }
  if (matches.length > 1) {
    throw providerInvalidResponse(
      `NBA Stats result set "${resultSetName}" is duplicated.`,
    );
  }

  const resultSet = matches[0];
  if (!resultSet) {
    throw providerInvalidResponse(
      `NBA Stats result set "${resultSetName}" is missing.`,
    );
  }
  const { headers, rowSet } = resultSet;

  const headerCounts = new Map<string, number>();
  const columnIndex = new Map<string, number>();
  headers.forEach((header, position) => {
    headerCounts.set(header, (headerCounts.get(header) ?? 0) + 1);
    if (!columnIndex.has(header)) {
      columnIndex.set(header, position);
    }
  });

  for (const column of requiredColumns) {
    const count = headerCounts.get(column) ?? 0;
    if (count === 0) {
      throw providerInvalidResponse(
        `NBA Stats result set "${resultSetName}" is missing column "${column}".`,
      );
    }
    if (count > 1) {
      throw providerInvalidResponse(
        `NBA Stats result set "${resultSetName}" has a duplicate column "${column}".`,
      );
    }
  }

  return { name: resultSetName, headers, rows: rowSet, columnIndex };
}

function cell(table: ResultSetTable, row: readonly unknown[], column: string): unknown {
  const index = table.columnIndex.get(column);
  if (index === undefined) {
    throw providerInvalidResponse(`NBA Stats column "${column}" was not validated.`);
  }
  return row[index];
}

export function requireString(
  table: ResultSetTable,
  row: readonly unknown[],
  column: string,
): string {
  const value = cell(table, row, column);
  if (typeof value !== 'string') {
    throw providerInvalidResponse(`NBA Stats column "${column}" is not a string.`);
  }
  return value;
}

export function optionalString(
  table: ResultSetTable,
  row: readonly unknown[],
  column: string,
): string | undefined {
  const value = cell(table, row, column);
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw providerInvalidResponse(`NBA Stats column "${column}" is not a string.`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function requireFiniteNumber(
  table: ResultSetTable,
  row: readonly unknown[],
  column: string,
): number {
  const value = cell(table, row, column);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw providerInvalidResponse(
      `NBA Stats column "${column}" is not a finite number.`,
    );
  }
  return value;
}

export function optionalFiniteNumber(
  table: ResultSetTable,
  row: readonly unknown[],
  column: string,
): number | undefined {
  const value = cell(table, row, column);
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw providerInvalidResponse(
      `NBA Stats column "${column}" is not a finite number.`,
    );
  }
  return value;
}

// A shooting percentage. NBA.com returns `null` when there are zero attempts; that maps to 0
// (zero made of zero attempts), which is conventional and not misleading.
export function ratioOrZero(
  table: ResultSetTable,
  row: readonly unknown[],
  column: string,
): number {
  return optionalFiniteNumber(table, row, column) ?? 0;
}

// Validate a mapped domain object with its shared schema, converting any failure into a
// provider-invalid-response so malformed upstream data never surfaces as a generic 500.
export function validateMapped<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw providerInvalidResponse(`NBA Stats produced an invalid ${label}.`);
  }
  return parsed.data;
}
