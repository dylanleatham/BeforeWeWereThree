import type { Variants, Transition } from 'motion/react';

/**
 * Motion variants for envelope animations
 * Per CONTEXT.md: 400-500ms flourish animation
 */

// Envelope flap animation (ribbon untying effect)
export const envelopeFlapVariants: Variants = {
  sealed: {
    rotateX: 0,
    y: 0,
    opacity: 1,
  },
  opening: {
    rotateX: -180,
    y: -8,
    transition: {
      duration: 0.45, // 450ms per CONTEXT.md
      ease: [0.34, 1.56, 0.64, 1], // bounce easing
    },
  },
  opened: {
    rotateX: -180,
    y: 0,
    opacity: 0.7,
  },
};

// Content reveal animation (after flap opens)
export const contentRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.35, // Wait for flap animation
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

// Ribbon untying animation
export const ribbonVariants: Variants = {
  tied: {
    scale: 1,
    rotate: 0,
    opacity: 1,
  },
  untying: {
    scale: [1, 1.15, 0.85],
    rotate: [0, 15, -8, 0],
    opacity: [1, 1, 0.5],
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  untied: {
    scale: 0.85,
    rotate: -5,
    opacity: 0.4,
  },
};

// Completion badge pop-in
export const badgeVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
      delay: 0.1,
    },
  },
};

// Pile card stacking (for pile navigation)
export const pileCardVariants: Variants = {
  behind: (i: number) => ({
    scale: 1 - i * 0.04,
    y: i * 6,
    rotate: (i % 2 === 0 ? 1 : -1) * i * 1.5,
    zIndex: 10 - i,
    opacity: 1 - i * 0.12,
  }),
  front: {
    scale: 1,
    y: 0,
    rotate: 0,
    zIndex: 10,
    opacity: 1,
  },
  exit: {
    x: -300,
    opacity: 0,
    rotate: -10,
    transition: { duration: 0.3 },
  },
};

// Default spring for satisfying physical feel
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

// Tap feedback scale
export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
};
