import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  createEnvelopeSchema,
  updateEnvelopeSchema,
} from 'shared';
import {
  getAllEnvelopes,
  getParticipantEnvelopes,
  getEnvelopeById,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope,
} from '../db/queries/envelopes.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Envelope routes for Before We Were Three
 *
 * GET /envelopes - List all envelopes (requires auth)
 * GET /envelopes/:id - Get single envelope (requires auth)
 * POST /envelopes - Create envelope (admin only)
 * PATCH /envelopes/:id - Update envelope (admin only)
 * DELETE /envelopes/:id - Delete envelope (admin only)
 */

const router = Router();

/**
 * GET /envelopes
 * List envelopes — admin sees all, participants see filtered
 * Gender-reveal envelopes are hidden from participants until gender is set
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = req.session?.role;
    const envelopes = role === 'admin'
      ? await getAllEnvelopes()
      : await getParticipantEnvelopes();
    res.json(successResponse({ envelopes }));
  } catch (error) {
    logger.error('Failed to fetch envelopes', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch envelopes'));
  }
});

/**
 * GET /envelopes/:id
 * Get single envelope by ID (requires authentication)
 */
router.get('/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const envelope = await getEnvelopeById(id);
    if (!envelope) {
      res.status(404).json(errorResponse('ENVELOPE_NOT_FOUND', 'Envelope not found'));
      return;
    }
    res.json(successResponse({ envelope }));
  } catch (error) {
    logger.error('Failed to fetch envelope', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch envelope'));
  }
});

/**
 * POST /envelopes
 * Create new envelope (admin only)
 * Gender-reveal is a singleton — only one allowed
 */
router.post('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid envelope data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    // Singleton check for gender-reveal envelopes
    if (parsed.data.type === 'gender-reveal') {
      const existing = await getAllEnvelopes();
      if (existing.some((e) => e.type === 'gender-reveal')) {
        res.status(409).json(
          errorResponse('GENDER_REVEAL_SINGLETON', 'Only one gender reveal envelope is allowed')
        );
        return;
      }
    }

    const envelope = await createEnvelope(parsed.data);
    res.status(201).json(successResponse({ envelope }));
  } catch (error) {
    logger.error('Failed to create envelope', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create envelope'));
  }
});

/**
 * POST /envelopes/:id/open
 * Open a sealed envelope (any authenticated user)
 * Only allows transitioning from 'sealed' to 'opened'
 */
router.post('/:id/open', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getEnvelopeById(id);

    if (!existing) {
      res.status(404).json(errorResponse('ENVELOPE_NOT_FOUND', 'Envelope not found'));
      return;
    }

    if (existing.status !== 'sealed') {
      // Already opened or completed - return current state
      res.json(successResponse({ envelope: existing }));
      return;
    }

    const envelope = await updateEnvelope(id, { status: 'opened' });
    res.json(successResponse({ envelope }));
  } catch (error) {
    logger.error('Failed to open envelope', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to open envelope'));
  }
});

/**
 * PATCH /envelopes/:id
 * Update envelope (admin only)
 */
router.patch('/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid envelope data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const envelope = await updateEnvelope(id, parsed.data);
    if (!envelope) {
      res.status(404).json(errorResponse('ENVELOPE_NOT_FOUND', 'Envelope not found'));
      return;
    }

    res.json(successResponse({ envelope }));
  } catch (error) {
    logger.error('Failed to update envelope', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update envelope'));
  }
});

/**
 * DELETE /envelopes/:id
 * Delete envelope (admin only)
 */
router.delete('/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteEnvelope(id);
    if (!deleted) {
      res.status(404).json(errorResponse('ENVELOPE_NOT_FOUND', 'Envelope not found'));
      return;
    }

    res.json(successResponse({ deleted: true }));
  } catch (error) {
    logger.error('Failed to delete envelope', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete envelope'));
  }
});

export { router as envelopesRouter };
