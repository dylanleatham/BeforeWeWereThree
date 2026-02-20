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

// =============================================================================
// Would You Rather
// =============================================================================

/** Stagger delay between reveal animations in milliseconds */
export const WYR_REVEAL_STAGGER_MS = 200;

/** Duration of reveal card animation in milliseconds */
export const WYR_REVEAL_DURATION_MS = 400;

/** Duration of match glow celebration effect in milliseconds */
export const WYR_MATCH_GLOW_DURATION_MS = 1500;

/** Delay before showing continue button in reveal phase in milliseconds */
export const WYR_REVEAL_BUTTON_DELAY_MS = 200;

/** Duration of waiting phase pulse animation in seconds */
export const WYR_WAITING_PULSE_DURATION_S = 2;

/** Duration of complete phase content fade in seconds */
export const WYR_COMPLETE_CONTENT_DURATION_S = 0.4;

/** Delay before complete phase button appears in seconds */
export const WYR_COMPLETE_BUTTON_DELAY_S = 0.5;

/** Duration of partner presence toast display in milliseconds */
export const PARTNER_TOAST_DURATION_MS = 3000;

// =============================================================================
// Scale Factors
// =============================================================================

/** Scale factor for button hover feedback */
export const BUTTON_HOVER_SCALE = 1.02;

/** Scale factor for option tap feedback */
export const OPTION_TAP_SCALE = 0.97;

/** Scale factor for modal/overlay enter animation */
export const MODAL_ENTER_SCALE = 0.95;

/** Scale factor for celebration/reveal enter animation */
export const CELEBRATION_ENTER_SCALE = 0.8;

/** Opacity range for pulse animation [min, max, min] */
export const PULSE_OPACITY_RANGE = [0.6, 1, 0.6] as const;

// =============================================================================
// Would You Rather - Summary
// =============================================================================

/** Stagger delay between summary items in seconds */
export const WYR_SUMMARY_ITEM_STAGGER_S = 0.1;

// =============================================================================
// Name Game
// =============================================================================

/** Duration of name card exit animation (fly off) in seconds */
export const NAME_CARD_EXIT_DURATION_S = 0.3;

/** Spring stiffness for name card return-to-center */
export const NAME_CARD_SPRING_STIFFNESS = 300;

/** Spring damping for name card return-to-center */
export const NAME_CARD_SPRING_DAMPING = 25;

/** Duration of generating phase pulse animation in seconds */
export const NAME_GAME_GENERATING_PULSE_DURATION_S = 2.5;

/** Stagger delay between result items in seconds */
export const NAME_GAME_RESULT_STAGGER_S = 0.1;

/** Duration of result card enter animation in seconds */
export const NAME_GAME_RESULT_ENTER_DURATION_S = 0.3;

// =============================================================================
// Trivia
// =============================================================================

/** Duration of suspense animation before reveal in milliseconds */
export const TRIVIA_SUSPENSE_DURATION_MS = 1200;

/** Duration of result reveal animation in milliseconds */
export const TRIVIA_REVEAL_DURATION_MS = 400;

/** Delay after reveal before explanation fades in, in milliseconds */
export const TRIVIA_EXPLANATION_DELAY_MS = 600;

/** Delay before Next/See Results button appears, in milliseconds */
export const TRIVIA_ADVANCE_BUTTON_DELAY_MS = 800;

/** Stagger delay between review items in seconds */
export const TRIVIA_REVIEW_ITEM_STAGGER_S = 0.1;

// =============================================================================
// Gender Reveal Ceremony
// =============================================================================

/** Duration of initial buildup phase (screen dims, glow starts) in milliseconds */
export const REVEAL_BUILDUP_DURATION_MS = 1500;

/** Duration of bloom expansion phase in milliseconds */
export const REVEAL_BLOOM_DURATION_MS = 2000;

/** Delay before reveal text appears in milliseconds */
export const REVEAL_TEXT_DELAY_MS = 3500;

/** Delay before animation settles in milliseconds */
export const REVEAL_SETTLE_DELAY_MS = 5500;

/** Delay before ceremony completes and transitions to keepsake in milliseconds */
export const REVEAL_COMPLETE_DELAY_MS = 6500;

/** Initial glow scale (small center point) */
export const REVEAL_GLOW_INITIAL_SCALE = 0.3;

/** Bloom phase glow scale (rapid expansion) */
export const REVEAL_GLOW_BLOOM_SCALE = 2.5;

/** Final settled glow scale */
export const REVEAL_GLOW_FINAL_SCALE = 3;

/** Initial text scale (slightly smaller before growing in) */
export const REVEAL_TEXT_INITIAL_SCALE = 0.8;

/** Duration of waiting phase pulse animation in milliseconds */
export const REVEAL_WAITING_PULSE_DURATION_MS = 2000;
