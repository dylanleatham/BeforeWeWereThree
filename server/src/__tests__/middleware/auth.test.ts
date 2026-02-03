/**
 * Auth middleware tests
 */

import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, adminMiddleware } from '../../middleware/auth.js';
import { createSession } from '../../services/session.js';

// Simple mock helpers
function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function createMockNext() {
  return jest.fn();
}

describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    it('should return 401 if no session cookie', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await authMiddleware(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if session cookie is undefined', async () => {
      const req = { cookies: { session: undefined } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await authMiddleware(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      const req = { cookies: { session: 'invalid-token' } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await authMiddleware(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired session',
          }),
        })
      );
    });

    it('should attach session and call next for valid token', async () => {
      const token = await createSession('test-id', 'guest', 'test-fp', 'A');
      const req = { cookies: { session: token } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await authMiddleware(req, res as unknown as Response, next);

      expect(req.session).toEqual({
        participantId: 'test-id',
        role: 'guest',
        deviceFingerprint: 'test-fp',
        designation: 'A',
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should call next without session if no cookie', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthMiddleware(req, res as unknown as Response, next);

      expect(req.session).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should call next without session if invalid token', async () => {
      const req = { cookies: { session: 'invalid-token' } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthMiddleware(req, res as unknown as Response, next);

      expect(req.session).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should attach session and call next for valid token', async () => {
      const token = await createSession('test-id', 'guest', 'test-fp', 'B');
      const req = { cookies: { session: token } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthMiddleware(req, res as unknown as Response, next);

      expect(req.session).toBeDefined();
      expect(req.session?.designation).toBe('B');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('adminMiddleware', () => {
    it('should return 401 if no session', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await adminMiddleware(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if not admin role', async () => {
      const token = await createSession('test-id', 'guest', 'test-fp', 'A');
      const req = { cookies: { session: token } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await adminMiddleware(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
    });

    it('should call next for admin role', async () => {
      const token = await createSession('admin-id', 'admin', 'admin-fp', null);
      const req = { cookies: { session: token } } as unknown as Request;
      const res = createMockResponse();
      const next = createMockNext();

      await adminMiddleware(req, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });
  });
});
