import type { Variants, Transition } from 'motion/react';
import {
  ENVELOPE_FLAP_DURATION,
  CONTENT_REVEAL_DELAY,
  CONTENT_REVEAL_DURATION,
  EXIT_ANIMATION_DURATION,
  PILE_CARD_OFFSET_PX,
  PILE_CARD_SCALE_REDUCTION,
  PILE_CARD_Y_OFFSET_PX,
  PILE_CARD_ROTATION_DEG,
  PILE_CARD_OPACITY_REDUCTION,
  PILE_CARD_EXIT_DURATION,
  BADGE_SPRING_STIFFNESS,
  BADGE_SPRING_DAMPING,
  BADGE_ANIMATION_DELAY,
  SPRING_STIFFNESS,
  SPRING_DAMPING,
  TAP_SCALE,
  TAP_SPRING_STIFFNESS,
  TAP_SPRING_DAMPING,
} from '../constants/animation';

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
      duration: ENVELOPE_FLAP_DURATION,
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
      delay: CONTENT_REVEAL_DELAY,
      duration: CONTENT_REVEAL_DURATION,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: EXIT_ANIMATION_DURATION,
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
      stiffness: BADGE_SPRING_STIFFNESS,
      damping: BADGE_SPRING_DAMPING,
      delay: BADGE_ANIMATION_DELAY,
    },
  },
};

// Pile card stacking (for pile navigation)
// Custom param: { i: number, direction: number } where direction is 1 (forward) or -1 (backward)
export const pileCardVariants: Variants = {
  enter: ({ direction }: { i: number; direction: number }) => ({
    x: direction > 0 ? 0 : -PILE_CARD_OFFSET_PX,
    opacity: direction > 0 ? 1 : 0,
    rotate: direction > 0 ? 0 : 10,
    scale: 1,
  }),
  behind: ({ i }: { i: number; direction: number }) => ({
    x: 0,
    scale: 1 - i * PILE_CARD_SCALE_REDUCTION,
    y: i * PILE_CARD_Y_OFFSET_PX,
    rotate: (i % 2 === 0 ? 1 : -1) * i * PILE_CARD_ROTATION_DEG,
    zIndex: 10 - i,
    opacity: 1 - i * PILE_CARD_OPACITY_REDUCTION,
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
    x: direction > 0 ? -PILE_CARD_OFFSET_PX : PILE_CARD_OFFSET_PX,
    opacity: 0,
    rotate: direction > 0 ? -10 : 10,
    transition: { duration: PILE_CARD_EXIT_DURATION },
  }),
};

// Default spring for satisfying physical feel
export const springTransition: Transition = {
  type: 'spring',
  stiffness: SPRING_STIFFNESS,
  damping: SPRING_DAMPING,
};

// Tap feedback scale
export const tapScale = {
  whileTap: { scale: TAP_SCALE },
  transition: { type: 'spring', stiffness: TAP_SPRING_STIFFNESS, damping: TAP_SPRING_DAMPING },
};
