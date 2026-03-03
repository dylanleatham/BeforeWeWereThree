import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from 'shared';
import type { CloseBabymoonResponse, BabymoonStatusResponse } from 'shared';
import { adminMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { resetSession, ResetSessionResult } from '../services/admin.js';
import { getBabymoonClosedAt, setBabymoonClosedAt, deleteBabymoonClosedAt } from '../db/queries/config.js';
import { getRealtimeService } from '../services/realtime.js';
import { logger } from '../utils/logger.js';

/**
 * Admin routes for Before We Were Three
 *
 * POST /reset-session - Reset entire session state
 */

const router = Router();

// Rate limit: 3 resets per minute per IP
const resetRateLimiter = createRateLimiter({ maxAttempts: 3, windowMs: 60 * 1000, keyPrefix: 'admin-reset' });

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
router.post('/reset-session', adminMiddleware, resetRateLimiter, async (_req: Request, res: Response) => {
  try {
    const result = await resetSession();

    res.json(successResponse<ResetSessionResult>(result));
  } catch (error) {
    logger.error('Reset session error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to reset session'));
  }
});

/**
 * POST /close-babymoon
 * Marks the babymoon experience as complete (admin only)
 * Broadcasts to all connected clients via session:global
 */
router.post('/close-babymoon', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const existing = await getBabymoonClosedAt();
    if (existing) {
      res.status(409).json(errorResponse('BABYMOON_ALREADY_CLOSED', 'Babymoon is already closed'));
      return;
    }

    const closedAt = new Date().toISOString();
    await setBabymoonClosedAt(closedAt);

    const realtime = getRealtimeService();
    if (realtime) {
      await realtime.sendToGroup('session:global', {
        target: 'babymoonClosed',
        arguments: [{ closedAt }],
      });
    }

    res.json(successResponse<CloseBabymoonResponse>({ closedAt }));
  } catch (error) {
    logger.error('Close babymoon error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to close babymoon'));
  }
});

/**
 * POST /reopen-babymoon
 * Removes the babymoon closed state (admin only)
 */
router.post('/reopen-babymoon', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    await deleteBabymoonClosedAt();

    const realtime = getRealtimeService();
    if (realtime) {
      await realtime.sendToGroup('session:global', {
        target: 'babymoonReopened',
        arguments: [],
      });
    }

    res.json(successResponse<BabymoonStatusResponse>({ closedAt: null }));
  } catch (error) {
    logger.error('Reopen babymoon error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to reopen babymoon'));
  }
});

export { router as adminRouter };
