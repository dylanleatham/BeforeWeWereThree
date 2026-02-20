import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  triviaAnswerRequestSchema,
  createTriviaQuestionSchema,
  updateTriviaQuestionSchema,
  assignQuestionsSchema,
  reorderQuestionsSchema,
} from 'shared';
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionsByEnvelopeId,
  assignQuestionsToEnvelope,
  reorderEnvelopeQuestions,
} from '../db/queries/trivia.js';
import { getEnvelopeState, submitAnswer } from '../services/trivia.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Trivia routes for Before We Were Three
 *
 * Guest endpoints (authMiddleware):
 * GET /trivia/:envelopeId - Get trivia state for envelope
 * POST /trivia/:envelopeId/answer - Submit answer
 *
 * Admin endpoints (adminMiddleware):
 * GET /trivia/admin/questions - List all questions in content library
 * POST /trivia/admin/questions - Create question
 * PATCH /trivia/admin/questions/:id - Update question
 * DELETE /trivia/admin/questions/:id - Delete question
 * GET /trivia/admin/envelope/:envelopeId/questions - Get questions assigned to envelope
 * PUT /trivia/admin/envelope/:envelopeId/questions - Assign questions to envelope
 * PUT /trivia/admin/envelope/:envelopeId/questions/reorder - Reorder questions
 */

const router = Router();

// ============================================================
// Admin routes (must be BEFORE param routes to avoid collision)
// ============================================================

/**
 * GET /trivia/admin/questions
 * List all trivia questions in content library (admin only)
 */
router.get(
  '/admin/questions',
  adminMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const questions = await getAllQuestions();
      res.json(successResponse({ questions }));
    } catch (error) {
      logger.error('Failed to list trivia questions', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to list trivia questions'));
    }
  }
);

/**
 * POST /trivia/admin/questions
 * Create a new trivia question (admin only)
 */
router.post(
  '/admin/questions',
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const parsed = createTriviaQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid question data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const question = await createQuestion(parsed.data);
      res.status(201).json(successResponse({ question }));
    } catch (error) {
      logger.error('Failed to create trivia question', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create trivia question'));
    }
  }
);

/**
 * PATCH /trivia/admin/questions/:id
 * Update a trivia question (admin only)
 */
router.patch(
  '/admin/questions/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateTriviaQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid question data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const question = await updateQuestion(id, parsed.data);
      if (!question) {
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Trivia question not found'));
        return;
      }

      res.json(successResponse({ question }));
    } catch (error) {
      logger.error('Failed to update trivia question', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update trivia question'));
    }
  }
);

/**
 * DELETE /trivia/admin/questions/:id
 * Delete a trivia question (admin only)
 * Cascades to delete envelope assignments
 */
router.delete(
  '/admin/questions/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await deleteQuestion(id);
      if (!deleted) {
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Trivia question not found'));
        return;
      }

      res.json(successResponse({ deleted: true }));
    } catch (error) {
      logger.error('Failed to delete trivia question', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete trivia question'));
    }
  }
);

/**
 * GET /trivia/admin/envelope/:envelopeId/questions
 * Get questions assigned to an envelope (admin only)
 */
router.get(
  '/admin/envelope/:envelopeId/questions',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const questions = await getQuestionsByEnvelopeId(envelopeId);
      res.json(successResponse({ questions }));
    } catch (error) {
      logger.error('Failed to get envelope trivia questions', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get envelope trivia questions'));
    }
  }
);

/**
 * PUT /trivia/admin/envelope/:envelopeId/questions
 * Assign questions to an envelope (admin only)
 * Replaces all existing assignments
 */
router.put(
  '/admin/envelope/:envelopeId/questions',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const parsed = assignQuestionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid assignment data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const count = await assignQuestionsToEnvelope(envelopeId, parsed.data.questionIds);
      res.json(successResponse({ assigned: count }));
    } catch (error) {
      logger.error('Failed to assign trivia questions', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to assign trivia questions'));
    }
  }
);

/**
 * PUT /trivia/admin/envelope/:envelopeId/questions/reorder
 * Reorder questions within an envelope (admin only)
 */
router.put(
  '/admin/envelope/:envelopeId/questions/reorder',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const parsed = reorderQuestionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid reorder data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const count = await reorderEnvelopeQuestions(envelopeId, parsed.data.questionIds);
      res.json(successResponse({ reordered: count }));
    } catch (error) {
      logger.error('Failed to reorder trivia questions', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to reorder trivia questions'));
    }
  }
);

// ============================================================
// Guest routes (param routes AFTER admin routes)
// ============================================================

/**
 * GET /trivia/:envelopeId
 * Get trivia state for an envelope (all questions with answer state)
 */
router.get(
  '/:envelopeId',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      const state = await getEnvelopeState(envelopeId, participantId);
      if (!state) {
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'No trivia questions found for this envelope'));
        return;
      }

      res.json(successResponse(state));
    } catch (error) {
      logger.error('Failed to get trivia envelope state', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get trivia envelope state'));
    }
  }
);

/**
 * POST /trivia/:envelopeId/answer
 * Submit an answer for a trivia question
 */
router.post(
  '/:envelopeId/answer',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      // Validate request body
      const parsed = triviaAnswerRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid answer data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const result = await submitAnswer(
        envelopeId,
        parsed.data.questionId,
        participantId,
        parsed.data.selectedIndex
      );
      res.json(successResponse(result));
    } catch (error) {
      // Handle known errors
      if (error instanceof Error) {
        if (error.message === 'QUESTION_NOT_FOUND') {
          res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Trivia question not found'));
          return;
        }
        if (error.message === 'ALREADY_ANSWERED') {
          res.status(409).json(errorResponse('ALREADY_VOTED', 'You have already answered this question'));
          return;
        }
      }
      logger.error('Failed to submit trivia answer', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit answer'));
    }
  }
);

export { router as triviaRouter };
