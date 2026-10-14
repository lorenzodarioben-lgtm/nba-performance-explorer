import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { useSeen } from '../motion/choreography';
import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';
import { Tape, type TapeSpec } from './Tape';

/**
 * The film-room slate that opens every data module: a title, the source tape(s) and the scope,
 * sample and date metadata. The red tick draws across when the slate comes into view.
 */
export function Slate({
  title,
  as = 'h2',
  id,
  tapes = [],
  meta = [],
  compact = false,
  actions,
}: {
  title: ReactNode;
  as?: 'h2' | 'h3';
  id?: string;
  tapes?: readonly TapeSpec[];
  meta?: readonly ReactNode[];
  compact?: boolean;
  actions?: ReactNode;
}) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const Heading = as;
  return (
    <div ref={ref} className={`slate ${compact ? 'slate--compact' : ''}`}>
      <span className="slate__clap" aria-hidden="true" />
      <Heading className="slate__title" id={id}>
        {title}
      </Heading>
      {tapes.length || actions ? (
        <div className="slate__tapes">
          {actions}
          {tapes.map((tape) => (
            <Tape key={`${tape.code}-${tape.source ?? ''}`} {...tape} />
          ))}
        </div>
      ) : (
        <span />
      )}
      {meta.length ? (
        <div className="slate__meta">
          {meta.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </div>
      ) : null}
      {allowed ? (
        <motion.span
          aria-hidden="true"
          className="slate__tick"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: seen ? 1 : 0 }}
          transition={{ duration: 0.9, ease: easings.arena, delay: 0.1 }}
        />
      ) : (
        <span aria-hidden="true" className="slate__tick" />
      )}
    </div>
  );
}
