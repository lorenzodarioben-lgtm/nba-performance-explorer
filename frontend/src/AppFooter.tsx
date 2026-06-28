// A restrained, shared footer (contentinfo landmark) present on every route. It carries the
// single non-affiliation disclaimer and source attribution, relocated here from the home page so
// the notice is consistent across routes rather than duplicated per page.
export function AppFooter() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto max-w-[72rem] px-4 py-6 text-xs text-ink-3 sm:px-8">
        <p>
          Unofficial project, not affiliated with the NBA. Statistics sourced from
          NBA.com.
        </p>
      </div>
    </footer>
  );
}
