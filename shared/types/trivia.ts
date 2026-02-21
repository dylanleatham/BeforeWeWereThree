import { z } from 'zod';

/**
 * Trivia activity types for Before We Were Three
 * Defines the data model for multiple-choice trivia within envelopes
 */

/**
 * Answer option within a question
 */
export interface TriviaOption {
  text: string;
  isCorrect: boolean;
}

/**
 * Phase state machine for trivia activity (solo - no partner phases)
 * - answering: Displaying question, waiting for answer selection
 * - revealing: Suspense animation showing correct/incorrect + explanation
 * - complete: All questions answered, warm completion screen
 * - review: Reopened completed envelope, read-only scrollable view
 */
export type TriviaPhase = 'answering' | 'revealing' | 'complete' | 'review';

/**
 * Trivia question from content library (API response format)
 */
export interface TriviaQuestion {
  id: string;
  questionText: string;
  options: TriviaOption[];
  explanation: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Question assigned to an envelope (includes sort order)
 */
export interface TriviaEnvelopeQuestion {
  id: string;
  envelopeId: string;
  questionId: string;
  sortOrder: number;
  question: TriviaQuestion;
}

/**
 * Per-question state within the activity
 */
export interface TriviaQuestionState {
  question: TriviaQuestion;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  answered: boolean;
}

/**
 * GET /api/trivia/:envelopeId response
 */
export interface TriviaEnvelopeResponse {
  questions: TriviaQuestionState[];
  currentQuestionIndex: number;
  allComplete: boolean;
}

/**
 * POST /api/trivia/:envelopeId/answer request body
 */
export interface TriviaAnswerRequest {
  questionId: string;
  selectedIndex: number;
}

/**
 * POST /api/trivia/:envelopeId/answer response
 */
export interface TriviaAnswerResponse {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
  isLastQuestion: boolean;
  envelopeComplete: boolean;
}

/**
 * Response wrapping a list of trivia questions (admin content library)
 */
export interface TriviaQuestionsResponse {
  questions: TriviaQuestion[];
}

/**
 * Response wrapping a single trivia question (admin CRUD)
 */
export interface TriviaQuestionResponse {
  question: TriviaQuestion;
}

/**
 * Response wrapping trivia questions assigned to an envelope
 */
export interface TriviaEnvelopeQuestionsResponse {
  questions: TriviaEnvelopeQuestion[];
}

/**
 * Response for assignment/reorder operations returning affected count
 */
export interface TriviaAssignResponse {
  count: number;
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Answer request validation
 */
export const triviaAnswerRequestSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
});

/**
 * Single trivia option schema
 */
const triviaOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required').max(500),
  isCorrect: z.boolean(),
});

/**
 * Create question request validation (admin only)
 */
export const createTriviaQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000),
  options: z.array(triviaOptionSchema)
    .min(2, 'At least 2 options required')
    .max(4, 'At most 4 options')
    .refine(
      (opts) => opts.filter((o) => o.isCorrect).length === 1,
      'Exactly one option must be marked correct'
    ),
  explanation: z.string().max(2000).nullable().optional(),
});

export type CreateTriviaQuestionRequest = z.infer<typeof createTriviaQuestionSchema>;

/**
 * Update question request validation (admin only)
 */
export const updateTriviaQuestionSchema = createTriviaQuestionSchema.partial();
export type UpdateTriviaQuestionRequest = z.infer<typeof updateTriviaQuestionSchema>;

/**
 * Assign questions to envelope request validation (admin only)
 * Array order determines sort order
 */
export const assignQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type AssignQuestionsRequest = z.infer<typeof assignQuestionsSchema>;

/**
 * Reorder questions within an envelope (admin only)
 * Array order determines new sort order
 */
export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type ReorderQuestionsRequest = z.infer<typeof reorderQuestionsSchema>;
