import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  createEnvelopeSchema,
  updateEnvelopeSchema,
} from 'shared';
import {
  getAllEnvelopes,
  getEnvelopeById,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope,
} from '../db/queries/envelopes.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

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
 * List all envelopes (requires authentication)
 */
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const envelopes = await getAllEnvelopes();
    res.json(successResponse({ envelopes }));
  } catch (error) {
    console.error('Failed to fetch envelopes:', error);
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
    console.error('Failed to fetch envelope:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch envelope'));
  }
});

/**
 * POST /envelopes
 * Create new envelope (admin only)
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

    const envelope = await createEnvelope(parsed.data);
    res.status(201).json(successResponse({ envelope }));
  } catch (error) {
    console.error('Failed to create envelope:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create envelope'));
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
    console.error('Failed to update envelope:', error);
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

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete envelope:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete envelope'));
  }
});

export { router as envelopesRouter };
