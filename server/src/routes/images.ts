import { Router, Request, Response } from 'express';
import sharp from 'sharp';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Image proxy route
 *
 * GET /api/images/:filename
 *
 * For browser-native formats (JPEG, PNG, etc.), redirects straight to Azure.
 * For non-browser formats (HEIC, DNG, TIFF), fetches the image, converts to
 * JPEG via sharp, and streams the result with cache headers.
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
    // HEAD request to check content-type without downloading the full image
    const head = await fetch(blobUrl, { method: 'HEAD' });
    if (!head.ok) {
      res.status(head.status).end();
      return;
    }

    const contentType = (head.headers.get('content-type') ?? 'application/octet-stream').split(';')[0].trim();

    // Browser-native format: redirect to Azure directly (no server involvement)
    if (BROWSER_NATIVE_TYPES.has(contentType)) {
      res.redirect(blobUrl);
      return;
    }

    // Non-native format (HEIC, DNG, TIFF, etc.): fetch, convert, and stream
    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      res.status(blobResponse.status).end();
      return;
    }

    const buffer = Buffer.from(await blobResponse.arrayBuffer());
    const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(jpeg);
  } catch (error) {
    logger.error('Image proxy error', { filename, error });
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

export { router as imagesRouter };
