import { Request, Response, NextFunction } from 'express';
import { errorResponse } from 'shared';
import { logger } from '../utils/logger.js';

/**
 * Rate limiting middleware for PIN validation
 * 5 attempts per 15 minutes per IP + fingerprint
 *
 * Supports two storage backends:
 * - In-memory (default): Suitable for single-instance deployment
 * - Redis: For multi-instance deployment (set REDIS_URL environment variable)
 *
 * To use Redis, install ioredis and set REDIS_URL:
 * ```
 * npm install ioredis
 * REDIS_URL=redis://localhost:6379
 * ```
 */

// =============================================================================
// Rate Limit Store Interface
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>;
  increment(key: string): Promise<number>;
  delete(key: string): Promise<void>;
}

// =============================================================================
// In-Memory Store (Default)
// =============================================================================

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    // .unref() allows the process to exit naturally
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt <= now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
    this.cleanupInterval.unref();
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt <= Date.now()) {
      return null;
    }
    return entry;
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (entry) {
      entry.count++;
      return entry.count;
    }
    return 0;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Get current store size (for testing/debugging) */
  get size(): number {
    return this.store.size;
  }
}

// =============================================================================
// Redis Store (Optional - for multi-instance deployment)
// =============================================================================

/**
 * Redis-based rate limit store
 * Only used if REDIS_URL is set and ioredis is installed
 */
class RedisRateLimitStore implements RateLimitStore {
  private client: {
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    incr(key: string): Promise<number>;
    del(key: string): Promise<number>;
    quit(): Promise<string>;
  };

  constructor(client: RedisRateLimitStore['client']) {
    this.client = client;
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as RateLimitEntry;
    } catch {
      return null;
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    await this.client.setex(key, ttlSeconds, JSON.stringify(entry));
  }

  async increment(key: string): Promise<number> {
    // For Redis, we store just the count and use Redis TTL
    return await this.client.incr(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// =============================================================================
// Store Initialization
// =============================================================================

let rateLimitStore: RateLimitStore;

async function initializeStore(): Promise<RateLimitStore> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // Dynamic import to avoid requiring ioredis if not installed
       
      const Redis = (await import(/* webpackIgnore: true */ 'ioredis' as string)).default;
      const client = new Redis(redisUrl);

      // Test connection
      await client.ping();

      logger.info('Rate limiting using Redis', { url: redisUrl.replace(/\/\/.*@/, '//***@') });
      return new RedisRateLimitStore(client);
    } catch (error) {
      logger.warn('Redis not available, falling back to in-memory rate limiting', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Rate limiting using in-memory store (single-instance only)');
  return new InMemoryRateLimitStore();
}

// Initialize store (lazy, on first use)
let storePromise: Promise<RateLimitStore> | null = null;

function getStore(): Promise<RateLimitStore> {
  if (!storePromise) {
    storePromise = initializeStore();
  }
  return storePromise;
}

// For synchronous access after initialization
// Falls back to creating new in-memory store if not yet initialized
function getStoreSync(): RateLimitStore {
  if (rateLimitStore) {
    return rateLimitStore;
  }
  // Fallback: create in-memory store synchronously
  rateLimitStore = new InMemoryRateLimitStore();
  return rateLimitStore;
}

// Initialize on module load (non-blocking)
getStore().then((store) => {
  rateLimitStore = store;
});

// =============================================================================
// Rate Limiting Configuration
// =============================================================================

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate rate limit key from IP and fingerprint
 */
function getRateLimitKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  // Try to get fingerprint from body if available
  const fingerprint = req.body?.deviceFingerprint ?? 'unknown';
  return `ratelimit:pin:${ip}:${fingerprint}`;
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * PIN rate limiter middleware
 * 5 attempts per 15 minutes per IP+fingerprint
 */
export async function pinRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const store = getStoreSync();
  const key = getRateLimitKey(req);
  const now = Date.now();

  try {
    let entry = await store.get(key);

    // If no entry or window expired, create new one
    if (!entry) {
      entry = {
        count: 1,
        resetAt: now + WINDOW_MS,
      };
      await store.set(key, entry, WINDOW_MS);
      next();
      return;
    }

    // Increment count
    const newCount = await store.increment(key);
    entry.count = newCount || entry.count + 1;

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
  } catch (error) {
    // On store error, allow the request (fail open for availability)
    logger.error('Rate limit store error', { error, key });
    next();
  }
}

/**
 * Reset rate limit for a key (useful for testing)
 */
export async function resetRateLimit(ip: string, fingerprint: string): Promise<void> {
  const store = getStoreSync();
  const key = `ratelimit:pin:${ip}:${fingerprint}`;
  await store.delete(key);
}

/**
 * Get remaining attempts
 */
export async function getRemainingAttempts(req: Request): Promise<number> {
  const store = getStoreSync();
  const key = getRateLimitKey(req);
  const entry = await store.get(key);

  if (!entry) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
