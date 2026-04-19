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
 * Very large files (DNG raw photos) are rejected with a fast HEAD check.
 */

const router = Router();

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT ?? 'bwwtstorage';
const CONTAINER = 'photos';
const MAX_CONVERT_SIZE_BYTES = 20 * 1024 * 1024;

/** Formats that browsers can render natively in <img> tags */
const BROWSER_NATIVE_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp', 'svg']);

router.get('/:filename', authMiddleware, async (req: Request<{ filename: string }>, res: Response) => {
  const { filename } = req.params;
  const blobUrl = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/${filename}`;

  try {
    // HEAD check: reject files too large to convert (DNG raw = 50MB+)
    const head = await fetch(blobUrl, { method: 'HEAD' });
    if (!head.ok) {
      res.status(head.status).end();
      return;
    }

    const size = parseInt(head.headers.get('content-length') ?? '0', 10);
    const contentType = (head.headers.get('content-type') ?? '').split(';')[0].trim();

    // If Azure says it's browser-native AND not too large, redirect directly.
    // (HEIC-as-JPEG files will fail the format check below and get converted.)
    if (size <= MAX_CONVERT_SIZE_BYTES || contentType === 'image/jpeg' || contentType === 'image/png') {
      // Need to download and check actual format
    } else {
      // Too large and not a known-safe type — skip
      logger.info('Image proxy: skipping oversized file', { filename, size });
      res.status(404).end();
      return;
    }

    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      res.status(blobResponse.status).end();
      return;
    }

    const raw = Buffer.from(await blobResponse.arrayBuffer());

    // Detect actual format from file content
    const metadata = await sharp(raw).metadata();
    const format = metadata.format ?? 'unknown';

    if (BROWSER_NATIVE_FORMATS.has(format)) {
      const mimeMap: Record<string, string> = {
        jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      };
      res.setHeader('Content-Type', mimeMap[format] ?? 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(raw);
      return;
    }

    // Non-native (HEIC, TIFF, etc.) — resize and convert to JPEG
    const jpeg = await sharp(raw)
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(jpeg);
  } catch (error) {
    logger.warn('Image proxy error', { filename, error });
    if (!res.headersSent) {
      res.status(404).end();
    }
  }
});

export { router as imagesRouter };
