// The recorded seasons the archive can read, and the source conventions that differ by season:
// Wikipedia titles use an en dash ("2022–23"), and NBA regular-season game IDs encode the start
// year ("00222…" for 2022-23).

export const RECORDED_SEASONS = ['2023-24', '2022-23'] as const;
export type RecordedSeasonId = (typeof RECORDED_SEASONS)[number];

export function seasonFacts(season: RecordedSeasonId) {
  const startYear = Number(season.slice(0, 4));
  const yy = String(startYear % 100).padStart(2, '0');
  return {
    startYear,
    /** The title form Wikipedia uses, e.g. "2022–23". */
    label: `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`,
    /** Regular-season NBA game ID prefix, e.g. "00222". */
    regularIdPrefix: `002${yy}`,
  };
}
