import type { ReactNode } from 'react';

import type { TapeSpec } from './Tape';
import { Tape } from './Tape';

/** A missing value: shown as a dash, read as "Unavailable". Never zero. */
export function NullValue() {
  return (
    <span className="null-value">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Unavailable</span>
    </span>
  );
}

export interface ColophonEntry {
  label: string;
  tapes: readonly TapeSpec[];
  note?: ReactNode;
}

/** The sources strip that closes a page: what each module was cut from. */
export function Colophon({
  entries,
  title = 'Sources on this page',
}: {
  entries: readonly ColophonEntry[];
  title?: string;
}) {
  return (
    <section className="colophon" aria-label={title}>
      <h2 className="sr-only">{title}</h2>
      {entries.map((entry) => (
        <div className="colophon__row" key={entry.label}>
          <div>{entry.label}</div>
          <div>
            {entry.tapes.map((tape) => (
              <Tape key={`${tape.code}${tape.source ?? ''}`} {...tape} />
            ))}
            {entry.note ? <span>{entry.note}</span> : null}
          </div>
        </div>
      ))}
    </section>
  );
}

export function LoadingLine({ children }: { children: ReactNode }) {
  return (
    <p className="loading-line" role="status" aria-live="polite">
      <i aria-hidden="true" />
      {children}
    </p>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  role,
  action,
}: {
  tone?: 'info' | 'warn' | 'error';
  title?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
  action?: ReactNode;
}) {
  // The role sits on the element that holds the message text, so the announced element and
  // the visible message are the same node.
  return (
    <div className={`notice notice--${tone}`} role={role}>
      {title ? <strong className="notice__title">{title}</strong> : null}
      {children}
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  );
}
