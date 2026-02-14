import { Request, Response, NextFunction } from 'express';
import { verifySession } from '../services/session.js';
import { errorResponse } from 'shared';
import type { SessionPayload } from 'shared';
import { db } from '../db/connection.js';

/**
 * Auth middleware for Before We Were Three
 * Reads session cookie, verifies JWT, and attaches session to request
 */

// Extend Express Request to include session
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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

    // Verify participant still exists (handles stale sessions after admin reset)
    const participant = await db.participant.findUnique({
      where: { id: session.participantId },
      select: { id: true },
    });
    if (!participant) {
      res.status(401).json(errorResponse('SESSION_EXPIRED', 'Your session has expired. Please re-enter your PIN.'));
      return;
    }

    req.session = session;
    next();
  } catch {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired session'));
    return;
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
 * Note: Implemented without nested middleware to avoid double-response issues
 */
export async function adminMiddleware(
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

    if (session.role !== 'admin') {
      res.status(403).json(errorResponse('FORBIDDEN', 'Admin access required'));
      return;
    }

    next();
  } catch {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired session'));
  }
}
