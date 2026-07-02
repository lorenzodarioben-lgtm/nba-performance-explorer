import { Link } from 'react-router';

// The closing frame of the editorial experience (contentinfo landmark), present on every route. A
// large condensed sign-off, a short set of real destinations, and the single non-affiliation notice
// and source attribution, which stay plainly readable.
export function AppFooter() {
  return (
    <footer className="border-t border-white/10 bg-night text-chalk">
      <div className="mx-auto max-w-[80rem] px-6 py-16 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-white/55">NBA Performance Explorer</p>
            <p className="display mt-4 text-5xl font-extrabold uppercase leading-[0.88] text-chalk sm:text-6xl">
              Read
              <br />
              the game.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            <Link
              to="/"
              className="eyebrow link-slide text-white/65 transition-colors hover:text-white"
            >
              Search
            </Link>
            <Link
              to="/compare"
              className="eyebrow link-slide text-white/65 transition-colors hover:text-white"
            >
              Compare
            </Link>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Unofficial project, not affiliated with the NBA. Statistics sourced from
            NBA.com.
          </p>
          <p className="font-mono uppercase tracking-[0.14em]">Live NBA.com data</p>
        </div>
      </div>
    </footer>
  );
}
