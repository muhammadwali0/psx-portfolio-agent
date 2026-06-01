/**
 * PSX Portfolio Agent — Animation Design Tokens
 * Physics-based motion, natural easing, purposeful micro-interactions.
 */

/** Spring configurations for Framer Motion */
export const spring = {
  /** Gentle, elegant transitions (drawer, page) */
  gentle: { type: 'spring' as const, stiffness: 120, damping: 20, mass: 1 },
  /** Snappy UI feedback (buttons, toggles) */
  snappy: { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 },
  /** Bouncy micro-interactions (badges, icons) */
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 15, mass: 0.6 },
  /** Smooth without overshoot (modals, overlays) */
  smooth: { type: 'spring' as const, stiffness: 200, damping: 28, mass: 1 },
  /** Slow, cinematic (splash screen) */
  cinematic: { type: 'spring' as const, stiffness: 80, damping: 18, mass: 1.2 },
} as const;

/** Easing curves */
export const easing = {
  easeOutExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeInOutCubic: [0.65, 0, 0.35, 1] as [number, number, number, number],
  easeOutCubic: [0.33, 1, 0.68, 1] as [number, number, number, number],
  easeInExpo: [0.7, 0, 0.84, 0] as [number, number, number, number],
} as const;

/** Duration constants (seconds) */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  moderate: 0.35,
  slow: 0.5,
  slower: 0.7,
  cinematic: 1.2,
  splash: 2.5,
} as const;

/** Stagger configurations for list animations */
export const stagger = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
  list: 0.06,
} as const;

/** Common animation variants for Framer Motion */
export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideRight: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
  },
} as const;

export type AnimationTokens = {
  spring: typeof spring;
  easing: typeof easing;
  duration: typeof duration;
  stagger: typeof stagger;
  variants: typeof variants;
};
