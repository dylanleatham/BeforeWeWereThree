import { z } from 'zod';

/**
 * Photo Prompt types for Before We Were Three
 * Defines the data model for photo prompt activities
 */

/**
 * Phase state machine for Photo Prompt activity
 * - loading: Fetching initial state
 * - capturing: Participant is uploading their photo
 * - waiting: Current participant uploaded, waiting for partner
 * - complete: Both participants uploaded, keepsake view
 */
export type PhotoPromptPhase = 'loading' | 'capturing' | 'waiting' | 'complete';

/**
 * Photo prompt data (API response format)
 */
export interface PhotoPrompt {
  id: string;
  envelopeId: string;
  prompt: string;
  createdAt: string;
}

/**
 * Photo prompt response data (API response format)
 */
export interface PhotoPromptResponse {
  id: string;
  promptId: string;
  participantId: string;
  photoUrl: string;
  createdAt: string;
}

/**
 * GET /api/photo-prompts/:envelopeId response
 */
export interface PhotoPromptActivityResponse {
  prompt: PhotoPrompt;
  myResponse: PhotoPromptResponse | null;
  partnerResponse: PhotoPromptResponse | null;
}

/**
 * POST /api/photo-prompts/:envelopeId/respond response
 */
export interface SubmitPhotoPromptResponseResult {
  response: PhotoPromptResponse;
  completed: boolean;
  responses?: PhotoPromptResponse[];
}

/**
 * Response wrapping a single photo prompt (admin CRUD)
 */
export interface PhotoPromptDetailResponse {
  prompt: PhotoPrompt;
}

/**
 * SignalR message: A participant uploaded their photo
 */
export interface PhotoPromptSubmittedMessage {
  type: 'photo_prompt_submitted';
  promptId: string;
  participantId: string;
}

/**
 * SignalR message: Both participants uploaded, activity complete
 */
export interface PhotoPromptCompleteMessage {
  type: 'photo_prompt_complete';
  promptId: string;
  responses: PhotoPromptResponse[];
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Submit photo prompt response validation
 */
export const submitPhotoPromptResponseSchema = z.object({
  photoUrl: z.string().url('Photo URL is required'),
});

export type SubmitPhotoPromptResponseRequest = z.infer<typeof submitPhotoPromptResponseSchema>;

/**
 * Create photo prompt request validation (admin only)
 */
export const createPhotoPromptSchema = z.object({
  envelopeId: z.string().uuid(),
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
});

export type CreatePhotoPromptRequest = z.infer<typeof createPhotoPromptSchema>;

/**
 * Update photo prompt request validation (admin only)
 */
export const updatePhotoPromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long').optional(),
});

export type UpdatePhotoPromptRequest = z.infer<typeof updatePhotoPromptSchema>;
