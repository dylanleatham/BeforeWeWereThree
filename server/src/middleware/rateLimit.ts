import { Request, Response, NextFunction } from 'express';
import { errorResponse } from 'shared';

/**
 * Rate limiting middleware for PIN validation
 * 5 attempts per 15 minutes per IP + fingerprint
 *
 * Uses in-memory store (suitable for single-instance deployment)
 * For multi-instance, would need Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Cleanup interval (every 5 minutes, remove expired entries)
// .unref() allows the process to exit naturally when this is the only timer remaining
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Generate rate limit key from IP and fingerprint
 */
function getRateLimitKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  // Try to get fingerprint from body if available
  const fingerprint = req.body?.deviceFingerprint ?? 'unknown';
  return `pin:${ip}:${fingerprint}`;
}

/**
 * PIN rate limiter middleware
 * 5 attempts per 15 minutes per IP+fingerprint
 */
export function pinRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = getRateLimitKey(req);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new one
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    rateLimitStore.set(key, entry);
    next();
    return;
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(429).json(
      errorResponse(
        'TOO_MANY_REQUESTS',
        'Too many attempts. Please try again in a few minutes.'
      )
    );
    return;
  }

  next();
}

/**
 * Reset rate limit for a key (useful for testing)
 */
export function resetRateLimit(ip: string, fingerprint: string): void {
  const key = `pin:${ip}:${fingerprint}`;
  rateLimitStore.delete(key);
}

/**
 * Get remaining attempts
 */
export function getRemainingAttempts(req: Request): number {
  const key = getRateLimitKey(req);
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= Date.now()) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
