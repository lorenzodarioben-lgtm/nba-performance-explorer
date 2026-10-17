// Motion tokens for the Arena & Film Room system. CSS mirrors the durations and curves in
// src/design/system.css (--dur-*, --ease-*). Each register has its own character:
//   Arena      cinematic, expressive entrances for identity moments (heroes, introductions)
//   Film Room  precise, quick responses for research and data
//   Nav        fast, spatially coherent movement between places
//   Data       truthful transitions between measured values (never interpolating fake values)
//   Feedback   immediate, restrained confirmation of an action
import type { Transition } from 'motion/react';

export const durations = {
  instant: 0.08,
  quick: 0.14,
  base: 0.22,
  slow: 0.38,
  arena: 0.72,
  cinematic: 1.1,
} as const;

export const easings = {
  arena: [0.16, 1, 0.3, 1],
  film: [0.25, 1, 0.5, 1],
  nav: [0.65, 0, 0.35, 1],
  snap: [0.2, 0.8, 0.2, 1],
} as const satisfies Record<string, [number, number, number, number]>;

export const springs = {
  nav: { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 },
  data: { type: 'spring', stiffness: 210, damping: 28 },
  feedback: { type: 'spring', stiffness: 700, damping: 32 },
  arena: { type: 'spring', stiffness: 120, damping: 22, mass: 1 },
  depth: { stiffness: 90, damping: 20, mass: 0.6 },
} as const satisfies Record<
  string,
  Transition | { stiffness: number; damping: number; mass: number }
>;

export const staggers = {
  tight: 0.03,
  base: 0.06,
  arena: 0.11,
} as const;

export const transitions = {
  arena: { duration: durations.arena, ease: easings.arena },
  cinematic: { duration: durations.cinematic, ease: easings.arena },
  film: { duration: durations.base, ease: easings.film },
  filmSlow: { duration: durations.slow, ease: easings.film },
  nav: { duration: durations.base, ease: easings.nav },
} as const satisfies Record<string, Transition>;
