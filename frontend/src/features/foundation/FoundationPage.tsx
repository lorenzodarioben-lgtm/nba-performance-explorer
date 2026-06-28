import { Link } from 'react-router';

import { PlayerSearch } from '../player-search/PlayerSearch';
import { useHealthQuery } from './useHealthQuery';

// The public landing page: a product hero with the player search as the primary action, paired
// with a concise overview of what the app does. Built only from existing content and links.
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
      <p role="status" aria-live="polite" className="text-sm text-ink-2">
        Connecting to live data…
      </p>
    );
  }

  if (healthQuery.isError) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-ink-2">
        Live data service temporarily unavailable. You can still try a search.
      </p>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-sm text-ink-2"
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-ok" />
      Live data service available
    </p>
  );
}

export function FoundationPage() {
  return (
    <main className="mx-auto max-w-[72rem] px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="project-title" className="lg:col-span-7">
          {/* The single intentional red identity moment on the page. */}
          <span aria-hidden="true" className="block h-1 w-12 bg-accent" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-2">
            Live NBA player stats
          </p>
          <h1
            id="project-title"
            className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl"
          >
            NBA Performance Explorer
          </h1>
          <p className="mt-4 max-w-prose text-lg text-ink-2">
            Search any NBA player and explore their profile, season statistics, career
            trends, game logs, and head-to-head comparisons, all from live NBA.com data.
          </p>

          <PlayerSearch />

          <div className="mt-6">
            <ServiceStatus />
          </div>
        </section>

        <div className="lg:col-span-5">
          <div className="rounded-md border border-edge bg-surface p-6">
            <h2 className="text-sm font-semibold text-ink">What you can explore</h2>
            <ul className="mt-4 space-y-2.5 text-ink-2">
              {capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
            <p className="mt-6 border-t border-edge pt-4">
              <Link
                to="/compare"
                className="font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-strong"
              >
                Compare two players
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
