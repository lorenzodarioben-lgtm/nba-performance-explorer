import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useScroll,
  useTransform,
} from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { useMotionAllowed } from './motion/MotionPreference';
import { easings, springs } from './motion/tokens';
import { hasSubnav, pageForPath, SECTIONS, sectionForPath } from './shell/sections';
import { Icon } from './ui/Icon';

const loadSearchOverlay = () => import('./shell/SearchOverlay');
const SearchOverlay = lazy(() =>
  loadSearchOverlay().then((m) => ({ default: m.SearchOverlay })),
);

// The application masthead: a sticky broadcast bar shared by every route. It is the <header>
// banner landmark and deliberately contains no heading element, so each route's own <h1> stays
// the page heading and the focus target after client-side navigation. The identity link keeps
// the stable accessible name "NBA Performance Explorer".
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      aria-label="NBA Performance Explorer"
      onClick={onNavigate}
      className="brand"
    >
      {/* The NBA mark is supplied editorial brand imagery (ADR-022). An empty alt keeps it
          decorative (the link's accessible name carries the full application name). The
          "Unofficial" label and the footer non-affiliation notice keep the project clearly
          unaffiliated. */}
      <img
        src="/images/nba-logo.png"
        width={180}
        height={386}
        alt=""
        decoding="async"
      />
      <span>
        <span className="brand__name">Performance Explorer</span>
        <span className="brand__sub">Unofficial player analytics</span>
      </span>
    </Link>
  );
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

