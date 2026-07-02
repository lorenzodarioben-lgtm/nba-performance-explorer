import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

// The application masthead: a fixed, dark broadcast bar shared by every route. It overlays the top of
// the dark landing hero and the dark data views. It is a <header> banner landmark and deliberately
// contains no heading element, so each route's own <h1> stays the page heading and the focus target
// after client-side navigation. The identity link keeps the stable accessible name
// "NBA Performance Explorer".
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      aria-label="NBA Performance Explorer"
      onClick={onNavigate}
      className="flex items-center gap-2"
    >
      <span className="display bg-accent px-1.5 py-1 text-base font-extrabold uppercase leading-none text-white">
        NBA
      </span>
      <span className="display text-lg font-bold uppercase leading-none text-chalk sm:text-xl">
        Performance Explorer
      </span>
    </Link>
  );
}

export function AppHeader() {
  const { pathname } = useLocation();
  const isDataRoute = pathname.startsWith('/players/') || pathname === '/compare';
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // While the full-screen menu is open: move focus into the panel, lock background scroll, keep Tab
  // focus contained within the dialog (it is aria-modal and covers the page), and let Escape close it
  // and restore focus to the toggle.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const toggleButton = toggleRef.current;
    panelRef.current?.focus();
    document.documentElement.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }

      // Trap Tab within the open dialog: cycle from the last focusable back to the first (and the
      // reverse for Shift+Tab). Focusables are re-read on each Tab, so this stays correct if the menu
      // contents change, and focus is pulled back inside if it has somehow escaped the panel.
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) {
          return;
        }
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !panel.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !panel.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = '';
      (previouslyFocused ?? toggleButton)?.focus?.();
    };
  }, [menuOpen]);

  const desktopLinkClass =
    'eyebrow link-slide text-white/65 transition-colors hover:text-white';
  const menuLinkClass =
    'display text-4xl font-bold uppercase text-chalk transition-colors hover:text-accent';

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-night">
      <div className="mx-auto flex h-16 max-w-[80rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {isDataRoute ? (
            <Link to="/" className={desktopLinkClass}>
              Home
            </Link>
          ) : (
            <>
              <a href="#explore" className={desktopLinkClass}>
                Profiles
              </a>
              <a href="#trends" className={desktopLinkClass}>
                Career
              </a>
            </>
          )}
          <Link to="/compare" className={desktopLinkClass}>
            Compare
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="eyebrow -mr-1 flex items-center gap-2 px-1 py-2 text-white/80 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="app-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
          <span className="flex flex-col gap-[3px]">
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <div
          id="app-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-night px-6 pt-5 outline-none"
        >
          <div className="flex h-11 items-center justify-between">
            <Brand onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              className="eyebrow px-1 py-2 text-white/80"
              onClick={() => setMenuOpen(false)}
            >
              Close
            </button>
          </div>
          <nav
            aria-label="Menu"
            className="mt-16 flex flex-col gap-8"
            onClick={() => setMenuOpen(false)}
          >
            {isDataRoute ? (
              <Link to="/" className={menuLinkClass}>
                Home
              </Link>
            ) : (
              <>
                <a href="#explore" className={menuLinkClass}>
                  Profiles
                </a>
                <a href="#trends" className={menuLinkClass}>
                  Career
                </a>
              </>
            )}
            <Link to="/compare" className={menuLinkClass}>
              Compare
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
