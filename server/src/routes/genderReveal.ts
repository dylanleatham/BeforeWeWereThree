import { Router, Request, Response } from 'express';
import {
  successResponse,
  errorResponse,
  validateRevealKeySchema,
  configureGenderRevealSchema,
} from 'shared';
import type {
  GenderRevealKeyValidatedMessage,
  GenderRevealUnlockedMessage,
} from 'shared';
import {
  getRevealState,
  validateKey,
  configureReveal,
  getAdminConfig,
  resealReveal,
} from '../services/genderReveal.js';
import { deleteConfig } from '../db/queries/genderReveal.js';
import { getRealtimeService } from '../services/realtime.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

// Rate limit: 5 configure attempts per minute per IP
const configureRateLimiter = createRateLimiter({ maxAttempts: 5, windowMs: 60 * 1000, keyPrefix: 'gr-configure' });

/**
 * Gender Reveal routes for Before We Were Three
 *
 * Admin routes (adminMiddleware) — use /admin/ prefix to avoid param collision:
 * GET    /gender-reveal/admin/:envelopeId            — Get full config (admin only)
 * POST   /gender-reveal/admin/:envelopeId/configure  — Create/update config
 * POST   /gender-reveal/admin/:envelopeId/re-seal    — Clear validation state
 * DELETE /gender-reveal/admin/:envelopeId             — Delete config entirely
 *
 * Guest routes (authMiddleware):
 * GET    /gender-reveal/:envelopeId                   — Get reveal state (NO gender unless revealed)
 * POST   /gender-reveal/:envelopeId/validate-key      — Submit a key
 */

const router = Router();

// ============================================================
// Admin Routes (must be before param routes to avoid collision)
// ============================================================

/**
 * GET /gender-reveal/admin/:envelopeId
 * Get full gender reveal config (admin only)
 * Includes gender value, keys, and validation state
 */
router.get(
  '/admin/:envelopeId',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const config = await getAdminConfig(envelopeId);
      res.json(successResponse(config));
    } catch (error) {
      logger.error('Failed to get gender reveal admin config', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get gender reveal config'));
    }
  }
);

/**
 * POST /gender-reveal/admin/:envelopeId/configure
 * Create or update gender reveal config (admin only)
 */
router.post(
  '/admin/:envelopeId/configure',
  adminMiddleware,
  configureRateLimiter,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;

      const parsed = configureGenderRevealSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid configuration data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const config = await configureReveal(envelopeId, parsed.data);
      res.json(successResponse(config));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'REVEAL_ALREADY_DONE') {
          res.status(409).json(
            errorResponse('REVEAL_ALREADY_DONE', 'Cannot modify config after reveal. Re-seal first.')
          );
          return;
        }
      }
      logger.error('Failed to configure gender reveal', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to configure gender reveal'));
    }
  }
);

/**
 * POST /gender-reveal/admin/:envelopeId/re-seal
 * Clear validation state, keep config (admin only)
 * Used for retesting the ceremony
 */
router.post(
  '/admin/:envelopeId/re-seal',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const config = await resealReveal(envelopeId);
      res.json(successResponse(config));
    } catch (error) {
      if (error instanceof Error && error.message === 'REVEAL_NOT_CONFIGURED') {
        res.status(404).json(
          errorResponse('REVEAL_NOT_CONFIGURED', 'No gender reveal config found for this envelope')
        );
        return;
      }
      logger.error('Failed to re-seal gender reveal', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to re-seal gender reveal'));
    }
  }
);

/**
 * DELETE /gender-reveal/admin/:envelopeId
 * Delete gender reveal config entirely (admin only)
 */
router.delete(
  '/admin/:envelopeId',
  adminMiddleware,
  async (req: Request<{ envelopeId: string }>, res: Response) => {
    try {
      const { envelopeId } = req.params;
      const deleted = await deleteConfig(envelopeId);
      if (!deleted) {
        res.status(404).json(
          errorResponse('REVEAL_NOT_CONFIGURED', 'No gender reveal config found for this envelope')
        );
        return;
      }
      res.json(successResponse({ deleted: true }));
    } catch (error) {
      logger.error('Failed to delete gender reveal config', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete gender reveal config'));
    }
  }
);

// ============================================================
// Guest Routes
// ============================================================

/**
 * GET /gender-reveal/:envelopeId
 * Get gender reveal state for participant
 * NEVER includes gender unless revealedAt is set (REVEAL-05)
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

      const state = await getRevealState(envelopeId, participantId);
      res.json(successResponse(state));
    } catch (error) {
      logger.error('Failed to get gender reveal state', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to get gender reveal state'));
    }
  }
);

/**
 * POST /gender-reveal/:envelopeId/validate-key
 * Submit a key for validation
 * Returns result and broadcasts via SignalR if key validated or reveal triggered
 */
router.post(
  '/:envelopeId/validate-key',
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
      const parsed = validateRevealKeySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Invalid key data', {
            issues: parsed.error.issues,
          })
        );
        return;
      }

      const result = await validateKey(envelopeId, participantId, parsed.data.key);

      // Broadcast via SignalR based on result
      const realtime = getRealtimeService();

      if (result.status === 'waiting_for_partner' && realtime) {
        // One key validated — broadcast progress to partner
        const keyValidatedMessage: GenderRevealKeyValidatedMessage = {
          type: 'gender_reveal_key_validated',
          envelopeId,
          keysValidated: result.keysValidated,
        };
        await realtime.sendToGroup(`activity:${envelopeId}`, {
          target: 'genderRevealKeyValidated',
          arguments: [keyValidatedMessage],
        });
      }

      if (result.status === 'revealed' && realtime) {
        // Both keys validated — broadcast reveal to both devices
        const unlockedMessage: GenderRevealUnlockedMessage = {
          type: 'gender_reveal_unlocked',
          envelopeId,
          gender: result.gender,
        };
        await realtime.sendToGroup(`activity:${envelopeId}`, {
          target: 'genderRevealUnlocked',
          arguments: [unlockedMessage],
        });
      }

      res.json(successResponse(result));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'REVEAL_NOT_CONFIGURED') {
          res.status(404).json(
            errorResponse('REVEAL_NOT_CONFIGURED', 'No gender reveal config found for this envelope')
          );
          return;
        }
      }
      logger.error('Failed to validate gender reveal key', { error });
      res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to validate key'));
    }
  }
);

export { router as genderRevealRouter };
