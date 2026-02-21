import { z } from 'zod';

/**
 * Letter to Baby types for Before We Were Three
 * Defines the data model for letter activities
 */

/**
 * Phase state machine for Letter activity
 * - writing: Participant is drafting their letter
 * - waiting: Current participant submitted, waiting for partner
 * - revealing: Both submitted, showing reveal animation
 * - complete: Letters displayed
 */
export type LetterPhase = 'writing' | 'waiting' | 'revealing' | 'complete';

/**
 * Letter prompt data (API response format)
 */
export interface LetterPrompt {
  id: string;
  envelopeId: string;
  prompt: string;
  createdAt: string;
}

/**
 * Letter content data (API response format)
 */
export interface Letter {
  id: string;
  promptId: string;
  participantId: string;
  content: string;
  photoUrl: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full Letter activity state (for client state management)
 */
export interface LetterState {
  prompt: LetterPrompt;
  phase: LetterPhase;
  myLetter: Letter | null;
  partnerSubmitted: boolean;
  revealedLetters: Letter[];
}

/**
 * GET /api/letters/:envelopeId response
 */
export interface LetterPromptResponse {
  prompt: LetterPrompt;
  myLetter: Letter | null;
  partnerSubmitted: boolean;
  revealedLetters: Letter[];
}

/**
 * Response wrapping a saved/updated letter
 */
export interface SaveLetterResponse {
  letter: Letter;
}

/**
 * Response wrapping a single letter prompt (admin CRUD)
 */
export interface LetterPromptDetailResponse {
  prompt: LetterPrompt;
}

/**
 * POST /api/letters/:envelopeId/save request body
 * Saves draft letter content (does not submit)
 */
export interface SaveLetterRequest {
  content: string;
  photoUrl?: string | null;
}

/**
 * POST /api/letters/:envelopeId/submit request body
 * Submits the letter (locks content)
 */
export interface SubmitLetterRequest {
  content: string;
  photoUrl?: string | null;
}

/**
 * POST /api/letters/:envelopeId/submit response
 */
export interface SubmitLetterResponse {
  revealed: boolean;
  letters?: Letter[];
}

/**
 * SignalR message: A participant submitted their letter
 */
export interface LetterSubmittedMessage {
  type: 'letter_submitted';
  promptId: string;
  participantId: string;
}

/**
 * SignalR message: Both participants submitted, reveal is ready
 */
export interface LetterRevealReadyMessage {
  type: 'letter_reveal_ready';
  promptId: string;
  letters: Letter[];
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Save letter request validation
 */
export const saveLetterSchema = z.object({
  content: z.string().max(10000, 'Letter content too long'),
  photoUrl: z.string().url().nullable().optional(),
});

export type SaveLetterRequestValidated = z.infer<typeof saveLetterSchema>;

/**
 * Submit letter request validation
 */
export const submitLetterSchema = z.object({
  content: z.string().min(1, 'Letter content is required').max(10000, 'Letter content too long'),
  photoUrl: z.string().url().nullable().optional(),
});

export type SubmitLetterRequestValidated = z.infer<typeof submitLetterSchema>;

/**
 * Create letter prompt request validation (admin only)
 */
export const createLetterPromptSchema = z.object({
  envelopeId: z.string().uuid(),
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
});

export type CreateLetterPromptRequest = z.infer<typeof createLetterPromptSchema>;

/**
 * Update letter prompt request validation (admin only)
 */
export const updateLetterPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long').optional(),
});

export type UpdateLetterPromptRequest = z.infer<typeof updateLetterPromptSchema>;
