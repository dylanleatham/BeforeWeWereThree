import { Router, Request, Response } from 'express';
import { successResponse, errorResponse, generateSasSchema, registerPhotoSchema } from 'shared';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import {
  generateUploadSas,
  registerPhoto,
  removePhoto,
  isStorageConfigured,
} from '../services/media.js';
import { getPhotoById, getAllPhotos } from '../db/queries/media.js';
import { logger } from '../utils/logger.js';

/**
 * Media routes for Before We Were Three
 *
 * POST /media/sas - Get SAS token for browser upload (requires auth)
 * POST /media/register - Register completed upload (requires auth)
 * GET /media - List all photos (requires auth)
 * GET /media/:id - Get photo by ID (requires auth)
 * DELETE /media/:id - Delete photo (admin only)
 */

const router = Router();

/**
 * POST /media/sas
 * Generate SAS token for browser-based blob upload
 * Client uses returned sasUrl to PUT the file directly to Azure
 */
router.post('/sas', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check if storage is configured
    if (!isStorageConfigured()) {
      res.status(503).json(
        errorResponse(
          'SERVICE_UNAVAILABLE',
          'Photo upload service is not configured. Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY.'
        )
      );
      return;
    }

    // Validate request body
    const parsed = generateSasSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid request data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const { filename, contentType } = parsed.data;
    const sasResponse = await generateUploadSas(filename, contentType);
    res.json(successResponse(sasResponse));
  } catch (error) {
    logger.error('Failed to generate SAS token', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to generate upload token'));
  }
});

/**
 * POST /media/register
 * Register a completed upload in the database
 * Called after client successfully uploads to blob storage
 */
router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const participantId = req.session?.participantId;
    if (!participantId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
      return;
    }

    // Validate request body
    const parsed = registerPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid request data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const { blobUrl, filename, contentType } = parsed.data;
    const photo = await registerPhoto(blobUrl, filename, contentType, participantId);
    res.status(201).json(successResponse({ photo }));
  } catch (error) {
    // Check for unique constraint violation (blob URL already registered)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json(errorResponse('PHOTO_EXISTS', 'This photo is already registered'));
      return;
    }
    logger.error('Failed to register photo', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to register photo'));
  }
});

/**
 * GET /media
 * List all photos
 */
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const photos = await getAllPhotos();
    res.json(successResponse({ photos }));
  } catch (error) {
    logger.error('Failed to list photos', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to list photos'));
  }
});

/**
 * GET /media/:id
 * Get a single photo by ID
 */
router.get('/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const photo = await getPhotoById(id);

    if (!photo) {
      res.status(404).json(errorResponse('PHOTO_NOT_FOUND', 'Photo not found'));
      return;
    }

    res.json(successResponse({ photo }));
  } catch (error) {
    logger.error('Failed to get photo', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get photo'));
  }
});

/**
 * DELETE /media/:id
 * Delete a photo (admin only)
 * Removes from both blob storage and database
 */
router.delete('/:id', adminMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await removePhoto(id);

    if (!deleted) {
      res.status(404).json(errorResponse('PHOTO_NOT_FOUND', 'Photo not found'));
      return;
    }

    res.json(successResponse({}));
  } catch (error) {
    logger.error('Failed to delete photo', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete photo'));
  }
});

export { router as mediaRouter };
