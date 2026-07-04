import { useId, useState } from 'react';

import { type ComparisonColumn, PlayerComparisonTable } from './PlayerComparisonTable';

// The detailed, exact-value comparison table is the authoritative representation, but for sighted
// users it largely repeats the Statistical matchup graph above it. So it is collapsed by default
// behind an accessible disclosure: a real <button> that exposes its expanded/collapsed state
// (aria-expanded) and points at the region it controls (aria-controls). The table itself, with every
// caption, row/column header, scope, and its named focusable scroll region, is unchanged; when the
// region is collapsed the `hidden` attribute keeps it out of the accessibility tree and off the tab
// order, and revealing it restores the full table.
export function ComparisonTableDisclosure({
  season,
  playerA,
  playerB,
}: {
  season: string;
  playerA: ComparisonColumn;
  playerB: ComparisonColumn;
}) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <div className="mt-8">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="group flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-coal px-4 py-3 text-left transition-colors hover:border-white/25"
      >
        <span className="flex flex-col">
          <span className="display text-sm font-bold uppercase tracking-wide text-chalk">
            {open ? 'Hide detailed statistics table' : 'View detailed statistics table'}
          </span>
          <span className="mt-0.5 text-xs text-white/55">
            Exact per-game values and shooting percentages for the {season} season.
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      <div id={regionId} hidden={!open} className="mt-3">
        <PlayerComparisonTable season={season} playerA={playerA} playerB={playerB} />
      </div>
    </div>
  );
}
