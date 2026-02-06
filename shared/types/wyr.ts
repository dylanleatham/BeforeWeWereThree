import { z } from 'zod';

/**
 * Would You Rather types for Before We Were Three
 * Defines the data model for WYR activities
 */

/**
 * Valid choices for a WYR prompt
 */
export type WYRChoice = 'option_a' | 'option_b';

/**
 * Phase state machine for WYR activity
 * - voting: Waiting for participants to vote
 * - waiting: Current participant voted, waiting for partner
 * - revealing: Both voted, showing reveal animation
 * - complete: Results displayed
 */
export type WYRPhase = 'voting' | 'waiting' | 'revealing' | 'complete';

/**
 * WYR prompt data (API response format)
 */
export interface WYRPrompt {
  id: string;
  envelopeId: string;
  optionA: string;
  optionB: string;
  createdAt: string;
}

/**
 * WYR results after reveal
 */
export interface WYRResults {
  myChoice: WYRChoice;
  partnerChoice: WYRChoice;
  isMatch: boolean;
}

/**
 * Full WYR activity state (for client state management)
 */
export interface WYRState {
  prompt: WYRPrompt;
  phase: WYRPhase;
  myVote: WYRChoice | null;
  partnerVoted: boolean;
  results: WYRResults | null;
}

/**
 * GET /api/wyr/:envelopeId response
 */
export interface WYRPromptResponse {
  prompt: WYRPrompt;
  myVote: WYRChoice | null;
  partnerVoted: boolean;
  results: WYRResults | null;
}

/**
 * POST /api/wyr/:promptId/vote request body
 */
export interface WYRVoteRequest {
  choice: WYRChoice;
}

/**
 * POST /api/wyr/:promptId/vote response
 */
export interface WYRVoteResponse {
  revealed: boolean;
  results?: WYRResults;
}

/**
 * SignalR message: A participant submitted their vote
 */
export interface WYRVoteSubmittedMessage {
  type: 'wyr_vote_submitted';
  promptId: string;
  participantId: string;
}

/**
 * SignalR message: Both participants voted, reveal is ready
 */
export interface WYRRevealReadyMessage {
  type: 'wyr_reveal_ready';
  promptId: string;
  results: WYRResults;
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Valid WYR choice values
 */
export const wyrChoiceSchema = z.enum(['option_a', 'option_b']);

/**
 * Vote request validation
 */
export const wyrVoteRequestSchema = z.object({
  choice: wyrChoiceSchema,
});

/**
 * Create prompt request validation (admin only)
 */
export const createWyrPromptSchema = z.object({
  envelopeId: z.string().uuid(),
  optionA: z.string().min(1, 'Option A is required').max(500, 'Option A too long'),
  optionB: z.string().min(1, 'Option B is required').max(500, 'Option B too long'),
});

export type CreateWYRPromptRequest = z.infer<typeof createWyrPromptSchema>;

/**
 * Update prompt request validation (admin only)
 */
export const updateWyrPromptSchema = z.object({
  optionA: z.string().min(1).max(500).optional(),
  optionB: z.string().min(1).max(500).optional(),
});

export type UpdateWYRPromptRequest = z.infer<typeof updateWyrPromptSchema>;
