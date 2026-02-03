import { z } from 'zod';

/**
 * Envelope types for Before We Were Three
 * Envelopes are the core UI metaphor - each contains one activity
 */

/**
 * Valid envelope statuses
 * - sealed: Not yet opened by users
 * - opened: Currently being worked on
 * - completed: Activity finished
 */
export type EnvelopeStatus = 'sealed' | 'opened' | 'completed';

/**
 * Valid envelope/activity types
 */
export type EnvelopeType =
  | 'would-you-rather'
  | 'letter'
  | 'trivia'
  | 'name-game'
  | 'gender-reveal';

/**
 * Envelope entity matching database model
 */
export interface Envelope {
  id: string;
  title: string;
  type: EnvelopeType;
  status: EnvelopeStatus;
  order: number;
  createdAt: string; // ISO date string for API transport
  updatedAt: string;
}

/**
 * Schema for creating an envelope (admin only)
 */
export const createEnvelopeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  type: z.enum(['would-you-rather', 'letter', 'trivia', 'name-game', 'gender-reveal']),
  order: z.number().int().min(0, 'Order must be non-negative'),
});

export type CreateEnvelopeRequest = z.infer<typeof createEnvelopeSchema>;

/**
 * Schema for updating an envelope (admin only)
 */
export const updateEnvelopeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  type: z.enum(['would-you-rather', 'letter', 'trivia', 'name-game', 'gender-reveal']).optional(),
  status: z.enum(['sealed', 'opened', 'completed']).optional(),
  order: z.number().int().min(0).optional(),
});

export type UpdateEnvelopeRequest = z.infer<typeof updateEnvelopeSchema>;

/**
 * Response types for envelope API
 */
export interface EnvelopeListResponse {
  envelopes: Envelope[];
}

export interface EnvelopeResponse {
  envelope: Envelope;
}
