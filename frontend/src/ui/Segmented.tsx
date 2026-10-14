import { LayoutGroup, motion } from 'motion/react';
import { useId } from 'react';

import { useMotionAllowed } from '../motion/MotionPreference';
import { springs } from '../motion/tokens';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A segmented toggle whose selection slides between options (a shared-layout thumb). Buttons
 * expose pressed state, so it works as a set of toggle buttons for keyboard and screen readers.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const groupId = useId();
  const allowed = useMotionAllowed();
  return (
    <LayoutGroup id={groupId}>
      <div className={`seg ${className ?? ''}`} role="group" aria-label={label}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="seg__btn"
              aria-pressed={on}
              onClick={() => onChange(option.value)}
            >
              {on ? (
                allowed ? (
                  <motion.span
                    layoutId="thumb"
                    className="seg__thumb"
                    transition={springs.nav}
                  />
                ) : (
                  <span className="seg__thumb" />
                )
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
