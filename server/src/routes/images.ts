import { Router, Request, Response } from 'express';
import sharp from 'sharp';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Image proxy route
 *
 * GET /api/images/:filename
 *
 * Fetches an image from Azure Blob Storage, detects its actual format
 * (not trusting the content-type header — iPhones store HEIC as .jpeg),
 * and converts non-browser formats to JPEG via sharp.
 */

const router = Router();

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT ?? 'bwwtstorage';
const CONTAINER = 'photos';

/** Formats that browsers can render natively in <img> tags */
const BROWSER_NATIVE_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp', 'svg']);

router.get('/:filename', authMiddleware, async (req: Request<{ filename: string }>, res: Response) => {
  const { filename } = req.params;
  const blobUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/${filename}`;

  try {
    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      res.status(blobResponse.status).end();
      return;
    }

    const raw = Buffer.from(await blobResponse.arrayBuffer());

    // Detect actual format from file content, not the content-type header
    const metadata = await sharp(raw).metadata();
    const format = metadata.format ?? 'unknown';

    if (BROWSER_NATIVE_FORMATS.has(format)) {
      // Actual content is browser-native — pass through unchanged
      const mimeMap: Record<string, string> = {
        jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      };
      res.setHeader('Content-Type', mimeMap[format] ?? 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(raw);
      return;
    }

    // Non-native (HEIC, DNG, TIFF, etc.) — convert to JPEG
    const jpeg = await sharp(raw).jpeg({ quality: 90 }).toBuffer();
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
