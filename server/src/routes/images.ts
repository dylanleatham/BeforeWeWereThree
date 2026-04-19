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
 * Unsupported formats (e.g., DNG raw) return 404 rather than hanging.
 */

const router = Router();

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT ?? 'bwwtstorage';
const CONTAINER = 'photos';
const CONVERT_TIMEOUT_MS = 30_000;

/** Formats that browsers can render natively in <img> tags */
const BROWSER_NATIVE_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp', 'svg']);

/** Run a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

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
    const metadata = await withTimeout(sharp(raw).metadata(), CONVERT_TIMEOUT_MS);
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
    const jpeg = await withTimeout(
      sharp(raw)
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer(),
      CONVERT_TIMEOUT_MS,
    );
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(jpeg);
  } catch (error) {
    logger.warn('Image proxy: unsupported format or timeout', { filename, error });
    if (!res.headersSent) {
      res.status(404).end();
    }
  }
});

export { router as imagesRouter };
