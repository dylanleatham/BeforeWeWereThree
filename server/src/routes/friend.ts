import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  createFriendSchema,
  createFriendLetterSchema,
  saveFriendLetterSchema,
  submitFriendLetterSchema,
  saveFriendThankYouNoteSchema,
} from 'shared';
import { authMiddleware, adminMiddleware, friendMiddleware } from '../middleware/auth.js';
import {
  getAllFriends,
  createFriend,
  removeFriend,
  saveThankYouNote,
  getFriendLettersForAdmin,
  getFriendDashboard,
  createNewFriendLetter,
  saveFriendLetter,
  submitFriendLetterAndCreateEnvelope,
  getFriendLetterForCouple,
} from '../services/friend.js';
import { setGenderKeeper, getFriendById } from '../db/queries/friend.js';
import { logger } from '../utils/logger.js';

/**
 * Friend routes for Before We Were Three
 *
 * Admin routes:
 *   GET    /friends              - List all friends
 *   POST   /friends              - Create friend
 *   DELETE /friends/:friendId    - Delete friend
 *   PUT    /friends/:friendId/thank-you - Save thank-you note
 *   GET    /friends/:friendId/letters   - View friend's submitted letters
 *
 * Friend routes:
 *   GET    /friends/me/dashboard              - Get friend's dashboard
 *   POST   /friends/me/letters                - Create a new letter
 *   PUT    /friends/me/letters/:letterId      - Save letter draft
 *   POST   /friends/me/letters/:letterId/submit - Submit letter
 *
 * Couple route:
 *   GET    /friends/letter/:friendLetterId - View friend letter (for couple)
 */

const router = Router();

// ============================================================
// Admin Routes
// ============================================================

/**
 * GET /friends
 * List all friends with letter counts (admin only)
 */
router.get('/', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await getAllFriends();
    res.json(successResponse(result));
  } catch (error) {
    logger.error('Failed to list friends', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to list friends'));
  }
});

/**
 * POST /friends
 * Create a new friend (admin only)
 */
router.post('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createFriendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid friend data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const friend = await createFriend(parsed.data.name, parsed.data.pin);
    res.status(201).json(successResponse({ friend }));
  } catch (error) {
    if (error instanceof Error && error.message === 'PIN_ALREADY_EXISTS') {
      res.status(409).json(
        errorResponse('PIN_ALREADY_EXISTS', 'This PIN is already in use by another user')
      );
      return;
    }
    logger.error('Failed to create friend', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create friend'));
  }
});

/**
 * PUT /friends/gender-keeper
 * Set or clear the gender keeper designation (admin only)
 * Body: { friendId: string | null }
 */
router.put('/gender-keeper', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { friendId } = req.body as { friendId: string | null };

    // Validate friend exists if setting a keeper
    if (friendId) {
      const friend = await getFriendById(friendId);
      if (!friend) {
        res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
        return;
      }
    }

    await setGenderKeeper(friendId ?? null);
    res.json(successResponse({ set: true }));
  } catch (error) {
    logger.error('Failed to set gender keeper', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to set gender keeper'));
  }
});

/**
 * DELETE /friends/:friendId
 * Delete a friend and all their content (admin only)
 */
router.delete('/:friendId', adminMiddleware, async (req: Request<{ friendId: string }>, res: Response) => {
  try {
    const { friendId } = req.params;
    const deleted = await removeFriend(friendId);
    if (!deleted) {
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete friend'));
      return;
    }
    res.json(successResponse({ deleted: true }));
  } catch (error) {
    if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
      res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
      return;
    }
    logger.error('Failed to delete friend', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete friend'));
  }
});

/**
 * PUT /friends/:friendId/thank-you
 * Save/update thank-you note for a friend (admin only)
 */
router.put('/:friendId/thank-you', adminMiddleware, async (req: Request<{ friendId: string }>, res: Response) => {
  try {
    const { friendId } = req.params;
    const parsed = saveFriendThankYouNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid note data', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const note = await saveThankYouNote(friendId, parsed.data);
    res.json(successResponse({ note }));
  } catch (error) {
    if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
      res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
      return;
    }
    logger.error('Failed to save thank-you note', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to save thank-you note'));
  }
});

/**
 * GET /friends/:friendId/letters
 * View a friend's letters (admin only)
 */
router.get('/:friendId/letters', adminMiddleware, async (req: Request<{ friendId: string }>, res: Response) => {
  try {
    const { friendId } = req.params;
    const result = await getFriendLettersForAdmin(friendId);
    res.json(successResponse(result));
  } catch (error) {
    if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
      res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
      return;
    }
    logger.error('Failed to get friend letters', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get friend letters'));
  }
});

