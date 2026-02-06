/**
 * Application configuration constants
 * Business rules, validation limits, and UI configuration
 */

// =============================================================================
// PIN Configuration
// =============================================================================

/** Expected PIN length (MMDDYYYY format) */
export const PIN_LENGTH = 8;

/** Display max length for PIN input (accounts for MM/DD/YYYY slashes) */
export const PIN_DISPLAY_MAX_LENGTH = 10;

// =============================================================================
// Form Validation
// =============================================================================

/** Maximum character length for envelope title */
export const ENVELOPE_TITLE_MAX_LENGTH = 100;

// =============================================================================
// Layout Configuration
// =============================================================================

/** Number of envelopes visible in pile (current + cards behind) */
export const ENVELOPE_PILE_VISIBLE_COUNT = 3;

// =============================================================================
// Gesture Configuration
// =============================================================================

/** Minimum distance in pixels to trigger swipe navigation */
export const SWIPE_THRESHOLD_PX = 80;

/** Velocity threshold to count as fast swipe (overrides distance threshold) */
export const FAST_SWIPE_VELOCITY = 0.5;
