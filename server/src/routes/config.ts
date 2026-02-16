import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { successResponse, errorResponse, type AppConfig } from 'shared';
import { adminMiddleware } from '../middleware/auth.js';
import { db } from '../db/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Config routes for Before We Were Three
 *
 * GET /config - Get public config (no auth required)
 * PUT /config - Update config (admin only)
 */

const router = Router();

/**
 * Config update schema
 */
const updateConfigSchema = z.object({
  spotifyUrl: z.string().url().optional().nullable(),
});

/**
 * Config keys stored in AppConfig table
 */
const CONFIG_KEYS = {
  SPOTIFY_URL: 'spotify_url',
} as const;

/**
 * GET /config
 * Get public config values (no auth required)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Fetch spotify URL from AppConfig
    const spotifyConfig = await db.appConfig.findUnique({
      where: { key: CONFIG_KEYS.SPOTIFY_URL },
    });

    const config: AppConfig = {
      spotifyUrl: spotifyConfig?.value ?? null,
    };

    res.json(successResponse(config));
  } catch (error) {
    logger.error('Get config error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch config'));
  }
});

/**
 * PUT /config
 * Update config values (admin only)
 */
router.put('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = updateConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid request')
      );
      return;
    }

    const { spotifyUrl } = parsed.data;

    // Update spotify URL if provided
    if (spotifyUrl !== undefined) {
      if (spotifyUrl === null || spotifyUrl === '') {
        // Delete the config entry if null or empty
        await db.appConfig.deleteMany({
          where: { key: CONFIG_KEYS.SPOTIFY_URL },
        });
      } else {
        // Upsert the config entry
        await db.appConfig.upsert({
          where: { key: CONFIG_KEYS.SPOTIFY_URL },
          update: { value: spotifyUrl },
          create: { key: CONFIG_KEYS.SPOTIFY_URL, value: spotifyUrl },
        });
      }
    }

    // Fetch updated config
    const updatedSpotifyConfig = await db.appConfig.findUnique({
      where: { key: CONFIG_KEYS.SPOTIFY_URL },
    });

    const config: AppConfig = {
      spotifyUrl: updatedSpotifyConfig?.value ?? null,
    };

    res.json(successResponse(config));
  } catch (error) {
    logger.error('Update config error', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update config'));
  }
});

export { router as configRouter };
