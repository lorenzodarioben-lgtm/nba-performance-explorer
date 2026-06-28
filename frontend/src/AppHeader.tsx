import { Link } from 'react-router';

// A compact, single-line application header shared by every route. It carries the text-based
// product identity (linking home) and a single Compare link. It is a <header> banner landmark
// and deliberately contains no heading element, so each route's own <h1> stays the page heading
// and remains the focus target after client-side navigation.
export function AppHeader() {
  return (
    <header className="border-b border-edge bg-surface">
      <div className="mx-auto flex h-16 max-w-[72rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          to="/"
          className="whitespace-nowrap text-base font-bold tracking-tight text-ink"
        >
          <span className="text-accent">NBA</span> Performance Explorer
        </Link>
        <nav aria-label="Primary">
          <Link
            to="/compare"
            className="text-sm font-medium text-ink-2 transition-colors hover:text-accent"
          >
            Compare
          </Link>
        </nav>
      </div>
    </header>
  );
}