export function AppHeader() {
  const { pathname } = useLocation();
  const section = sectionForPath(pathname);
  const showSubnav = hasSubnav(pathname);
  const currentPage = pageForPath(pathname);
  const allowed = useMotionAllowed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpenState] = useState(false);
  // The overlay module loads on first use and then stays mounted so it can animate out.
  const [searchLoaded, setSearchLoaded] = useState(false);
  const setSearchOpen = (open: boolean) => {
    if (open) setSearchLoaded(true);
    setSearchOpenState(open);
  };
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeSubRef = useRef<HTMLAnchorElement>(null);

  // The masthead firms up as the page scrolls beneath it (a motion value, not React state).
  const { scrollY } = useScroll();
  const backdrop = useTransform(scrollY, [0, 96], [0.82, 1]);

  // Global search shortcuts: "/" outside text fields, and Ctrl/Cmd+K anywhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (
        (event.key === 'k' || event.key === 'K') &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setSearchLoaded(true);
        setSearchOpenState(true);
        return;
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable(event.target)
      ) {
        event.preventDefault();
        setSearchLoaded(true);
        setSearchOpenState(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Fetch the search module while the browser is idle, so the first keystrokes typed after the
  // shortcut land in the field instead of racing the module download.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSearchOverlay();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  // Keep the current sub-navigation item in view on narrow screens.
  useEffect(() => {
    activeSubRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  // While the full-screen menu is open: move focus into the panel, lock background scroll, keep
  // Tab focus contained within the dialog (it is aria-modal and covers the page), and let Escape
  // close it and restore focus to the toggle.
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

      // Trap Tab within the open dialog: cycle from the last focusable back to the first (and
      // the reverse for Shift+Tab). Focusables are re-read on each Tab, so this stays correct if
      // the menu contents change, and focus is pulled back inside if it has escaped the panel.
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

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="mast">
      <motion.div
        className="mast__bg"
        style={{ opacity: backdrop }}
        aria-hidden="true"
      />
      <span className="mast__rule" aria-hidden="true" />
      <div className="wrap mast__bar">
        <Brand />

        <LayoutGroup id="mast">
          <nav aria-label="Primary" className="mast__nav">
            {SECTIONS.map((entry) => {
              const on = section?.id === entry.id;
              return (
                <Link
                  key={entry.id}
                  to={entry.to}
                  className={`mast__link ${on ? 'is-on' : ''}`}
                  aria-current={pathname === entry.to ? 'page' : undefined}
                >
                  {entry.label}
                  {on ? (
                    <motion.span
                      layoutId="mast-active"
                      className="mast__active"
                      transition={springs.nav}
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="mast__tools">
          <button
            type="button"
            className="mast__search"
            aria-haspopup="dialog"
            aria-keyshortcuts="/ Control+K Meta+K"
            onClick={() => setSearchOpen(true)}
            onPointerEnter={() => void loadSearchOverlay()}
            onFocus={() => void loadSearchOverlay()}
          >
            <Icon name="search" size={17} />
            <span className="mast__search-label">Search players, teams, tools</span>
            <kbd className="kbd" aria-hidden="true">
              /
            </kbd>
          </button>
          <Link
            to="/my-nba"
            className="mast__mine"
            aria-current={pathname === '/my-nba' ? 'page' : undefined}
          >
            <Icon name="star" size={16} />
            <span>My NBA</span>
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="mast__menu"
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
            <span className="mast__menu-bars" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      {showSubnav && section ? (
        <nav aria-label={`${section.label} pages`} className="subnav">
          <LayoutGroup id="subnav">
            <div className="wrap subnav__inner">
              <span className="subnav__section" aria-hidden="true">
                {section.label}
              </span>
              {section.pages.map((page) => {
                const on = currentPage === page;
                return (
                  <Link
                    key={page.to}
                    ref={on ? activeSubRef : undefined}
                    to={page.to}
                    className="subnav__link"
                    aria-current={on ? 'page' : undefined}
                  >
                    {page.label}
                    {on ? (
                      <motion.span
                        layoutId="subnav-active"
                        className="subnav__active"
                        transition={springs.nav}
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </LayoutGroup>
        </nav>
      ) : null}

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="menu"
            id="app-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="menu"
            initial={allowed ? { clipPath: 'inset(0% 0% 100% 0%)' } : { opacity: 0 }}
            animate={allowed ? { clipPath: 'inset(0% 0% 0% 0%)' } : { opacity: 1 }}
            exit={
              allowed
                ? {
                    clipPath: 'inset(0% 0% 100% 0%)',
                    transition: { duration: 0.32, ease: easings.nav },
                  }
                : { opacity: 0 }
            }
            transition={{ duration: 0.5, ease: easings.arena }}
          >
            <div className="menu__top">
              <Brand onNavigate={closeMenu} />
              <button type="button" className="menu__close" onClick={closeMenu}>
                Close
                <Icon name="close" size={16} />
              </button>
            </div>
            <nav aria-label="Menu" className="menu__nav">
              {SECTIONS.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  className="menu__group"
                  initial={allowed ? { opacity: 0, y: 26 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    ease: easings.arena,
                    delay: 0.12 + index * 0.05,
                  }}
                >
                  <Link
                    to={entry.to}
                    className="menu__section"
                    onClick={closeMenu}
                    aria-current={pathname === entry.to ? 'page' : undefined}
                  >
                    <span className="menu__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {entry.label}
                  </Link>
                  {entry.pages.length > 1 ? (
                    <div className="menu__pages">
                      {entry.pages
                        .filter((page) => page.to !== entry.to)
                        .map((page) => (
                          <Link
                            key={page.to}
                            to={page.to}
                            onClick={closeMenu}
                            aria-current={currentPage === page ? 'page' : undefined}
                          >
                            {page.label}
                          </Link>
                        ))}
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </nav>
            <div className="menu__foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  closeMenu();
                  setSearchOpen(true);
                }}
              >
                <Icon name="search" size={16} />
                Search
              </button>
              <Link to="/my-nba" className="btn" onClick={closeMenu}>
                <Icon name="star" size={16} />
                My NBA
              </Link>
              <Link to="/explore" className="btn btn--quiet" onClick={closeMenu}>
                What&rsquo;s on tape
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {searchLoaded ? (
        <Suspense fallback={null}>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpenState(false)} />
        </Suspense>
      ) : null}
    </header>
  );
}
