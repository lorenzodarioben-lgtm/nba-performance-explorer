import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { useMotionAllowed } from '../motion/MotionPreference';
import { easings, springs } from '../motion/tokens';

export interface RankBarRow {
  key: string;
  label: ReactNode;
  value: number | null;
  display: string;
  meta?: ReactNode;
  highlight?: boolean;
}

/**
 * Horizontal ranked bars (leaders, comparisons, distributions). Bar length is a transform
 * (scaleX) so changes animate on the compositor; rows reorder with layout animation.
 */
export function RankBars({
  rows,
  max,
  label,
  color = 'var(--chalk-3)',
}: {
  rows: readonly RankBarRow[];
  /** Shared maximum for comparable scales; defaults to the largest row. */
  max?: number;
  label: string;
  color?: string;
}) {
  const allowed = useMotionAllowed();
  // Signed values (e.g. a margin) diverge from a centre line instead of a left edge.
  const diverging = rows.some((row) => row.value !== null && row.value < 0);
  const maxAbs = Math.max(
    0,
    ...rows.map((row) => (row.value === null ? 0 : Math.abs(row.value))),
  );
  const top =
    max ??
    Math.max(
      0,
      ...rows
        .map((row) => row.value)
        .filter((value): value is number => value !== null),
    );
  return (
    <ol className="rankbars" aria-label={label}>
      {rows.map((row, index) => {
        const ratio = diverging
          ? row.value === null || maxAbs <= 0
            ? 0
            : Math.abs(row.value) / maxAbs
          : row.value === null || top <= 0
            ? 0
            : Math.max(0, row.value / top);
        const negative = diverging && row.value !== null && row.value < 0;
        return (
          <motion.li
            key={row.key}
            layout={allowed ? 'position' : false}
            transition={springs.data}
            className={`rankbars__row ${row.highlight ? 'is-hl' : ''}`}
          >
            <span className="rankbars__label">{row.label}</span>
            <span
              className={`rankbars__track ${diverging ? 'rankbars__track--div' : ''}`}
              aria-hidden="true"
            >
              {row.value === null ? null : (
                <motion.i
                  className={diverging ? (negative ? 'is-neg' : 'is-pos') : undefined}
                  style={{
                    background: negative
                      ? 'var(--red-hi)'
                      : row.highlight
                        ? 'var(--red-hi)'
                        : color,
                    originX: negative ? 1 : 0,
                  }}
                  initial={allowed ? { scaleX: 0 } : false}
                  whileInView={{ scaleX: ratio }}
                  animate={{ scaleX: ratio }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    ease: easings.arena,
                    delay: Math.min(0.4, index * 0.04),
                  }}
                />
              )}
            </span>
            <span className="rankbars__value num">{row.display}</span>
            {row.meta ? <span className="rankbars__meta">{row.meta}</span> : null}
          </motion.li>
        );
      })}
    </ol>
  );
}
