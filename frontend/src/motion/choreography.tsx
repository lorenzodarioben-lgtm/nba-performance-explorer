import {
  AnimatePresence,
  motion,
  MotionGlobalConfig,
  useIsPresent,
  useMotionValue,
  useSpring,
  type MotionValue,
  type Variants,
} from 'motion/react';
import {
  Fragment,
  useEffect,
  useSyncExternalStore,
  type ElementType,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';

import { useMotionAllowed } from './MotionPreference';
import { easings, springs, staggers, transitions } from './tokens';

// ------------------------------------------------------------------ kinetic headline

/**
 * Oversized display type that rises line by line out of a mask: the Arena signature. The text is
 * real, selectable and read in full by assistive technology (lines are separated by spaces).
 */
export function KineticHeadline({
  lines,
  as = 'h1',
  className,
  lineClassName,
  delay = 0,
  stagger = staggers.arena,
  id,
  headingRef,
  tabIndex,
}: {
  lines: readonly ReactNode[];
  as?: 'h1' | 'h2' | 'p' | 'div';
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  id?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  tabIndex?: number;
}) {
  const allowed = useMotionAllowed();
  const Tag = as as ElementType;
  return (
    <Tag ref={headingRef} id={id} tabIndex={tabIndex} className={className}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? ' ' : null}
          <span className={`kinetic-line ${lineClassName ?? ''}`}>
            <motion.span
              className="kinetic-line__inner"
              initial={allowed ? { y: '108%', rotate: 2.5 } : false}
              animate={{ y: '0%', rotate: 0 }}
              transition={{ ...transitions.cinematic, delay: delay + index * stagger }}
            >
              {line}
            </motion.span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}

// ---------------------------------------------------------------------- reveals

export type RevealVariant =
  | 'rise'
  | 'mask'
  | 'wipe'
  | 'fade'
  | 'scale'
  | 'from-left'
  | 'from-right';

const revealVariants: Record<RevealVariant, Variants> = {
  rise: { hidden: { opacity: 0, y: 28 }, shown: { opacity: 1, y: 0 } },
  mask: {
    hidden: { clipPath: 'inset(0% 0% 100% 0%)', y: 18 },
    shown: { clipPath: 'inset(0% 0% 0% 0%)', y: 0 },
  },
  wipe: {
    hidden: { clipPath: 'inset(0% 100% 0% 0%)' },
    shown: { clipPath: 'inset(0% 0% 0% 0%)' },
  },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
  scale: { hidden: { opacity: 0, scale: 0.965 }, shown: { opacity: 1, scale: 1 } },
  'from-left': { hidden: { opacity: 0, x: -42 }, shown: { opacity: 1, x: 0 } },
  'from-right': { hidden: { opacity: 0, x: 42 }, shown: { opacity: 1, x: 0 } },
};

/**
 * Scroll-triggered entrance. Under reduced motion the content renders in place immediately, so
 * nothing is ever stranded invisible.
 */
export function Reveal({
  children,
  variant = 'rise',
  delay = 0,
  amount = 0.18,
  className,
  as = 'div',
  duration,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  amount?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span' | 'figure' | 'article';
  duration?: number;
}) {
  const allowed = useMotionAllowed();
  const Component = motion[as];
  if (!allowed) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Component
      className={className}
      variants={revealVariants[variant]}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount, margin: '0px 0px -6% 0px' }}
      transition={{
        duration: duration ?? (variant === 'wipe' || variant === 'mask' ? 0.9 : 0.7),
        ease: easings.arena,
        delay,
      }}
    >
      {children}
    </Component>
  );
}

/** A group whose children enter in sequence when the group scrolls into view. */
export function Stagger({
  children,
  className,
  gap = staggers.base,
  delay = 0,
  as = 'div',
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: 'div' | 'ul' | 'ol' | 'section' | 'dl' | 'tbody';
  amount?: number;
}) {
  const allowed = useMotionAllowed();
  const Component = motion[as];
  if (!allowed) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  variant = 'rise',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  as?: 'div' | 'li' | 'span' | 'article' | 'tr' | 'dd' | 'section';
}) {
  const allowed = useMotionAllowed();
  const Component = motion[as];
  if (!allowed) {
    const Plain = as as ElementType;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Component
      className={className}
      variants={revealVariants[variant]}
      transition={{ duration: 0.62, ease: easings.arena }}
    >
      {children}
    </Component>
  );
}

// ------------------------------------------------------------------- value flip

function FlipFace({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.span
      className="flip__face"
      aria-hidden={present ? undefined : true}
      initial={{ y: '55%', opacity: 0, filter: 'blur(4px)' }}
      animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
      exit={{ y: '-55%', opacity: 0, filter: 'blur(4px)' }}
      transition={springs.data}
    >
      {children}
    </motion.span>
  );
}

/**
 * A scoreboard-style change between two genuine values: the old figure leaves, the new one
 * arrives. No intermediate number is ever drawn, so nothing fabricated appears on screen.
 */
export function FlipValue({ value, className }: { value: string; className?: string }) {
  const allowed = useMotionAllowed();
  if (!allowed || MotionGlobalConfig.skipAnimations) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span className={`flip ${className ?? ''}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <FlipFace key={value}>{value}</FlipFace>
      </AnimatePresence>
    </span>
  );
}

// -------------------------------------------------------------- pointer depth

function subscribeFinePointer(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(hover: hover) and (pointer: fine)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** True on devices with a precise hovering pointer (mouse, trackpad). */
export function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    () => false,
  );
}

/**
 * Cursor-responsive depth for a surface. Pointer position is written straight into motion values
 * (no React state per frame) and eased by a spring, so the layers settle naturally on leave.
 * Returns normalised -1…1 values; layers map them to their own travel distance.
 */
export function usePointerDepth(target: RefObject<HTMLElement | null>): {
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, springs.depth);
  const y = useSpring(rawY, springs.depth);
  const allowed = useMotionAllowed();
  const fine = useFinePointer();

  useEffect(() => {
    const node = target.current;
    if (!node || !allowed || !fine) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        rawX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
        rawY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      rawX.set(0);
      rawY.set(0);
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, [target, allowed, fine, rawX, rawY]);

  return { x, y };
}

// ------------------------------------------------------------- route entrance

/** Film Room content entrance when a route renders: quick, short travel, no exit delay. */
export function RouteEntrance({
  children,
  routeKey,
  className,
}: {
  children: ReactNode;
  routeKey: string;
  className?: string;
}) {
  const allowed = useMotionAllowed();
  if (!allowed) return <div className={className}>{children}</div>;
  return (
    <motion.div
      key={routeKey}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.filmSlow}
    >
      {children}
    </motion.div>
  );
}
