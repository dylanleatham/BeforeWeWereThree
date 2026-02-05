import type { Variants, Transition } from 'motion/react';

/**
 * Motion variants for envelope animations
 * Per CONTEXT.md: 400-500ms flourish animation
 */

// Envelope flap animation
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
// Custom param: { i: number, direction: number } where direction is 1 (forward) or -1 (backward)
export const pileCardVariants: Variants = {
  enter: ({ direction }: { i: number; direction: number }) => ({
    x: direction > 0 ? 0 : -300,
    opacity: direction > 0 ? 1 : 0,
    rotate: direction > 0 ? 0 : 10,
    scale: 1,
  }),
  behind: ({ i }: { i: number; direction: number }) => ({
    x: 0,
    scale: 1 - i * 0.04,
    y: i * 6,
    rotate: (i % 2 === 0 ? 1 : -1) * i * 1.5,
    zIndex: 10 - i,
    opacity: 1 - i * 0.12,
  }),
  front: {
    x: 0,
    scale: 1,
    y: 0,
    rotate: 0,
    zIndex: 10,
    opacity: 1,
  },
  exit: ({ direction }: { i: number; direction: number }) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    rotate: direction > 0 ? -10 : 10,
    transition: { duration: 0.3 },
  }),
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
