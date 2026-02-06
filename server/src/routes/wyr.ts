import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  wyrVoteRequestSchema,
  createWyrPromptSchema,
  updateWyrPromptSchema,
} from 'shared';
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  getPromptById,
} from '../db/queries/wyr.js';
import { getPromptState, submitVote } from '../services/wyr.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

/**
 * Would You Rather routes for Before We Were Three
 *
 * GET /wyr/:envelopeId - Get prompt state for envelope (requires auth)
 * POST /wyr/:promptId/vote - Submit vote (requires auth)
 * POST /wyr - Create prompt (admin only)
 * PATCH /wyr/:id - Update prompt (admin only)
 * DELETE /wyr/:id - Delete prompt (admin only)
 */

const router = Router();

/**
 * GET /wyr/:envelopeId
 * Get WYR prompt state for an envelope
 * Returns prompt with current voting state for authenticated participant
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

      const state = await getPromptState(envelopeId, participantId);
      if (!state) {
        res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'No WYR prompt found for this envelope'));
        return;
      }

      res.json(successResponse(state));
    } catch (error) {
      console.error('Failed to get WYR prompt state:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get WYR prompt state'));
    }
  }
);

/**
 * POST /wyr/:promptId/vote
 * Submit a vote for a WYR prompt
 * Returns whether reveal happened and results if so
 */
router.post(
  '/:promptId/vote',
  authMiddleware,
  async (req: Request<{ promptId: string }>, res: Response) => {
    try {
      const { promptId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      // Validate request body
      const parsed = wyrVoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid vote data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const result = await submitVote(promptId, participantId, parsed.data.choice);
      res.json(successResponse(result));
    } catch (error) {
      // Handle known errors
      if (error instanceof Error) {
        if (error.message === 'PROMPT_NOT_FOUND') {
          res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'WYR prompt not found'));
          return;
        }
        if (error.message === 'ALREADY_VOTED') {
          res.status(409).json(errorResponse('ALREADY_VOTED', 'You have already voted on this prompt'));
          return;
        }
      }
      console.error('Failed to submit WYR vote:', error);
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit vote'));
    }
  }
);

/**
 * POST /wyr
 * Create new WYR prompt (admin only)
 */
router.post('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createWyrPromptSchema.safeParse(req.body);
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
      res.status(409).json(
        errorResponse('PROMPT_EXISTS', 'This envelope already has a WYR prompt')
      );
      return;
    }
    console.error('Failed to create WYR prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create WYR prompt'));
  }
});

/**
 * PATCH /wyr/:id
 * Update WYR prompt (admin only)
 */
router.patch('/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateWyrPromptSchema.safeParse(req.body);
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
      res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'WYR prompt not found'));
      return;
    }

    res.json(successResponse({ prompt }));
  } catch (error) {
    console.error('Failed to update WYR prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update WYR prompt'));
  }
});

/**
 * DELETE /wyr/:id
 * Delete WYR prompt (admin only)
 * Cascades to delete associated votes
 */
router.delete('/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deletePrompt(id);
    if (!deleted) {
      res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'WYR prompt not found'));
      return;
    }

    res.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Failed to delete WYR prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete WYR prompt'));
  }
});

/**
 * GET /wyr/prompt/:id
 * Get WYR prompt by ID (admin only, for management)
 */
router.get('/prompt/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const prompt = await getPromptById(id);
    if (!prompt) {
      res.status(404).json(errorResponse('PROMPT_NOT_FOUND', 'WYR prompt not found'));
      return;
    }

    res.json(successResponse({ prompt }));
  } catch (error) {
    console.error('Failed to get WYR prompt:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get WYR prompt'));
  }
});

export { router as wyrRouter };
