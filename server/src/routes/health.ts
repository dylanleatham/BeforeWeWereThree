import { Router, Request, Response } from 'express';
import type { HealthData } from 'shared';

const router = Router();

/**
 * GET /api/health
 * Returns health status of the server
 *
 * Response follows CLAUDE.md API shape: { success: true, data: T }
 */
router.get('/', (_req: Request, res: Response) => {
  const healthData: HealthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  };

  res.json({
    success: true,
    data: healthData,
  });
});

export default router;
