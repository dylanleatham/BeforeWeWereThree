import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  saveLetterSchema,
  submitLetterSchema,
  createLetterPromptSchema,
  updateLetterPromptSchema,
} from 'shared';
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  getPromptById,
} from '../db/queries/letter.js';
import { getLetterState, saveLetter, submitLetter } from '../services/letter.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

/**
 * Letter to Baby routes for Before We Were Three
 *
 * GET /letters/:envelopeId - Get letter state for envelope (requires auth)
 * PUT /letters/:envelopeId - Save letter content/auto-save (requires auth)
 * POST /letters/:envelopeId/submit - Submit letter (requires auth)
 * POST /letters/prompt - Create prompt (admin only)
 * PATCH /letters/prompt/:id - Update prompt (admin only)
 * DELETE /letters/prompt/:id - Delete prompt (admin only)
 */

const router = Router();

// ============================================================
// Guest/Auth Routes
// ============================================================

/**
 * GET /letters/:envelopeId
 * Get letter state for an envelope
 * Returns prompt, phase, my letter, and revealed letters if both submitted
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

      const state = await getLetterState(envelopeId, participantId);
      if (!state) {
        res
          .status(404)
          .json(errorResponse('PROMPT_NOT_FOUND', 'No letter prompt found for this envelope'));
        return;
      }

      res.json(successResponse(state));
    } catch (error) {
      console.error('Failed to get letter state:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get letter state'));
    }
  }
);

/**
 * PUT /letters/:envelopeId
 * Save letter content (auto-save)
 * Does not submit the letter, just saves draft
 */
router.put(
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

      // Validate request body
      const parsed = saveLetterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid letter data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const letter = await saveLetter(
        envelopeId,
        participantId,
        parsed.data.content,
        parsed.data.photoUrl ?? null
      );
      res.json(successResponse(letter));
    } catch (error) {
      // Handle known errors
      if (error instanceof Error) {
        if (error.message === 'PROMPT_NOT_FOUND') {
          res
            .status(404)
            .json(errorResponse('PROMPT_NOT_FOUND', 'No letter prompt found for this envelope'));
          return;
        }
      }
      console.error('Failed to save letter:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to save letter'));
    }
  }
);

/**
 * POST /letters/:envelopeId/submit
 * Submit letter (marks as complete)
 * Returns whether reveal happened and letters if so
 */
router.post(
  '/:envelopeId/submit',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      // Validate request body (optional content/photo for final save before submit)
      const parsed = submitLetterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid letter data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      // First save the final content, then submit
      await saveLetter(
        envelopeId,
        participantId,
        parsed.data.content,
        parsed.data.photoUrl ?? null
      );

      const result = await submitLetter(envelopeId, participantId);
      res.json(successResponse(result));
    } catch (error) {
      // Handle known errors
      if (error instanceof Error) {
        if (error.message === 'PROMPT_NOT_FOUND') {
          res
            .status(404)
            .json(errorResponse('PROMPT_NOT_FOUND', 'No letter prompt found for this envelope'));
          return;
        }
        if (error.message === 'ALREADY_SUBMITTED') {
          res
            .status(409)
            .json(errorResponse('ALREADY_SUBMITTED', 'You have already submitted your letter'));
          return;
        }
      }
      console.error('Failed to submit letter:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit letter'));
    }
  }
);

// ============================================================
// Admin Routes
// ============================================================

/**
 * POST /letters/prompt
 * Create new letter prompt (admin only)
 */
router.post('/prompt', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createLetterPromptSchema.safeParse(req.body);
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
    // Check for unique constraint violation (envelope already has prompt)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res
        .status(409)
        .json(errorResponse('PROMPT_EXISTS', 'This envelope already has a letter prompt'));
      return;
    }
    console.error('Failed to create letter prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create letter prompt'));
  }
});

/**
 * GET /letters/prompt/:id
 * Get letter prompt by ID (admin only, for management)
 */
router.get('/prompt/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const prompt = await getPromptById(id);
    if (!prompt) {
      res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Letter prompt not found'));
      return;
    }

    res.json(successResponse({ prompt }));
  } catch (error) {
    console.error('Failed to get letter prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get letter prompt'));
  }
});

/**
 * PATCH /letters/prompt/:id
 * Update letter prompt (admin only)
 */
router.patch(
  '/prompt/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = updateLetterPromptSchema.safeParse(req.body);
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
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Letter prompt not found'));
        return;
      }

      res.json(successResponse({ prompt }));
    } catch (error) {
      console.error('Failed to update letter prompt:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update letter prompt'));
    }
  }
);

/**
 * DELETE /letters/prompt/:id
 * Delete letter prompt (admin only)
 * Cascades to delete associated letters
 */
router.delete(
  '/prompt/:id',
  adminMiddleware,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await deletePrompt(id);
      if (!deleted) {
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'Letter prompt not found'));
        return;
      }

      res.json(successResponse({ deleted: true }));
    } catch (error) {
      console.error('Failed to delete letter prompt:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete letter prompt'));
    }
  }
);

export { router as letterRouter };
