import { motion } from 'motion/react';
import { useId, type ReactNode, type SVGProps } from 'react';

import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';
import {
  courtLines,
  projectCourt,
  type BasketSide,
  type CourtProjection,
} from './court';

// Presentation attributes mirror the stylesheet so an exported SVG keeps its court lines
// without the page CSS (the stylesheet still wins on screen).
const LINE_PAINT: Record<string, { stroke: string; width: number; dash?: string }> = {
  boundary: { stroke: 'rgba(244,243,241,0.55)', width: 1.6 },
  lane: { stroke: 'rgba(244,243,241,0.42)', width: 1.6 },
  arc: { stroke: 'rgba(244,243,241,0.42)', width: 1.6 },
  dashed: { stroke: 'rgba(244,243,241,0.28)', width: 1.6, dash: '6 7' },
  hash: { stroke: 'rgba(244,243,241,0.3)', width: 1.6 },
  rim: { stroke: '#ef4444', width: 2 },
  backboard: { stroke: 'rgba(244,243,241,0.8)', width: 2.4 },
};

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * The hardwood half court every shot view is drawn on. Lines come from the official geometry in
 * `court.ts`; children receive the projection so marks are placed from raw recorded coordinates.
 * When it first comes into view the lines draw in, as if being taped onto the floor.
 */
export function Court({
  side = 'top',
  depth,
  children,
  title,
  className,
  svgRef,
  floor = true,
  ...rest
}: {
  side?: BasketSide;
  depth?: number;
  children?: (projection: CourtProjection) => ReactNode;
  title?: string;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
  floor?: boolean;
} & Omit<SVGProps<SVGSVGElement>, 'children' | 'ref'>) {
  const projection = projectCourt(side, depth);
  const allowed = useMotionAllowed();
  const grainId = safeId(`court-grain-${useId()}`);
  const clipId = safeId(`court-clip-${useId()}`);
  return (
    <svg
      ref={svgRef}
      viewBox={projection.viewBox}
      className={`court ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={projection.width} height={projection.height} />
        </clipPath>
        {floor ? (
          <linearGradient id={grainId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1a1612" />
            <stop offset="0.5" stopColor="#1f1a15" />
            <stop offset="1" stopColor="#1a1612" />
          </linearGradient>
        ) : null}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {floor ? (
          <>
            <rect
              className="court__floor"
              width={projection.width}
              height={projection.height}
              fill={`url(#${grainId})`}
            />
            <g className="court__boards" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <line
                  key={index}
                  x1={(index + 1) * (projection.width / 13)}
                  x2={(index + 1) * (projection.width / 13)}
                  y1={0}
                  y2={projection.height}
                />
              ))}
            </g>
          </>
        ) : null}
        <g className="court__lines">
          {courtLines(projection).map((line, index) =>
            // Dashed lines keep their dash pattern, so they fade in instead of drawing on.
            allowed ? (
              <motion.path
                key={`${side}-${index}`}
                d={line.d}
                className={`court__line court__line--${line.kind}`}
                fill="none"
                stroke={LINE_PAINT[line.kind]?.stroke}
                strokeWidth={LINE_PAINT[line.kind]?.width}
                strokeDasharray={LINE_PAINT[line.kind]?.dash}
                initial={
                  line.kind === 'dashed'
                    ? { opacity: 0 }
                    : { pathLength: 0, opacity: 0 }
                }
                whileInView={
                  line.kind === 'dashed'
                    ? { opacity: 1 }
                    : { pathLength: 1, opacity: 1 }
                }
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  pathLength: {
                    duration: 1.2,
                    ease: easings.arena,
                    delay: index * 0.035,
                  },
                  opacity: { duration: 0.2, delay: index * 0.035 },
                }}
              />
            ) : (
              <path
                key={`${side}-${index}`}
                d={line.d}
                className={`court__line court__line--${line.kind}`}
                fill="none"
                stroke={LINE_PAINT[line.kind]?.stroke}
                strokeWidth={LINE_PAINT[line.kind]?.width}
                strokeDasharray={LINE_PAINT[line.kind]?.dash}
              />
            ),
          )}
        </g>
        {children?.(projection)}
      </g>
    </svg>
  );
}
