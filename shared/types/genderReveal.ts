import { z } from 'zod';

/**
 * Gender Reveal types for Before We Were Three
 * Defines the data model for the two-key gender reveal ceremony
 *
 * CRITICAL SECURITY: The gender value must NEVER be returned to the client
 * unless both keys have been validated (REVEAL-05 requirement).
 */

/**
 * Valid gender values
 */
export type GenderValue = 'boy' | 'girl';

/**
 * Phase state machine for gender reveal activity
 * - loading: Fetching state from server
 * - not-configured: No config exists (admin hasn't set up)
 * - key-entry: Waiting for this participant to enter key
 * - waiting: Key entered, waiting for partner's key
 * - ceremony: Both keys valid, playing reveal animation
 * - keepsake: Post-reveal static view
 */
export type GenderRevealPhase =
  | 'loading'
  | 'not-configured'
  | 'error'
  | 'key-entry'
  | 'waiting'
  | 'ceremony'
  | 'keepsake';

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Admin config request — set two unique dates (MMDDYYYY)
 * Gender value is NOT set by admin; it's set by the gender keeper friend
 */
export const configureGenderRevealSchema = z.object({
  keyA: z.string()
    .length(8, 'Date must be 8 digits (MMDDYYYY)')
    .regex(/^\d{8}$/, 'Date must be 8 digits'),
  keyB: z.string()
    .length(8, 'Date must be 8 digits (MMDDYYYY)')
    .regex(/^\d{8}$/, 'Date must be 8 digits'),
}).refine(data => data.keyA !== data.keyB, {
  message: 'Dates must be different',
  path: ['keyB'],
});

export type ConfigureGenderRevealRequest = z.infer<typeof configureGenderRevealSchema>;

/**
 * Friend input request — gender keeper sets the gender value (one-time, immutable)
 */
export const setGenderValueSchema = z.object({
  genderValue: z.enum(['boy', 'girl']),
});

export type SetGenderValueRequest = z.infer<typeof setGenderValueSchema>;

/**
 * Date validation request — participant submits their date (MMDDYYYY)
 */
export const validateRevealKeySchema = z.object({
  key: z.string()
    .length(8, 'Date must be 8 digits')
    .regex(/^\d{8}$/, 'Date must be numeric'),
});

export type ValidateRevealKeyRequest = z.infer<typeof validateRevealKeySchema>;

// ============================================================
// API Response Types
// ============================================================

/**
 * GET /api/gender-reveal/:envelopeId response
 * Participant-facing state — NEVER includes gender unless revealed
 */
export interface GenderRevealStateResponse {
  configured: boolean;
  keysValidated: number;  // 0, 1, or 2
  myKeyValidated: boolean;
  revealed: boolean;
  gender?: GenderValue;   // ONLY present when revealed === true
  keyLength?: number;     // How many character boxes to show
}

/**
 * POST /api/gender-reveal/:envelopeId/validate-key response
 * Discriminated union by status field
 */
export type ValidateKeyResponse =
  | { status: 'invalid_key' }
  | { status: 'key_already_used' }
  | { status: 'waiting_for_partner'; keysValidated: number }
  | { status: 'revealed'; gender: GenderValue }
  | { status: 'already_revealed'; gender: GenderValue };

/**
 * GET /api/gender-reveal/admin/:envelopeId response
 * Admin-only — includes config status but NEVER the gender value or raw keys
 * Admin re-enters keys when editing
 */
export interface GenderRevealAdminResponse {
  configured: boolean;
  genderSet: boolean;
  keyAValidated: boolean;
  keyBValidated: boolean;
  revealedAt?: string;
}

// ============================================================
// SignalR Message Types
// ============================================================

/**
 * SignalR message: A key has been validated (progress update)
 * Does NOT reveal which key or who — just progress count
 */
export interface GenderRevealKeyValidatedMessage {
  type: 'gender_reveal_key_validated';
  envelopeId: string;
  keysValidated: number;
}

/**
 * SignalR message: Both keys validated, reveal the gender
 * This is the only time the gender value is broadcast
 */
export interface GenderRevealUnlockedMessage {
  type: 'gender_reveal_unlocked';
  envelopeId: string;
  gender: GenderValue;
}
