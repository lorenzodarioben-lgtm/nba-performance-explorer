import { motion } from 'motion/react';

import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';

export interface MirrorRow {
  label: string;
  a: number | null;
  b: number | null;
  displayA: string;
  displayB: string;
}

/**
 * Tale of the tape for two sides: each row grows outward from a central axis on its own scale
 * (the larger of the pair fills the half), raw values always printed, no winner marking. Side A
 * is solid, side B hatched, so the pair never relies on colour alone.
 */
export function MirrorBars({
  rows,
  nameA,
  nameB,
  colorA = '#3b82f6',
  colorB = '#bd8008',
}: {
  rows: readonly MirrorRow[];
  nameA: string;
  nameB: string;
  colorA?: string;
  colorB?: string;
}) {
  const allowed = useMotionAllowed();
  return (
    <div className="mirror" aria-hidden="true">
      <div className="mirror__head">
        <span>
          <i style={{ background: colorA }} />
          {nameA}
        </span>
        <span>
          {nameB}
          <i className="is-hatch" style={{ background: colorB }} />
        </span>
      </div>
      {rows.map((row, index) => {
        const max = Math.max(Math.abs(row.a ?? 0), Math.abs(row.b ?? 0));
        const ratio = (value: number | null) =>
          value === null || max <= 0 ? 0 : Math.max(0, value) / max;
        return (
          <div key={row.label} className="mirror__row">
            <span className="mirror__val">{row.displayA}</span>
            <span className="mirror__track mirror__track--a">
              <motion.i
                style={{ background: colorA, originX: 1 }}
                initial={allowed ? { scaleX: 0 } : false}
                whileInView={{ scaleX: ratio(row.a) }}
                animate={{ scaleX: ratio(row.a) }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: easings.arena, delay: index * 0.05 }}
              />
            </span>
            <span className="mirror__label">{row.label}</span>
            <span className="mirror__track mirror__track--b">
              <motion.i
                className="is-hatch"
                style={{ background: colorB, originX: 0 }}
                initial={allowed ? { scaleX: 0 } : false}
                whileInView={{ scaleX: ratio(row.b) }}
                animate={{ scaleX: ratio(row.b) }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: easings.arena, delay: index * 0.05 }}
              />
            </span>
            <span className="mirror__val mirror__val--b">{row.displayB}</span>
          </div>
        );
      })}
    </div>
  );
}
