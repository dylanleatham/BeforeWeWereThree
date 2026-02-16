import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from 'shared';
import { adminMiddleware } from '../middleware/auth.js';
import { resetSession, ResetSessionResult } from '../services/admin.js';
import { logger } from '../utils/logger.js';

/**
 * Admin routes for Before We Were Three
 *
 * POST /reset-session - Reset entire session state
 */

const router = Router();

/**
 * POST /reset-session
 * Resets the entire session to fresh state (admin only)
 *
 * Actions:
 * - Kicks out all guest participants (clears A/B designations)
 * - Resets all envelopes to 'sealed' status
 * - Deletes all WYR votes
 *
 * Note: Admin remains logged in after reset.
 */
router.post('/reset-session', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await resetSession();

    res.json(
      successResponse<ResetSessionResult & { message: string }>({
        message: 'Session reset successfully',
        ...result,
      })
    );
  } catch (error) {
    logger.error('Reset session error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to reset session'));
  }
});

export { router as adminRouter };
