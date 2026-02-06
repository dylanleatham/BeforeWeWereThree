/**
 * Animation constants
 * Timing, spring physics, and visual animation values
 */

// =============================================================================
// General Animation Durations
// =============================================================================

/** Standard animation duration in milliseconds (used for PIN shake, envelope open) */
export const ANIMATION_DURATION_MS = 500;

/** Exit animation duration in seconds */
export const EXIT_ANIMATION_DURATION = 0.2;

// =============================================================================
// Envelope Animation
// =============================================================================

/** Flap opening animation duration in seconds (per CONTEXT.md: 400-500ms) */
export const ENVELOPE_FLAP_DURATION = 0.45;

/** Delay before content reveal (waits for flap animation) in seconds */
export const CONTENT_REVEAL_DELAY = 0.35;

/** Content reveal animation duration in seconds */
export const CONTENT_REVEAL_DURATION = 0.25;

// =============================================================================
// Pile Card Animation
// =============================================================================

/** Horizontal offset for pile card enter/exit in pixels */
export const PILE_CARD_OFFSET_PX = 300;

/** Scale reduction per card in pile (0.04 = 4% smaller per card behind) */
export const PILE_CARD_SCALE_REDUCTION = 0.04;

/** Vertical offset per card in pile in pixels */
export const PILE_CARD_Y_OFFSET_PX = 6;

/** Rotation angle per card in pile in degrees */
export const PILE_CARD_ROTATION_DEG = 1.5;

/** Opacity reduction per card in pile */
export const PILE_CARD_OPACITY_REDUCTION = 0.12;

/** Exit animation duration for pile cards in seconds */
export const PILE_CARD_EXIT_DURATION = 0.3;

// =============================================================================
// Interactive Feedback
// =============================================================================

/** Vertical lift on hover in pixels */
export const HOVER_LIFT_PX = 4;

/** Scale factor on tap/press */
export const TAP_SCALE = 0.98;

// =============================================================================
// Spring Physics
// =============================================================================

/** Default spring stiffness */
export const SPRING_STIFFNESS = 300;

/** Default spring damping */
export const SPRING_DAMPING = 25;

/** Badge animation spring stiffness (snappier) */
export const BADGE_SPRING_STIFFNESS = 400;

/** Badge animation spring damping */
export const BADGE_SPRING_DAMPING = 15;

/** Badge animation delay in seconds */
export const BADGE_ANIMATION_DELAY = 0.1;

/** Tap feedback spring stiffness */
export const TAP_SPRING_STIFFNESS = 400;

/** Tap feedback spring damping */
export const TAP_SPRING_DAMPING = 17;

// =============================================================================
// Haptic Feedback
// =============================================================================

/** Duration of single haptic tap in milliseconds */
export const HAPTIC_TAP_DURATION_MS = 50;

/** Vibration pattern for success feedback (tap-pause-tap) in milliseconds */
export const HAPTIC_SUCCESS_PATTERN_MS = [50, 50, 80] as const;
