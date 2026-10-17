// Season helpers for charts. URLs and data keep the source form ("2023-24"); display uses an en
// dash. Charts on a calendar axis insert the seasons a record skips, so a line can never join
// across years that were not reported.

export function formatSeason(season: string) {
  return season.replace('-', '–');
}

export function shortSeason(season: string) {
  return `’${season.slice(2, 4)}–${season.slice(5, 7)}`;
}

const SEASON = /^(\d{4})-(\d{2})$/;

export function seasonStartYear(season: string) {
  const match = SEASON.exec(season);
  return match ? Number(match[1]) : null;
}

export function seasonFromStartYear(year: number) {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

/** Continuous seasons from the first to the last reported one (sorted, deduplicated). */
export function fillSeasonGaps(seasons: readonly string[]): string[] {
  const years = seasons
    .map(seasonStartYear)
    .filter((year): year is number => year !== null)
    .sort((a, b) => a - b);
  const first = years[0];
  const last = years[years.length - 1];
  if (first === undefined || last === undefined) return [...seasons];
  const out: string[] = [];
  for (let year = first; year <= last; year += 1) out.push(seasonFromStartYear(year));
  return out;
}

/** Values aligned to a continuous season axis; unreported seasons are null (a gap). */
export function alignToSeasons<T>(
  axis: readonly string[],
  rows: readonly T[],
  season: (row: T) => string,
  value: (row: T) => number | null,
): (number | null)[] {
  const bySeason = new Map(rows.map((row) => [season(row), value(row)]));
  return axis.map((entry) =>
    bySeason.has(entry) ? (bySeason.get(entry) ?? null) : null,
  );
}
