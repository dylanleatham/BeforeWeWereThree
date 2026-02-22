import { db } from '../db/connection.js';
import {
  getConfig,
  createConfig,
  updateConfig,
  resetRevealState,
} from '../db/queries/genderReveal.js';
import { hashKey, verifyKey } from '../utils/keyHash.js';
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

  if (!config || !config.genderValue) {
    return {
      configured: false,
      keysValidated: 0,
      myKeyValidated: false,
      revealed: false,
    };
  }

  const keysValidated =
    (config.keyAValidated ? 1 : 0) + (config.keyBValidated ? 1 : 0);

  // Key length is always 8 (MMDDYYYY) per Zod schema; stored keys are hashes
  const KEY_INPUT_LENGTH = 8;

  if (config.revealedAt) {
    return {
      configured: true,
      keysValidated,
      myKeyValidated: false,
      revealed: true,
      gender: config.genderValue as GenderValue,
      keyLength: KEY_INPUT_LENGTH,
    };
  }

  return {
    configured: true,
    keysValidated,
    myKeyValidated: false,
    revealed: false,
    keyLength: KEY_INPUT_LENGTH,
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

    // Gender not yet set by friend keeper
    if (!config.genderValue) {
      throw new Error('REVEAL_NOT_CONFIGURED');
    }

    // Already fully revealed — return gender
    if (config.keyAValidated && config.keyBValidated) {
      return {
        status: 'already_revealed' as const,
        gender: config.genderValue as GenderValue,
      };
    }

    // Check which key matches (scrypt + timingSafeEqual: always evaluate both)
    const matchesA = await verifyKey(key, config.keyA);
    const matchesB = await verifyKey(key, config.keyB);

    let keyField: 'keyAValidated' | 'keyBValidated' | null = null;
    let otherKeyValidated = false;

    if (matchesA && !config.keyAValidated) {
      keyField = 'keyAValidated';
      otherKeyValidated = config.keyBValidated;
    } else if (matchesB && !config.keyBValidated) {
      keyField = 'keyBValidated';
      otherKeyValidated = config.keyAValidated;
    } else if (!matchesA && !matchesB) {
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
 * Admin sets ONLY the two date keys — gender is set by the friend keeper
 */
export async function configureReveal(
  envelopeId: string,
  data: ConfigureGenderRevealRequest
): Promise<GenderRevealAdminResponse> {
  // Verify envelope exists before creating config (FK constraint)
  const envelope = await db.envelope.findUnique({
    where: { id: envelopeId },
    select: { id: true },
  });
  if (!envelope) {
    throw new Error('ENVELOPE_NOT_FOUND');
  }

  const existing = await getConfig(envelopeId);

  // Hash keys before storing (defense-in-depth: DB compromise doesn't leak keys)
  const hashedKeyA = await hashKey(data.keyA);
  const hashedKeyB = await hashKey(data.keyB);

  if (existing) {
    // Don't allow changing config after reveal
    if (existing.revealedAt) {
      throw new Error('REVEAL_ALREADY_DONE');
    }

    const updated = await updateConfig(envelopeId, {
      keyA: hashedKeyA,
      keyB: hashedKeyB,
    });

    return {
      configured: true,
      genderSet: updated.genderValue !== null,
      keyAValidated: updated.keyAValidated,
      keyBValidated: updated.keyBValidated,
      revealedAt: updated.revealedAt?.toISOString(),
    };
  }

  const created = await createConfig(
    envelopeId,
    hashedKeyA,
    hashedKeyB
  );

  return {
    configured: true,
    genderSet: created.genderValue !== null,
    keyAValidated: created.keyAValidated,
    keyBValidated: created.keyBValidated,
    revealedAt: created.revealedAt?.toISOString(),
  };
}

/**
 * Get admin config — NEVER includes the gender value itself
 * Admin can see genderSet (boolean), keys, and state
 */
export async function getAdminConfig(
  envelopeId: string
): Promise<GenderRevealAdminResponse> {
  const config = await getConfig(envelopeId);

  if (!config) {
    return {
      configured: false,
      genderSet: false,
      keyAValidated: false,
      keyBValidated: false,
    };
  }

  return {
    configured: true,
    genderSet: config.genderValue !== null,
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
    genderSet: updated.genderValue !== null,
    keyAValidated: updated.keyAValidated,
    keyBValidated: updated.keyBValidated,
    revealedAt: updated.revealedAt?.toISOString(),
  };
}

/**
 * Set gender value by a friend who is the designated gender keeper
 * One-time, immutable operation
 */
export async function setGenderByFriend(
  friendId: string,
  genderValue: 'boy' | 'girl'
): Promise<void> {
  await db.$transaction(async (tx) => {
    const config = await tx.genderRevealConfig.findFirst();

    if (!config) {
      throw new Error('REVEAL_NOT_CONFIGURED');
    }

    if (config.genderValue !== null) {
      throw new Error('GENDER_ALREADY_SET');
    }

    await tx.genderRevealConfig.update({
      where: { envelopeId: config.envelopeId },
      data: {
        genderValue,
        setByFriendId: friendId,
      },
    });

    logger.info('Gender set by friend keeper', { friendId, envelopeId: config.envelopeId });
  }, { isolationLevel: 'Serializable' });
}
