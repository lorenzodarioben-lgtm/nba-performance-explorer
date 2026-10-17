import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { DataProvenance } from '@nba-performance-explorer/contracts';

import styles from './research.module.css';
import { recentHistoryRepository } from '../my-nba/recent-history';
import { KineticHeadline } from '../../motion/choreography';
import { pageForPath, sectionForPath } from '../../shell/sections';
import { useReportProvenance } from '../../ui/DataMode';
import { LoadingLine, Notice } from '../../ui/DataState';
import { Tape, tapeForProvenance } from '../../ui/Tape';

/**
 * The Film Room page frame shared by every research route: breadcrumbs, the page title (the
 * route's single h1 and the focus target after navigation) and the `.fr` scope that themes the
 * research markup inside it. Section navigation lives in the masthead.
 */
export function ResearchShell({
  title,
  children,
  lede,
  backdrop,
  className = '',
}: {
  title: string;
  children: ReactNode;
  lede?: ReactNode;
  /** Decorative art behind the page head (hidden from assistive technology). */
  backdrop?: ReactNode;
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const section = sectionForPath(location.pathname);
  const page = pageForPath(location.pathname);
  useEffect(() => {
    recentHistoryRepository.record({
      path: `${location.pathname}${location.search}`,
      label: title.slice(0, 100),
      visitedAt: new Date().toISOString(),
    });
  }, [location.pathname, location.search, title]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <main className={`fr frpage wrap ${styles.page} ${className}`}>
      <div className="frpage__head">
        {backdrop ? (
          <div className="frpage__backdrop" aria-hidden="true">
            {backdrop}
          </div>
        ) : null}
        <nav aria-label="Breadcrumb">
          <ol className="frpage__crumbs">
            <li>
              <Link to="/">Home</Link>
            </li>
            {section ? (
              <li>
                <Link to={section.to}>{section.label}</Link>
              </li>
            ) : null}
            {page && page.to !== section?.to ? (
              <li>
                <Link
                  to={page.to}
                  aria-current={page.to === location.pathname ? 'page' : undefined}
                >
                  {page.label}
                </Link>
              </li>
            ) : null}
          </ol>
        </nav>
        <KineticHeadline
          lines={[title]}
          id="research-content"
          headingRef={heading}
          tabIndex={-1}
          className="frpage__title"
          stagger={0}
        />
        {lede ? <div className="frpage__lede">{lede}</div> : null}
      </div>
      <div className="frpage__body">{children}</div>
    </main>
  );
}

export function SourceNote({ provenance }: { provenance: DataProvenance }) {
  useReportProvenance(provenance);
  const tape = tapeForProvenance(provenance);
  return (
    <aside
      className={`source-note ${provenance.source === 'fixture' ? 'source-note--demo' : ''}`}
      aria-label="Data source and coverage"
    >
      <div className="source-note__top">
        <Tape {...tape} />
        <strong>
          {provenance.source === 'fixture'
            ? 'DEMO FIXTURES — not real NBA results'
            : provenance.source === 'nba-stats'
              ? 'Statistics sourced from NBA.com'
              : `Source: ${provenance.source}`}
        </strong>
      </div>
      <p>{provenance.coverage}</p>
      <p className="source-note__time">
        Response served {new Date(provenance.servedAt).toLocaleString()}. This is not a
        live feed.
      </p>
      {provenance.retrievedAt && (
        <p className="source-note__time">
          Upstream response fetched {new Date(provenance.retrievedAt).toLocaleString()};
          published as-of time is unknown.
        </p>
      )}
      {provenance.warnings.length ? (
        <ul>
          {provenance.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

export function QueryFeedback({
  pending,
  failed,
}: {
  pending: boolean;
  failed: boolean;
}) {
  if (pending) return <LoadingLine>Loading research data…</LoadingLine>;
  if (failed)
    return (
      <Notice tone="error" role="alert" title="Data unavailable">
        NBA research data is unavailable or the selection is invalid. No substitute
        statistics are shown. Adjust the selection or try again later, or{' '}
        <Link to="/explore/coverage">see what each source covers</Link>.
      </Notice>
    );
  return null;
}

export function ResearchTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="scroll-region" role="group" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
