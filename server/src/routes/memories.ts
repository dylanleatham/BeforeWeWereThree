import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from 'shared';
import type { BabymoonStatusResponse, MemoriesDataResponse } from 'shared';
import { authMiddleware } from '../middleware/auth.js';
import { getBabymoonClosedAt } from '../db/queries/config.js';
import { getMemoriesData } from '../services/memories.js';
import { generateMemoriesZip } from '../services/export.js';
import { logger } from '../utils/logger.js';

/**
 * Memories routes for Before We Were Three
 *
 * GET /status       - Check if babymoon is closed
 * GET /             - Get all memories data
 * GET /export       - Download memories as .zip
 */

const router = Router();

/**
 * GET /status
 * Returns whether the babymoon is closed and when
 */
router.get('/status', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const closedAt = await getBabymoonClosedAt();
    res.json(successResponse<BabymoonStatusResponse>({ closedAt }));
  } catch (error) {
    logger.error('Get babymoon status error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get babymoon status'));
  }
});

/**
 * GET /
 * Returns full aggregated memories data (only if babymoon is closed)
 */
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const closedAt = await getBabymoonClosedAt();
    if (!closedAt) {
      res.status(403).json(errorResponse('BABYMOON_NOT_CLOSED', 'Babymoon is not yet closed'));
      return;
    }

    const data = await getMemoriesData(closedAt);
    res.json(successResponse<MemoriesDataResponse>(data));
  } catch (error) {
    logger.error('Get memories data error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get memories data'));
  }
});

/**
 * GET /export
 * Generates and streams a .zip file with PDF + photos
 */
router.get('/export', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const closedAt = await getBabymoonClosedAt();
    if (!closedAt) {
      res.status(403).json(errorResponse('BABYMOON_NOT_CLOSED', 'Babymoon is not yet closed'));
      return;
    }

    const data = await getMemoriesData(closedAt, false);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Before We Were Three.zip"');

    const zipStream = await generateMemoriesZip(data);
    zipStream.pipe(res);
  } catch (error) {
    logger.error('Export memories error', { error });
    if (!res.headersSent) {
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to export memories'));
    }
  }
});

export { router as memoriesRouter };
