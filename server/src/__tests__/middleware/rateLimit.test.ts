/**
 * Rate limit middleware tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

describe('Rate Limit Middleware', () => {
  let pinRateLimiter: (req: Request, res: Response, next: NextFunction) => void;

  // Store original Date and reset between tests
  const originalDate = global.Date;

  beforeEach(async () => {
    // Clear module cache to reset rate limiter state
    jest.resetModules();

    // Re-import to get fresh instance
    const module = await import('../../middleware/rateLimit.js');
    pinRateLimiter = module.pinRateLimiter;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  function createMockRequest(ip: string, fingerprint: string): Request {
    return {
      ip,
      body: { deviceFingerprint: fingerprint },
    } as unknown as Request;
  }

  function createMockResponse() {
    const res: Record<string, unknown> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res as unknown as Response & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
  }

  function createMockNext() {
    return jest.fn();
  }

  it('should allow first request', async () => {
    const req = createMockRequest('192.168.1.1', 'fingerprint-1');
    const res = createMockResponse();
    const next = createMockNext();

    await pinRateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow up to 5 attempts', async () => {
    const req = createMockRequest('192.168.1.2', 'fingerprint-2');
    const res = createMockResponse();

    // Make 5 requests - all should pass
    for (let i = 0; i < 5; i++) {
      const next = createMockNext();
      await pinRateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('should block after 5 attempts', async () => {
    const ip = '192.168.1.3';
    const fingerprint = 'fingerprint-3';

    // Make 5 successful requests
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest(ip, fingerprint);
      const res = createMockResponse();
      const next = createMockNext();
      await pinRateLimiter(req, res, next);
    }

    // 6th request should be blocked
    const req = createMockRequest(ip, fingerprint);
    const res = createMockResponse();
    const next = createMockNext();
    await pinRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'TOO_MANY_REQUESTS',
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should track different IPs separately', async () => {
    // Use up attempts for IP 1
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest('192.168.1.10', 'fp-same');
      const res = createMockResponse();
      const next = createMockNext();
      await pinRateLimiter(req, res, next);
    }

    // IP 2 should still be allowed
    const req = createMockRequest('192.168.1.11', 'fp-same');
    const res = createMockResponse();
    const next = createMockNext();
    await pinRateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should rate limit by IP regardless of fingerprint', async () => {
    // Use up attempts with fingerprint 1
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest('192.168.1.20', 'fp-1');
      const res = createMockResponse();
      const next = createMockNext();
      await pinRateLimiter(req, res, next);
    }

    // Same IP but different fingerprint should still be blocked
    const req = createMockRequest('192.168.1.20', 'fp-2');
    const res = createMockResponse();
    const next = createMockNext();
    await pinRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle missing fingerprint gracefully', async () => {
    const req = {
      ip: '192.168.1.30',
      body: {},
    } as unknown as Request;
    const res = createMockResponse();
    const next = createMockNext();

    await pinRateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
