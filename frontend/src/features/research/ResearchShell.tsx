import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { DataProvenance } from '@nba-performance-explorer/contracts';

import styles from './research.module.css';
import { recentHistoryRepository } from '../my-nba/recent-history';

export function ResearchShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => {
    recentHistoryRepository.record({
      path: `${location.pathname}${location.search}`,
      label: title.slice(0, 100),
      visitedAt: new Date().toISOString(),
    });
  }, [location.pathname, location.search, title]);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
  return (
    <main className={styles.page}>
      <a href="#research-content">Skip research navigation</a>
      <nav aria-label="Research sections">
        <Link to="/explore">Explorer</Link>
        <Link to="/teams">Teams</Link>
        <Link to="/lab/compare">Comparison lab</Link>
        <Link to="/lab/analytics">Analytics lab</Link>
        <Link to="/lab/careers">Career comparison</Link>
        <Link to="/history">Historical seasons</Link>
        <Link to="/games">Recorded games</Link>
        <Link to="/standings">Historical standings</Link>
        <Link to="/leaders">Published leaders</Link>
        <Link to="/discover">Discovery</Link>
        <Link to="/leaders/recorded">Recorded cohort leaders</Link>
        <Link to="/history/records">Recorded game extrema</Link>
        <Link to="/lab/teams">Team comparison</Link>
        <Link to="/lab/groups">Hypothetical groups</Link>
        <Link to="/lab/recorded">Recorded cohort analytics</Link>
        <Link to="/lab/profiles">Percentile profiles</Link>
        <Link to="/lab/shots">Recorded shot studio</Link>
        <Link to="/discover/recorded">Recorded cohort discovery</Link>
        <Link to="/history/calendar">Calendar game archive</Link>
        <Link to="/history/awards">Historical yearly awards</Link>
        <Link to="/history/progression">Record progression and trends</Link>
        <Link to="/lab/lineups">Research lineup reports</Link>
        <Link to="/games/shooting">Recorded game shooting</Link>
        <Link to="/history/draft">Historical draft class</Link>
        <Link to="/my-nba">My NBA</Link>
        <Link to="/">Original home</Link>
      </nav>
      <h1 id="research-content" ref={heading} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </main>
  );
}

export function SourceNote({ provenance }: { provenance: DataProvenance }) {
  return (
    <aside className={styles.note} aria-label="Data source and coverage">
      <strong>
        {provenance.source === 'fixture'
          ? 'DEMO FIXTURES — not real NBA results'
          : provenance.source === 'nba-stats'
            ? 'Statistics sourced from NBA.com'
            : `Source: ${provenance.source}`}
      </strong>
      <p>{provenance.coverage}</p>
      <p>
        Response served {new Date(provenance.servedAt).toLocaleString()}. This is not a
        live feed.
      </p>
      {provenance.retrievedAt && (
        <p>
          Upstream response fetched {new Date(provenance.retrievedAt).toLocaleString()};
          published as-of time is unknown.
        </p>
      )}
      <ul>
        {provenance.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
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
  if (pending) return <p role="status">Loading research data…</p>;
  if (failed)
    return (
      <p role="alert">
        NBA research data is unavailable or the selection is invalid. No substitute
        statistics are shown. Adjust the selection or try again later.
      </p>
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
    <div className={styles.scroll} role="group" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
