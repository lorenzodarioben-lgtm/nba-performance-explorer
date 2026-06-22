// Sanitized, backend-private diagnostics for NBA.com Stats response validation. When the live
// provider rejects a response, the parser and mappers attach one of these structural diagnostics
// to the thrown `ProviderError` so a controlled, explicitly enabled run can pinpoint *where* the
// rejection happened — without ever exposing the upstream payload.
//
// A diagnostic carries only structural metadata: stage and a stable category, schema labels we
// already know (our required column and result-set names), the upstream structural labels
// (top-level key names, result-set names), counts, the primitive *category* (`typeof`) of an
// offending cell, and Zod issue codes/paths. It never carries cell values, rows, response bodies,
// cookies, headers, tokens, or URLs. These objects are emitted only when diagnostics are
// explicitly enabled (`NBA_STATS_DIAGNOSTICS=true`) or by the manually invoked connectivity gate.

import { z } from 'zod';

// The parser/mapper stage that rejected the response, from outermost to innermost.
export type DiagnosticStage =
  | 'envelope'
  | 'result-set'
  | 'required-columns'
  | 'row-width'
  | 'cell-type'
  | 'value-format'
  | 'mapped-schema';

// The coarse JavaScript category of a value — never the value itself.
export type PrimitiveCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'array'
  | 'object'
  | 'bigint'
  | 'symbol'
  | 'function';

// A single Zod problem reduced to its non-sensitive parts: the issue code and the structural path
// (object keys and array indices). The issue *message* is deliberately dropped because it can echo
// received values.
export interface ZodIssueSummary {
  code: string;
  path: (string | number)[];
}

// The complete set of sanitized fields a diagnostic may carry. Every field is optional because the
// available structural context differs by stage; only `stage` and `category` are always present.
export interface ResponseDiagnostic {
  stage: DiagnosticStage;
  // A stable internal failure category, e.g. `missing-result-set` or `invalid-roster-status`.
  category: string;
  // The safe internal NBA endpoint name (e.g. `commonallplayers`), added by the reporter.
  endpoint?: string;
  // The result-set name the parser required (one of our own constants), where relevant.
  expectedResultSet?: string;
  // Sorted top-level property names of the body (key names only, never values).
  topLevelKeys?: string[];
  // Whether the body exposes the plural/singular envelope keys.
  hasResultSets?: boolean;
  hasResultSet?: boolean;
  resultSetCount?: number;
  // Upstream result-set names present (structural labels, not player data).
  resultSetNames?: string[];
  headerCount?: number;
  rowCount?: number;
  // Required column names (our own constants) that were missing or duplicated.
  missingColumns?: string[];
  duplicateColumns?: string[];
  rejectedRowIndex?: number;
  // The header name (or its index) of the offending column. Header names are schema, not values.
  rejectedColumn?: string;
  rejectedColumnIndex?: number;
  // The `typeof` category of the offending cell — never the cell value.
  valueCategory?: PrimitiveCategory;
  zodIssues?: ZodIssueSummary[];
}

// Receives a finished diagnostic. The default implementation does nothing; a console reporter is
// constructed only when diagnostics are explicitly enabled.
export interface DiagnosticReporter {
  report(diagnostic: ResponseDiagnostic): void;
}

export const noopDiagnosticReporter: DiagnosticReporter = {
  report() {
    // Diagnostics disabled: intentionally do nothing.
  },
};

// A reporter that writes the sanitized diagnostic to the process logs. The diagnostic only ever
// contains bounded structural metadata, so serializing it cannot leak upstream data or bloat output.
export function createConsoleDiagnosticReporter(): DiagnosticReporter {
  return {
    report(diagnostic) {
      console.warn(`NBA Stats response diagnostic ${JSON.stringify(diagnostic)}`);
    },
  };
}

// The coarse category of a value, distinguishing `null` and arrays from generic objects.
export function primitiveCategory(value: unknown): PrimitiveCategory {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

// Whether `value` is a non-null, non-array object that owns `key`.
export function hasProperty(value: unknown, key: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

// Bounds applied to every upstream-derived structural label so a hostile or malformed response
// cannot bloat a log line, inject control characters/newlines/terminal escapes, or smuggle long
// arbitrary content into a diagnostic. Our own constants (the column/result-set names we require)
// are already short and safe; these bounds protect the labels that originate from the response.
const MAX_DIAGNOSTIC_ITEMS = 50;
const MAX_DIAGNOSTIC_STRING_LENGTH = 80;
const MAX_ZOD_ISSUES = 20;
const REPLACEMENT_CHARACTER = '�';

// A control character we must never reproduce in output: C0 controls (incl. newline, tab, NUL,
// escape), DEL, and the C1 controls. Compared by code point so no control byte appears in source.
function isControlCodePoint(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
}

// Make an upstream-derived identifier safe to emit: replace every control character (neutralizing
// newline and terminal-escape injection) and bound the length so one identifier cannot dominate the
// output. The original value is never reproduced verbatim once it exceeds the bound.
export function sanitizeIdentifier(value: string): string {
  let cleaned = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    cleaned += isControlCodePoint(code) ? REPLACEMENT_CHARACTER : character;
  }
  if (cleaned.length <= MAX_DIAGNOSTIC_STRING_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_DIAGNOSTIC_STRING_LENGTH)}…(+${cleaned.length - MAX_DIAGNOSTIC_STRING_LENGTH})`;
}

// Bound a list of upstream-derived identifiers: cap the item count (with a stable overflow marker)
// and sanitize every retained entry.
export function sanitizeIdentifierList(values: readonly string[]): string[] {
  const limited = values.slice(0, MAX_DIAGNOSTIC_ITEMS).map(sanitizeIdentifier);
  if (values.length > MAX_DIAGNOSTIC_ITEMS) {
    limited.push(`…(+${values.length - MAX_DIAGNOSTIC_ITEMS} more)`);
  }
  return limited;
}

// Sorted, bounded, sanitized top-level property names of a plain object body, or undefined for
// non-objects. Key names only; values are never read.
export function topLevelPropertyNames(value: unknown): string[] | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return sanitizeIdentifierList(Object.keys(value).sort());
}

// Reduce a Zod error to sanitized code/path summaries. Messages (which can echo values) are
// dropped; the issue count is bounded and path segments (object keys and array indices) are
// sanitized.
export function summarizeZodIssues(error: z.ZodError): ZodIssueSummary[] {
  return error.issues.slice(0, MAX_ZOD_ISSUES).map((issue) => ({
    code: sanitizeIdentifier(String(issue.code)),
    path: issue.path.map((segment) =>
      typeof segment === 'number' ? segment : sanitizeIdentifier(String(segment)),
    ),
  }));
}

// Deep-freeze a diagnostic so neither a reporter nor any later consumer can mutate the structural
// metadata stored on the original error — including arrays shared through a shallow copy. Returns
// the same (now frozen) object.
export function freezeDiagnostic(diagnostic: ResponseDiagnostic): ResponseDiagnostic {
  for (const list of [
    diagnostic.topLevelKeys,
    diagnostic.resultSetNames,
    diagnostic.missingColumns,
    diagnostic.duplicateColumns,
  ]) {
    if (list) {
      Object.freeze(list);
    }
  }
  if (diagnostic.zodIssues) {
    for (const issue of diagnostic.zodIssues) {
      Object.freeze(issue.path);
      Object.freeze(issue);
    }
    Object.freeze(diagnostic.zodIssues);
  }
  return Object.freeze(diagnostic);
}
