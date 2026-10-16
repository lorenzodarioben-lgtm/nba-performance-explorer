import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

const DURATION_MS = 420;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A long table shown as a short preview with a fade, and a disclosure button that reveals every
 * row. Hidden rows carry the `hidden` attribute, so assistive technology and the visual table
 * always agree. The height change is animated (skipped under reduced motion), and collapsing
 * from a scrolled-down position keeps the button still under the pointer instead of jumping.
 */
export function RowCollapse({
  total,
  preview = 7,
  noun,
  reveal = null,
  children,
}: {
  /** Every row in the table. */
  total: number;
  /** Rows shown while collapsed. */
  preview?: number;
  /** Plural name for the rows, used in the button: "games", "seasons". */
  noun: string;
  /** A row index that must be visible; a hidden one opens the table. */
  reveal?: number | null;
  /** Renders the table; rows at or after `visibleRows` must be `hidden`. */
  children: (visibleRows: number) => ReactNode;
}) {
  const collapsible = total > preview;
  const [open, setOpen] = useState(false); // what the button says and the fade shows
  const [rowsShown, setRowsShown] = useState(false); // whether the extra rows are in the table
  const bodyRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const growFrom = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const id = useId();
  // A new row selected elsewhere (a chart bar) that is hidden opens the table at once. Only a
  // change of target opens it, so collapsing again while it stays selected is respected.
  const [revealed, setRevealed] = useState(reveal);
  if (reveal !== revealed) {
    setRevealed(reveal);
    if (collapsible && reveal !== null && reveal >= preview && !rowsShown) {
      setOpen(true);
      setRowsShown(true);
    }
  }

  useEffect(() => () => cleanup.current?.(), []);

  // Opening: the rows are now in the table, so the full height is measurable.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const from = growFrom.current;
    growFrom.current = null;
    if (!body || from === null) return;
    const to = body.scrollHeight;
    if (Math.abs(to - from) < 1) return finish(body);
    body.style.height = `${from}px`;
    void body.offsetHeight; // commit the start height so the change transitions
    body.style.height = `${to}px`;
    whenSettled(body, () => finish(body));
  }, [rowsShown]);

  function finish(body: HTMLDivElement) {
    body.style.height = '';
    delete body.dataset.animating;
  }

  function whenSettled(body: HTMLDivElement, done: () => void, onFrame?: () => void) {
    cleanup.current?.();
    let frame = 0;
    const stop = () => {
      body.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      cleanup.current = null;
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target === body && event.propertyName === 'height') {
        stop();
        done();
      }
    };
    const tick = () => {
      onFrame?.();
      frame = requestAnimationFrame(tick);
    };
    body.addEventListener('transitionend', onEnd);
    const timer = window.setTimeout(() => {
      stop();
      done();
    }, DURATION_MS + 120);
    if (onFrame) frame = requestAnimationFrame(tick);
    cleanup.current = stop;
  }

  function expand() {
    setOpen(true);
    const body = bodyRef.current;
    if (body && !prefersReducedMotion()) {
      growFrom.current = body.getBoundingClientRect().height;
      body.style.height = `${growFrom.current}px`;
      body.dataset.animating = 'true';
    }
    setRowsShown(true);
  }

  function collapse() {
    setOpen(false);
    const body = bodyRef.current;
    const rows = body?.querySelectorAll<HTMLTableRowElement>('tbody > tr');
    const toggle = toggleRef.current;
    if (!body || !rows || rows.length <= preview || !toggle || prefersReducedMotion()) {
      // Without animation, still keep the button where it was on screen.
      const before = toggle?.getBoundingClientRect().top ?? 0;
      flushSync(() => setRowsShown(false));
      const drift = (toggle?.getBoundingClientRect().top ?? before) - before;
      if (drift) window.scrollBy({ top: drift, behavior: 'instant' });
      return;
    }
    const box = body.getBoundingClientRect();
    const lastShown = rows[preview - 1]!.getBoundingClientRect();
    const lastRow = rows[rows.length - 1]!.getBoundingClientRect();
    const to = lastShown.bottom - box.top + (box.bottom - lastRow.bottom);
    // When the table's top is above the viewport, hold the button still while the table shrinks.
    const anchored = box.top < 0;
    const anchorTop = toggle.getBoundingClientRect().top;
    const hold = () => {
      const drift = toggle.getBoundingClientRect().top - anchorTop;
      if (Math.abs(drift) >= 0.5) window.scrollBy({ top: drift, behavior: 'instant' });
    };
    body.style.height = `${box.height}px`;
    body.dataset.animating = 'true';
    void body.offsetHeight;
    body.style.height = `${to}px`;
    whenSettled(
      body,
      () => {
        // Hide the rows before releasing the fixed height, so the table never springs open.
        flushSync(() => setRowsShown(false));
        finish(body);
        if (anchored) hold();
      },
      anchored ? hold : undefined,
    );
  }

  if (!collapsible) return <>{children(total)}</>;

  return (
    <div className="rollup" data-open={open ? 'true' : 'false'}>
      <div ref={bodyRef} id={id} className="rollup__body">
        {children(rowsShown ? total : preview)}
        <span className="rollup__fade" aria-hidden="true" />
      </div>
      <div className="rollup__bar">
        <span className="rollup__count">
          {open ? `All ${total} ${noun}` : `${preview} of ${total} ${noun}`}
        </span>
        <button
          ref={toggleRef}
          type="button"
          className="rollup__toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={open ? collapse : expand}
        >
          {open ? 'Show less' : `View all ${total} ${noun}`}
          <svg viewBox="0 0 12 12" aria-hidden="true" className="rollup__chev">
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
