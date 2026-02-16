import { z } from 'zod';

/**
 * Would You Rather types for Before We Were Three
 * Defines the data model for WYR activities (supports multiple prompts per envelope)
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
 * - summary: Reopened completed envelope, scrollable read-only view
 */
export type WYRPhase = 'voting' | 'waiting' | 'revealing' | 'complete' | 'summary';

/**
 * WYR prompt data (API response format)
 */
export interface WYRPrompt {
  id: string;
  envelopeId: string;
  optionA: string;
  optionB: string;
  sortOrder: number;
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
 * State of a single prompt within a multi-prompt envelope
 */
export interface WYRPromptState {
  prompt: WYRPrompt;
  myVote: WYRChoice | null;
  partnerVoted: boolean;
  results: WYRResults | null;
}

/**
 * GET /api/wyr/:envelopeId response (multi-prompt)
 */
export interface WYREnvelopeResponse {
  prompts: WYRPromptState[];
  currentPromptIndex: number;
  allComplete: boolean;
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
  isLastPrompt: boolean;
  envelopeComplete: boolean;
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
  isLastPrompt: boolean;
  envelopeComplete: boolean;
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
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateWYRPromptRequest = z.infer<typeof createWyrPromptSchema>;

/**
 * Bulk create prompts request validation (admin only)
 */
export const createWyrPromptsBulkSchema = z.object({
  envelopeId: z.string().uuid(),
  prompts: z.array(z.object({
    optionA: z.string().min(1).max(500),
    optionB: z.string().min(1).max(500),
  })).min(1),
});

export type CreateWYRPromptsBulkRequest = z.infer<typeof createWyrPromptsBulkSchema>;

/**
 * Update prompt request validation (admin only)
 */
export const updateWyrPromptSchema = z.object({
  optionA: z.string().min(1).max(500).optional(),
  optionB: z.string().min(1).max(500).optional(),
});

export type UpdateWYRPromptRequest = z.infer<typeof updateWyrPromptSchema>;
