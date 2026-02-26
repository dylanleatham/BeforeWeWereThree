import { Router, Request, Response } from 'express';
import { successResponse } from 'shared';
import type { HealthData } from 'shared';

const router = Router();

/**
 * GET /api/health
 * Returns health status of the server
 */
router.get('/', (_req: Request, res: Response) => {
  const healthData: HealthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  };

  res.json(successResponse(healthData));
});

export default router;
