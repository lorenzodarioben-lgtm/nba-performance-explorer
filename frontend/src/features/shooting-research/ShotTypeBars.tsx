import { motion } from 'motion/react';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';

interface Row {
  type: string;
  made: number | null;
  attempted: number | null;
  percentage: number | null;
}

/**
 * Makes inside attempts for each shot type. The track length is attempts (on one shared scale)
 * and the solid part is makes, so volume and accuracy read together. Counts are the source's own;
 * a row below the attempt minimum keeps its counts but shows no percentage.
 */
export function ShotTypeBars({ rows }: { rows: readonly Row[] }) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const maxAttempts = Math.max(1, ...rows.map((row) => row.attempted ?? 0));
  return (
    <div ref={ref} className="shotbars" data-chart="shot-types" aria-hidden="true">
      {rows.map((row, index) => {
        const track = row.attempted === null ? 0 : row.attempted / maxAttempts;
        const made =
          row.made === null || row.attempted === null || row.attempted === 0
            ? 0
            : row.made / row.attempted;
        return (
          <div key={row.type} className="shotbars__row">
            <span className="shotbars__label">{row.type}</span>
            <span className="shotbars__track">
              <motion.span
                className="shotbars__att"
                style={{ originX: 0 }}
                initial={allowed ? { scaleX: 0 } : false}
                animate={{ scaleX: seen ? track : 0 }}
                transition={{ duration: 0.8, ease: easings.arena, delay: index * 0.08 }}
              >
                <motion.span
                  className="shotbars__made"
                  style={{ originX: 0 }}
                  initial={allowed ? { scaleX: 0 } : false}
                  animate={{ scaleX: seen ? made : 0 }}
                  transition={{
                    duration: 0.8,
                    ease: easings.arena,
                    delay: 0.3 + index * 0.08,
                  }}
                />
              </motion.span>
            </span>
            <span className="shotbars__nums">
              {row.made ?? '—'}/{row.attempted ?? '—'}
              <b>
                {row.percentage === null
                  ? '—'
                  : `${(row.percentage * 100).toFixed(1)}%`}
              </b>
            </span>
          </div>
        );
      })}
      <p className="shotbars__key">
        <i className="shotbars__key-att" /> Attempts{' '}
        <i className="shotbars__key-made" /> Makes
      </p>
    </div>
  );
}
