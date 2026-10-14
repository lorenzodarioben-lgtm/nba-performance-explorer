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
  const grainId = useId();
  const clipId = useId();
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
              />
            ),
          )}
        </g>
        {children?.(projection)}
      </g>
    </svg>
  );
}
