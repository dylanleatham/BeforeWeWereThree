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

/** Minimum distance in pixels for a fast swipe to register (prevents accidental taps) */
export const FAST_SWIPE_MIN_DISTANCE_PX = 20;

// =============================================================================
// Evergreen Envelopes
// =============================================================================

/** Envelope types that never visually change state — always look fresh and inviting */
export const EVERGREEN_ENVELOPE_TYPES: ReadonlySet<string> = new Set(['name-game']);

// =============================================================================
// Letter Configuration
// =============================================================================

/** Maximum characters shown in letter preview buttons */
export const LETTER_PREVIEW_MAX_LENGTH = 60;

// =============================================================================
// Name Game Configuration
// =============================================================================

/** Maximum characters for guidance text (matches Zod schema) */
export const GUIDANCE_MAX_LENGTH = 500;

// =============================================================================
// Auto-Save Configuration
// =============================================================================

/** Delay before auto-save triggers after typing stops, in milliseconds */
export const AUTOSAVE_DELAY_MS = 1500;

/** Maximum time between auto-saves regardless of activity, in milliseconds */
export const AUTOSAVE_MAX_WAIT_MS = 5000;
