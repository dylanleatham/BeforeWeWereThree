import { Router, Request, Response } from 'express';
import sharp from 'sharp';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Image proxy route
 *
 * GET /api/images/:filename
 *
 * Fetches an image from Azure Blob Storage and converts non-browser-compatible
 * formats (HEIC/HEIF) to JPEG on the fly. Browser-native formats are passed
 * through unchanged.
 */

const router = Router();

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT ?? 'bwwtstorage';
const CONTAINER = 'photos';

/** Content types that browsers can render natively in <img> tags */
const BROWSER_NATIVE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

router.get('/:filename', authMiddleware, async (req: Request<{ filename: string }>, res: Response) => {
  const { filename } = req.params;
  const blobUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/${filename}`;

  try {
    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      res.status(blobResponse.status).end();
      return;
    }

    const contentType = blobResponse.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await blobResponse.arrayBuffer());

    // Browser-native formats: pass through unchanged
    if (BROWSER_NATIVE_TYPES.has(contentType.split(';')[0].trim())) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
      return;
    }

    // Non-native format (HEIC, HEIF, TIFF, etc.): convert to JPEG
    const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(jpeg);
  } catch (error) {
    logger.error('Image proxy error', { filename, error });
    res.status(500).end();
  }
});

export { router as imagesRouter };
