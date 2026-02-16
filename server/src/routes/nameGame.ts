import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  submitGuidanceRequestSchema,
  submitVoteRequestSchema,
} from 'shared';
import {
  getNameGameState,
  submitGuidance,
  submitVote,
  getAccumulatedMatches,
} from '../services/nameGame.js';
import { getEnvelopeIdForName } from '../db/queries/nameGame.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Baby Name Game routes for Before We Were Three
 *
 * GET    /name-game/:envelopeId          - Get current round state + matches (requires auth)
 * POST   /name-game/:envelopeId/guidance - Submit guidance/readiness for next round (requires auth)
 * POST   /name-game/:nameId/vote         - Submit vote on a name (requires auth)
 * GET    /name-game/:envelopeId/matches  - Get accumulated matches (requires auth)
 */

const router = Router();

/**
 * GET /name-game/:envelopeId
 * Get current round state + accumulated matches for authenticated participant
 */
router.get(
  '/:envelopeId',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      const state = await getNameGameState(envelopeId, participantId);
      res.json(successResponse(state));
    } catch (error) {
      logger.error('Failed to get name game state', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get name game state'));
    }
  }
);

/**
 * POST /name-game/:envelopeId/guidance
 * Submit guidance/readiness for the next round of name generation
 * Body: { guidance?: string }
 *
 * Coordinates between two participants:
 * - Round 1: First submission triggers generation immediately
 * - Round 2+: Both must submit; generation triggers on the second submission
 */
router.post(
  '/:envelopeId/guidance',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      // Validate request body
      const parsed = submitGuidanceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid request data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const result = await submitGuidance(envelopeId, participantId, parsed.data.guidance);
      res.json(successResponse(result));
    } catch (error) {
      // Handle Anthropic API key missing
      if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
        res.status(503).json(
          errorResponse('SERVICE_UNAVAILABLE', 'AI name generation is not configured')
        );
        return;
      }
      logger.error('Failed to submit name game guidance', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to process guidance'));
    }
  }
);

/**
 * POST /name-game/:nameId/vote
 * Submit a vote on a generated name
 * Body: { choice: 'love' | 'maybe' | 'nope' }
 */
router.post(
  '/:nameId/vote',
  authMiddleware,
  async (req: Request<{ nameId: string }>, res: Response) => {
    try {
      const { nameId } = req.params;
      const participantId = req.session?.participantId;

      if (!participantId) {
        res.status(401).json(errorResponse('UNAUTHORIZED', 'Session missing participant ID'));
        return;
      }

      // Validate request body
      const parsed = submitVoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid vote data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      // Look up envelopeId from nameId (needed for SignalR group)
      const envelopeId = await getEnvelopeIdForName(nameId);
      if (!envelopeId) {
        res.status(404).json(errorResponse('NAME_NOT_FOUND', 'Name not found'));
        return;
      }

      const result = await submitVote(nameId, participantId, parsed.data.choice, envelopeId);
      res.json(successResponse(result));
    } catch (error) {
      // Handle known errors
      if (error instanceof Error) {
        if (error.message === 'NAME_NOT_FOUND') {
          res.status(404).json(errorResponse('NAME_NOT_FOUND', 'Name not found'));
          return;
        }
        if (error.message === 'ALREADY_VOTED') {
          res.status(409).json(errorResponse('ALREADY_VOTED', 'You have already voted on this name'));
          return;
        }
      }
      // Handle Prisma unique constraint violation (P2002) — double-tap race condition
      const prismaCode = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: string }).code
        : undefined;
      if (prismaCode === 'P2002') {
        res.status(409).json(errorResponse('ALREADY_VOTED', 'You have already voted on this name'));
        return;
      }
      // Handle Prisma serialization failure (P2034) — concurrent transaction retry
      if (prismaCode === 'P2034') {
        res.status(409).json(errorResponse('TOO_MANY_REQUESTS', 'Please try again'));
        return;
      }
      logger.error('Failed to submit name vote', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to submit vote'));
    }
  }
);

/**
 * GET /name-game/:envelopeId/matches
 * Get accumulated matches across all rounds
 */
router.get(
  '/:envelopeId/matches',
  authMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;

      const matches = await getAccumulatedMatches(envelopeId);
      res.json(successResponse({ matches }));
    } catch (error) {
      logger.error('Failed to get name game matches', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get matches'));
    }
  }
);

export { router as nameGameRouter };
