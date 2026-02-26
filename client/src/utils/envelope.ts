import type { Envelope } from 'shared';

/**
 * Envelope types that have a meaningful completed-state view
 * (summary, keepsake, review screens) and remain clickable after completion.
 */
const TYPES_WITH_COMPLETED_VIEW = new Set<Envelope['type']>([
  'would-you-rather',
  'trivia',
  'friend-letter',
  'gender-reveal',
  'name-game',
]);

/**
 * Whether an envelope type has a completed-state view that users
 * can reopen after the activity is finished.
 */
export function hasCompletedView(type: Envelope['type']): boolean {
  return TYPES_WITH_COMPLETED_VIEW.has(type);
}

/**
 * Format a hyphenated envelope type string into a human-readable label.
 * e.g. 'would-you-rather' -> 'Would You Rather'
 */
export function formatEnvelopeTypeLabel(type: string): string {
  return type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
