import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { springs } from '../motion/tokens';

/**
 * A chart readout anchored to a data point. It flips to the left of the point near the right
 * edge and follows the point with a firm spring, so it never jitters across the plot.
 */
export function ChartTip({
  x,
  y,
  width,
  children,
  offset = 14,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
  offset?: number;
}) {
  const flip = x > width * 0.62;
  return (
    <motion.div
      className="tip"
      aria-hidden="true"
      initial={false}
      animate={{
        x: flip ? x - offset : x + offset,
        y: Math.max(0, y - 24),
        translateX: flip ? '-100%' : '0%',
        opacity: 1,
      }}
      transition={springs.nav}
      style={{ left: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

export function TipRow({
  label,
  value,
  swatch,
}: {
  label: ReactNode;
  value: ReactNode;
  swatch?: string;
}) {
  return (
    <div className="tip__row">
      {swatch ? <i style={{ background: swatch }} aria-hidden="true" /> : null}
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
