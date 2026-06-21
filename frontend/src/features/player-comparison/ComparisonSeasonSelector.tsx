import { useId } from 'react';

// A native select listing only the seasons both players share (newest-first). When no valid
// shared season is currently in effect (an invalid or unavailable URL season), a disabled
// placeholder keeps the control accessible while the user picks a valid common season.
export function ComparisonSeasonSelector({
  seasons,
  value,
  onSeasonChange,
}: {
  seasons: readonly string[];
  value: string | null;
  onSeasonChange: (season: string) => void;
}) {
  const selectId = useId();
  const needsPlaceholder = value === null;

  return (
    <div className="mt-6">
      <label htmlFor={selectId} className="block text-sm font-semibold text-zinc-900">
        Comparison season
      </label>
      <select
        id={selectId}
        value={value ?? ''}
        onChange={(event) => {
          onSeasonChange(event.target.value);
        }}
        className="mt-2 w-full max-w-xs border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-950 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300 sm:w-auto"
      >
        {needsPlaceholder ? (
          <option value="" disabled>
            Select a season
          </option>
        ) : null}
        {seasons.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>
  );
}
