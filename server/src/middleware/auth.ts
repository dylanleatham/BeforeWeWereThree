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
 * Shared session resolution logic.
 * Reads the session cookie, verifies the JWT, confirms the participant
 * still exists in the database, and returns the session payload.
 *
 * Returns the session on success, or sends an error response and returns null.
 */
async function resolveSession(req: Request, res: Response): Promise<SessionPayload | null> {
  const sessionCookie = req.cookies?.session;

  if (!sessionCookie) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return null;
  }

  let session: SessionPayload;
  try {
    session = await verifySession(sessionCookie);
  } catch {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired session'));
    return null;
  }

  // Verify participant still exists (handles stale sessions after admin reset)
  const participant = await db.participant.findUnique({
    where: { id: session.participantId },
    select: { id: true },
  });
  if (!participant) {
    res.status(401).json(errorResponse('SESSION_EXPIRED', 'Your session has expired. Please re-enter your PIN.'));
    return null;
  }

  return session;
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
  const session = await resolveSession(req, res);
  if (!session) return;

  req.session = session;
  next();
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
 * Friend-only middleware
 * Requires auth + friend role
 */
export async function friendMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = await resolveSession(req, res);
  if (!session) return;

  if (session.role !== 'friend') {
    res.status(403).json(errorResponse('FORBIDDEN', 'Friend access required'));
    return;
  }

  req.session = session;
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
  const session = await resolveSession(req, res);
  if (!session) return;

  if (session.role !== 'admin') {
    res.status(403).json(errorResponse('FORBIDDEN', 'Admin access required'));
    return;
  }

  req.session = session;
  next();
}
