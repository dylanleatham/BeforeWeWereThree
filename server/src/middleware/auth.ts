import { Request, Response, NextFunction } from 'express';
import { verifySession } from '../services/session.js';
import { errorResponse } from 'shared';
import type { SessionPayload } from 'shared';

/**
 * Auth middleware for Before We Were Three
 * Reads session cookie, verifies JWT, and attaches session to request
 */

// Extend Express Request to include session
declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

/**
 * Authentication middleware
 * Reads session from cookie and verifies JWT
 * Returns 401 if no session or invalid/expired token
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionCookie = req.cookies?.session;

  if (!sessionCookie) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    const session = await verifySession(sessionCookie);
    req.session = session;
    next();
  } catch (error) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired session'));
  }
}

/**
 * Optional auth middleware
 * Attaches session if present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionCookie = req.cookies?.session;

  if (sessionCookie) {
    try {
      const session = await verifySession(sessionCookie);
      req.session = session;
    } catch {
      // Session invalid, but that's okay - continue without it
    }
  }

  next();
}

/**
 * Admin-only middleware
 * Requires auth + admin role
 */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // First run auth middleware
  await authMiddleware(req, res, () => {
    if (req.session?.role !== 'admin') {
      res.status(403).json(errorResponse('FORBIDDEN', 'Admin access required'));
      return;
    }
    next();
  });
}