// ============================================================
// Friend Routes
// ============================================================

/**
 * GET /friends/me/dashboard
 * Get friend's dashboard data
 */
router.get('/me/dashboard', friendMiddleware, async (req: Request, res: Response) => {
  try {
    const friendId = req.session?.friendId;
    if (!friendId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Friend ID missing from session'));
      return;
    }

    const dashboard = await getFriendDashboard(friendId);
    res.json(successResponse(dashboard));
  } catch (error) {
    if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
      res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
      return;
    }
    logger.error('Failed to get friend dashboard', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get friend dashboard'));
  }
});

/**
 * POST /friends/me/letters
 * Create a new friend letter draft
 */
router.post('/me/letters', friendMiddleware, async (req: Request, res: Response) => {
  try {
    const friendId = req.session?.friendId;
    if (!friendId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Friend ID missing from session'));
      return;
    }

    const parsed = createFriendLetterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid request', {
          issues: parsed.error.issues,
        })
      );
      return;
    }

    const letter = await createNewFriendLetter(friendId, parsed.data.recipient);
    res.status(201).json(successResponse({ letter }));
  } catch (error) {
    if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
      res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
      return;
    }
    logger.error('Failed to create friend letter', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to create letter'));
  }
});

/**
 * PUT /friends/me/letters/:letterId
 * Save friend letter draft (auto-save)
 */
router.put(
  '/me/letters/:letterId',
  friendMiddleware,
  async (req: Request<{ letterId: string }>, res: Response) => {
    try {
      const friendId = req.session?.friendId;
      if (!friendId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Friend ID missing from session'));
        return;
      }

      const parsed = saveFriendLetterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid letter data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const letter = await saveFriendLetter(friendId, req.params.letterId, parsed.data);
      res.json(successResponse({ letter }));
    } catch (error) {
      if (error instanceof Error && error.message === 'ALREADY_SUBMITTED') {
        res.status(409).json(errorResponse('ALREADY_SUBMITTED', 'This letter has already been submitted'));
        return;
      }
      if (error instanceof Error && error.message === 'LETTER_NOT_FOUND') {
        res.status(404).json(errorResponse('LETTER_NOT_FOUND', 'Letter not found'));
        return;
      }
      logger.error('Failed to save friend letter', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to save letter'));
    }
  }
);

/**
 * POST /friends/me/letters/:letterId/submit
 * Submit friend letter (final, creates envelope)
 */
router.post(
  '/me/letters/:letterId/submit',
  friendMiddleware,
  async (req: Request<{ letterId: string }>, res: Response) => {
    try {
      const friendId = req.session?.friendId;
      if (!friendId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Friend ID missing from session'));
        return;
      }

      const parsed = submitFriendLetterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid letter data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const letter = await submitFriendLetterAndCreateEnvelope(
        friendId,
        req.params.letterId,
        parsed.data
      );
      res.json(successResponse({ letter }));
    } catch (error) {
      if (error instanceof Error && error.message === 'ALREADY_SUBMITTED') {
        res.status(409).json(errorResponse('ALREADY_SUBMITTED', 'This letter has already been submitted'));
        return;
      }
      if (error instanceof Error && error.message === 'LETTER_NOT_FOUND') {
        res.status(404).json(errorResponse('LETTER_NOT_FOUND', 'Letter not found'));
        return;
      }
      if (error instanceof Error && error.message === 'FRIEND_NOT_FOUND') {
        res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend not found'));
        return;
      }
      logger.error('Failed to submit friend letter', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit letter'));
    }
  }
);

// ============================================================
// Couple Route (view friend letter content)
// ============================================================

/**
 * GET /friends/letter/:friendLetterId
 * View a friend's submitted letter (couple/auth required)
 */
router.get(
  '/letter/:friendLetterId',
  authMiddleware,
  async (req: Request<{ friendLetterId: string }>, res: Response) => {
    try {
      const { friendLetterId } = req.params;
      const letterView = await getFriendLetterForCouple(friendLetterId);

      if (!letterView) {
        res.status(404).json(errorResponse('FRIEND_NOT_FOUND', 'Friend letter not found'));
        return;
      }

      res.json(successResponse(letterView));
    } catch (error) {
      logger.error('Failed to get friend letter for couple', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get letter'));
    }
  }
);

export { router as friendRouter };
