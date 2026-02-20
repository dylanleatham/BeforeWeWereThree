import { db } from '../db/connection.js';
import {
  getConfig,
  createConfig,
  updateConfig,
  resetRevealState,
} from '../db/queries/genderReveal.js';
import { logger } from '../utils/logger.js';
import type {
  GenderRevealStateResponse,
  ValidateKeyResponse,
  GenderRevealAdminResponse,
  ConfigureGenderRevealRequest,
  GenderValue,
} from 'shared';

/**
 * Gender Reveal service
 * Business logic for the two-key gender reveal ceremony
 *
 * CRITICAL SECURITY: The gender value must NEVER be returned to the client
 * unless both keys have been validated (REVEAL-05 requirement).
 */

// ============================================================
// Participant State
// ============================================================

/**
 * Get current reveal state for a participant
 *
 * Returns state WITHOUT gender unless revealedAt is set.
 * The myKeyValidated field is always false from this endpoint —
 * the client tracks locally whether it already submitted a key
 * (based on the POST validate-key response).
 */
export async function getRevealState(
  envelopeId: string,
  _participantId: string
): Promise<GenderRevealStateResponse> {
  const config = await getConfig(envelopeId);

  if (!config) {
    return {
      configured: false,
      keysValidated: 0,
      myKeyValidated: false,
      revealed: false,
    };
  }

  const keysValidated =
    (config.keyAValidated ? 1 : 0) + (config.keyBValidated ? 1 : 0);

  if (config.revealedAt) {
    return {
      configured: true,
      keysValidated,
      myKeyValidated: false,
      revealed: true,
      gender: config.genderValue as GenderValue,
      keyLength: config.keyA.length,
    };
  }

  return {
    configured: true,
    keysValidated,
    myKeyValidated: false,
    revealed: false,
    keyLength: config.keyA.length,
  };
}

// ============================================================
// Key Validation (Critical Security Path)
// ============================================================

/**
 * Validate a key and potentially trigger the reveal.
 * Uses Serializable isolation to prevent race conditions.
 *
 * CRITICAL: Gender value is NEVER returned unless both keys are valid.
 * This is the core security gate for the entire gender reveal feature.
 */
export async function validateKey(
  envelopeId: string,
  _participantId: string,
  key: string
): Promise<ValidateKeyResponse> {
  const result = await db.$transaction(async (tx) => {
    const config = await tx.genderRevealConfig.findUnique({
      where: { envelopeId },
    });

    if (!config) {
      throw new Error('REVEAL_NOT_CONFIGURED');
    }

    // Already fully revealed — return gender
    if (config.keyAValidated && config.keyBValidated) {
      return {
        status: 'already_revealed' as const,
        gender: config.genderValue as GenderValue,
      };
    }

    // Check which key matches
    let keyField: 'keyAValidated' | 'keyBValidated' | null = null;
    let otherKeyValidated = false;

    if (key === config.keyA && !config.keyAValidated) {
      keyField = 'keyAValidated';
      otherKeyValidated = config.keyBValidated;
    } else if (key === config.keyB && !config.keyBValidated) {
      keyField = 'keyBValidated';
      otherKeyValidated = config.keyAValidated;
    } else if (key !== config.keyA && key !== config.keyB) {
      return { status: 'invalid_key' as const };
    } else {
      // Key matches but already validated
      return { status: 'key_already_used' as const };
    }

    // Mark key as validated (and set revealedAt if both now valid)
    const updated = await tx.genderRevealConfig.update({
      where: { envelopeId },
      data: {
        [keyField]: true,
        ...(otherKeyValidated ? { revealedAt: new Date() } : {}),
      },
    });

    const bothValid = updated.keyAValidated && updated.keyBValidated;

    if (bothValid) {
      logger.info('Gender reveal unlocked', { envelopeId });
      return {
        status: 'revealed' as const,
        gender: config.genderValue as GenderValue,
      };
    }

    return {
      status: 'waiting_for_partner' as const,
      keysValidated: 1,
    };
  }, { isolationLevel: 'Serializable' });

  return result;
}

// ============================================================
// Admin Configuration
// ============================================================

/**
 * Configure or update gender reveal for an envelope
 * Creates new config if none exists, updates if it does
 * Does NOT allow changing gender value after reveal
 */
export async function configureReveal(
  envelopeId: string,
  data: ConfigureGenderRevealRequest
): Promise<GenderRevealAdminResponse> {
  const existing = await getConfig(envelopeId);

  if (existing) {
    // Don't allow changing config after reveal
    if (existing.revealedAt) {
      throw new Error('REVEAL_ALREADY_DONE');
    }

    const updated = await updateConfig(envelopeId, {
      genderValue: data.genderValue,
      keyA: data.keyA,
      keyB: data.keyB,
    });

    return {
      configured: true,
      genderValue: updated.genderValue as GenderValue,
      keyA: updated.keyA,
      keyB: updated.keyB,
      keyAValidated: updated.keyAValidated,
      keyBValidated: updated.keyBValidated,
      revealedAt: updated.revealedAt?.toISOString(),
    };
  }

  const created = await createConfig(
    envelopeId,
    data.genderValue,
    data.keyA,
    data.keyB
  );

  return {
    configured: true,
    genderValue: created.genderValue as GenderValue,
    keyA: created.keyA,
    keyB: created.keyB,
    keyAValidated: created.keyAValidated,
    keyBValidated: created.keyBValidated,
    revealedAt: created.revealedAt?.toISOString(),
  };
}

/**
 * Get full admin config (includes gender value, keys, and state)
 * Admin-only endpoint — behind adminMiddleware
 */
export async function getAdminConfig(
  envelopeId: string
): Promise<GenderRevealAdminResponse> {
  const config = await getConfig(envelopeId);

  if (!config) {
    return {
      configured: false,
      keyAValidated: false,
      keyBValidated: false,
    };
  }

  return {
    configured: true,
    genderValue: config.genderValue as GenderValue,
    keyA: config.keyA,
    keyB: config.keyB,
    keyAValidated: config.keyAValidated,
    keyBValidated: config.keyBValidated,
    revealedAt: config.revealedAt?.toISOString(),
  };
}

/**
 * Re-seal a reveal — clear validation state but preserve config
 * Used by admin to reset the ceremony for retesting
 */
export async function resealReveal(
  envelopeId: string
): Promise<GenderRevealAdminResponse> {
  const config = await getConfig(envelopeId);
  if (!config) {
    throw new Error('REVEAL_NOT_CONFIGURED');
  }

  const updated = await resetRevealState(envelopeId);

  return {
    configured: true,
    genderValue: updated.genderValue as GenderValue,
    keyA: updated.keyA,
    keyB: updated.keyB,
    keyAValidated: updated.keyAValidated,
    keyBValidated: updated.keyBValidated,
    revealedAt: updated.revealedAt?.toISOString(),
  };
}
