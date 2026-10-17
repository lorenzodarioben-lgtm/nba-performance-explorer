import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';

import { KineticHeadline, Reveal } from '../motion/choreography';
import { Icon } from '../ui/Icon';

/** The "off the court" page for an address the platform does not have. */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <main className="wrap offcourt">
      <span className="offcourt__ghost" aria-hidden="true">
        404
      </span>
      <p className="t-eyebrow is-red">Out of bounds</p>
      <KineticHeadline
        lines={['Off the', 'court.']}
        className="offcourt__title"
        headingRef={heading}
        tabIndex={-1}
      />
      <Reveal delay={0.3}>
        <p className="t-lede">
          There is no page at <code className="t-meta">{pathname}</code>. Every address
          the platform has published still works; this one was never on tape.
        </p>
        <div className="offcourt__actions">
          <Link to="/" className="btn btn--primary">
            Home <Icon name="arrowRight" size={16} />
          </Link>
          <Link to="/players" className="btn">
            Players
          </Link>
          <Link to="/labs" className="btn">
            Labs
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
