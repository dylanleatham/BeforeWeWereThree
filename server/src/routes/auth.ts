import { Router, Request, Response } from 'express';
import { validatePinRequestSchema, successResponse, errorResponse } from 'shared';
import type { ValidatePinResponse, SessionResponse } from 'shared';
import { getGuestPin, getAdminPin } from '../db/queries/config.js';
import { getOrCreateParticipant } from '../services/participant.js';
import { createSession, verifySession, SESSION_COOKIE_OPTIONS, getSessionExpiration } from '../services/session.js';
import { authMiddleware } from '../middleware/auth.js';
import { pinRateLimiter } from '../middleware/rateLimit.js';

/**
 * Authentication routes for Before We Were Three
 *
 * POST /validate-pin - Validate PIN and create session
 * GET /session - Get current session info
 * POST /logout - Clear session
 */

const router = Router();

/**
 * POST /validate-pin
 * Validates PIN, creates participant if needed, and returns session cookie
 */
router.post('/validate-pin', pinRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const parseResult = validatePinRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      // Zod v4 uses issues instead of errors
      const firstIssue = parseResult.error.issues?.[0];
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid request')
      );
      return;
    }

    const { pin, deviceFingerprint } = parseResult.data;

    // Get stored PINs from database
    const [guestPin, adminPin] = await Promise.all([getGuestPin(), getAdminPin()]);

    // Determine role based on PIN match
    let role: 'guest' | 'admin';

    if (pin === adminPin) {
      role = 'admin';
    } else if (pin === guestPin) {
      role = 'guest';
    } else {
      // Per CONTEXT.md: friendly message on wrong PIN
      res.status(401).json(errorResponse('INVALID_PIN', "Hmm, that's not it. Try again?"));
      return;
    }

    // Get or create participant
    const { participantId, designation } = await getOrCreateParticipant(deviceFingerprint, role);

    // Create session JWT
    const token = await createSession(participantId, role, deviceFingerprint, designation);

    // Set session cookie
    res.cookie('session', token, SESSION_COOKIE_OPTIONS);

    // Return success response
    const responseData: ValidatePinResponse = {
      role,
      participantId,
      designation,
    };

    res.json(successResponse(responseData));
  } catch (error) {
    console.error('PIN validation error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
  }
});

/**
 * GET /session
 * Returns current session info (requires auth)
 */
router.get('/session', authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = req.session!;
    const expiresAt = getSessionExpiration();

    const responseData: SessionResponse = {
      role: session.role,
      participantId: session.participantId,
      designation: session.designation,
      expiresAt: expiresAt.toISOString(),
    };

    res.json(successResponse(responseData));
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
  }
});

/**
 * POST /logout
 * Clears the session cookie
 */
router.post('/logout', async (_req: Request, res: Response) => {
  res.clearCookie('session', { path: '/' });
  res.json(successResponse({ message: 'Logged out successfully' }));
});

export { router as authRouter };
