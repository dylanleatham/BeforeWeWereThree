import { db } from '../connection.js';
import { Prisma } from '@prisma/client';

/**
 * Database queries for Gender Reveal configuration
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 *
 * Note: No toApi transform needed here. The service layer handles
 * transforming Prisma records to API response types, since the
 * gender value must be conditionally included based on reveal state.
 */

/**
 * Get gender reveal config for an envelope
 */
export async function getConfig(envelopeId: string) {
  return db.genderRevealConfig.findUnique({
    where: { envelopeId },
  });
}

/**
 * Create gender reveal config for an envelope
 */
export async function createConfig(
  envelopeId: string,
  genderValue: string,
  keyA: string,
  keyB: string
) {
  return db.genderRevealConfig.create({
    data: {
      envelopeId,
      genderValue,
      keyA,
      keyB,
    },
  });
}

/**
 * Update gender reveal config for an envelope
 */
export async function updateConfig(
  envelopeId: string,
  data: { genderValue?: string; keyA?: string; keyB?: string }
) {
  return db.genderRevealConfig.update({
    where: { envelopeId },
    data,
  });
}

/**
 * Delete gender reveal config for an envelope
 * Returns true if deleted, false if not found
 */
export async function deleteConfig(envelopeId: string): Promise<boolean> {
  try {
    await db.genderRevealConfig.delete({
      where: { envelopeId },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

/**
 * Reset reveal state — clear validation and revealed timestamp
 * Preserves genderValue, keyA, keyB (admin-created content)
 */
export async function resetRevealState(envelopeId: string) {
  return db.genderRevealConfig.update({
    where: { envelopeId },
    data: {
      keyAValidated: false,
      keyBValidated: false,
      revealedAt: null,
    },
  });
}

/**
 * Set a specific key as validated within a transaction
 * Used by the service layer's Serializable transaction
 */
export async function setKeyValidated(
  tx: Prisma.TransactionClient,
  envelopeId: string,
  keyField: 'keyAValidated' | 'keyBValidated',
  otherKeyValidated: boolean
) {
  return tx.genderRevealConfig.update({
    where: { envelopeId },
    data: {
      [keyField]: true,
      // If both keys are now validated, set revealedAt
      ...(otherKeyValidated ? { revealedAt: new Date() } : {}),
    },
  });
}
