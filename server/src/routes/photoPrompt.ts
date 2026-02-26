import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  submitPhotoPromptResponseSchema,
  createPhotoPromptSchema,
  updatePhotoPromptSchema,
} from 'shared';
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  getPromptByEnvelopeId,
} from '../db/queries/photoPrompt.js';
import { getPhotoPromptState, submitResponse } from '../services/photoPrompt.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Photo Prompt routes for Before We Were Three
 *
 * GET    /:envelopeId                - Get photo prompt state (requires auth)
 * POST   /:envelopeId/respond        - Submit photo response (requires auth)
 * GET    /prompt/envelope/:envelopeId - Get prompt for envelope (admin only)
 * POST   /prompt                      - Create prompt (admin only)
 * PATCH  /prompt/:id                  - Update prompt (admin only)
 * DELETE /prompt/:id                  - Delete prompt (admin only)
 */

const router = Router();

// ============================================================
// Guest/Auth Routes
// ============================================================

/**
 * GET /:envelopeId
 * Get photo prompt state for an envelope
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

      const state = await getPhotoPromptState(envelopeId, participantId);
      if (!state) {
        res
          .status(404)
          .json(errorResponse('PHOTO_PROMPT_NOT_FOUND', 'No photo prompt found for this envelope'));
        return;
      }

      res.json(successResponse(state));
    } catch (error) {
      logger.error('Failed to get photo prompt state', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get photo prompt state'));
    }
  }
);

/**
 * POST /:envelopeId/respond
 * Submit a photo response for the current participant
 */
router.post(
  '/:envelopeId/respond',
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
      const parsed = submitPhotoPromptResponseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid response data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const result = await submitResponse(envelopeId, participantId, parsed.data.photoUrl);
      res.json(successResponse(result));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PHOTO_PROMPT_NOT_FOUND') {
          res
            .status(404)
            .json(errorResponse('PHOTO_PROMPT_NOT_FOUND', 'No photo prompt found for this envelope'));
          return;
        }
        if (error.message === 'ALREADY_RESPONDED') {
          res
            .status(409)
            .json(errorResponse('ALREADY_RESPONDED', 'You have already submitted a photo for this prompt'));
          return;
        }
      }
      logger.error('Failed to submit photo prompt response', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit photo response'));
    }
  }
);

// ============================================================
// Admin Routes
// ============================================================

/**
 * GET /prompt/envelope/:envelopeId
 * Get photo prompt for an envelope (admin only)
 */
router.get(
  '/prompt/envelope/:envelopeId',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const prompt = await getPromptByEnvelopeId(envelopeId);
      if (!prompt) {
        res.status(404).json(errorResponse('PHOTO_PROMPT_NOT_FOUND', 'No photo prompt found for this envelope'));
        return;
      }

      res.json(successResponse({ prompt }));
    } catch (error) {
      logger.error('Failed to get photo prompt for envelope', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get photo prompt'));
    }
  }
);

/**
 * POST /prompt
 * Create new photo prompt (admin only)
 */
router.post('/prompt', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createPhotoPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid prompt data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const prompt = await createPrompt(parsed.data);
    res.status(201).json(successResponse({ prompt }));
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      res
        .status(409)
        .json(errorResponse('PROMPT_EXISTS', 'This envelope already has a photo prompt'));
      return;
    }
    logger.error('Failed to create photo prompt', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create photo prompt'));
  }
});

/**
 * PATCH /prompt/:id
 * Update photo prompt (admin only)
 */
router.patch(
  '/prompt/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updatePhotoPromptSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid prompt data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const prompt = await updatePrompt(id, parsed.data);
      if (!prompt) {
        res.status(404).json(errorResponse('PHOTO_PROMPT_NOT_FOUND', 'Photo prompt not found'));
        return;
      }

      res.json(successResponse({ prompt }));
    } catch (error) {
      logger.error('Failed to update photo prompt', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update photo prompt'));
    }
  }
);

/**
 * DELETE /prompt/:id
 * Delete photo prompt (admin only)
 * Cascades to delete associated responses
 */
router.delete(
  '/prompt/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await deletePrompt(id);
      if (!deleted) {
        res.status(404).json(errorResponse('PHOTO_PROMPT_NOT_FOUND', 'Photo prompt not found'));
        return;
      }

      res.json(successResponse({ deleted: true }));
    } catch (error) {
      logger.error('Failed to delete photo prompt', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete photo prompt'));
    }
  }
);

export { router as photoPromptRouter };
