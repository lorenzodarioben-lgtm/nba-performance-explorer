import { Link } from 'react-router';

import { PlayerSearch } from '../player-search/PlayerSearch';
import { useHealthQuery } from './useHealthQuery';

// The public landing page: a concise product hero with the player search as the primary action.
const capabilities = [
  'Player profiles with bio and team details',
  'Regular-season statistics for any season',
  'Career trends for points, rebounds, and assists',
  'Game-by-game logs',
  'Two-player season comparisons',
  'Shareable comparison links',
];

// A small, unobtrusive service-status line. It reflects whether the application's data API is
// responding — which also gives useful feedback during a free-tier cold start — and never exposes
// internal service identifiers. Loading and failure states stay accessible (polite live region).
function ServiceStatus() {
  const healthQuery = useHealthQuery();

  if (healthQuery.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-zinc-600">
        Connecting to live data…
      </p>
    );
  }

  if (healthQuery.isError) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-zinc-600">
        Live data service temporarily unavailable. You can still try a search.
      </p>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-zinc-600"
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full bg-green-600"
      />
      Live data service available
    </p>
  );
}

export function FoundationPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <section
        aria-labelledby="project-title"
        className="w-full border-l-4 border-red-600 pl-6"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Live NBA player stats
        </p>
        <h1
          id="project-title"
          className="mt-2 text-4xl font-bold text-zinc-950 sm:text-5xl"
        >
          NBA Performance Explorer
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-700">
          Search any NBA player and explore their profile, season statistics, career
          trends, game logs, and head-to-head comparisons — using live data from
          NBA.com.
        </p>

        <PlayerSearch />

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">
            What you can explore
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-zinc-700 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-sm">
          <Link
            to="/compare"
            className="font-semibold text-red-700 underline underline-offset-4"
          >
            Compare two players
          </Link>
        </p>

        <div className="mt-10 border-t border-zinc-200 pt-4">
          <ServiceStatus />
          <p className="mt-2 text-xs text-zinc-500">
            Unofficial project, not affiliated with the NBA. Statistics sourced from
            NBA.com.
          </p>
        </div>
      </section>
    </main>
  );
}
