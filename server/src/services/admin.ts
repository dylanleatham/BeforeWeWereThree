import { db } from '../db/connection.js';

/**
 * Admin service for Before We Were Three
 * Handles administrative operations like session reset
 */

export interface ResetSessionResult {
  participantsDeleted: number;
  envelopesReset: number;
  votesDeleted: number;
}

/**
 * Reset the entire session state
 *
 * This resets everything to a fresh state for testing or re-running the experience:
 * - Deletes all guest participants (kicks out users, clears A/B designations)
 * - Resets all envelopes to 'sealed' status
 * - Deletes all WYR votes
 *
 * IMPORTANT: When adding new features, include reset logic here.
 * See CLAUDE.md "Reset Capability" section.
 */
export async function resetSession(): Promise<ResetSessionResult> {
  // Use transaction to ensure atomic reset
  const result = await db.$transaction(async (tx) => {
    // 1. Delete all WYR votes first (has foreign key to participants)
    const votesDeleted = await tx.wyrVote.deleteMany({});

    // 2. Delete all guest participants
    const participantsDeleted = await tx.participant.deleteMany({
      where: { role: 'guest' },
    });

    // 3. Reset all envelopes to 'sealed' status
    const envelopesReset = await tx.envelope.updateMany({
      data: { status: 'sealed' },
    });

    return {
      participantsDeleted: participantsDeleted.count,
      envelopesReset: envelopesReset.count,
      votesDeleted: votesDeleted.count,
    };
  });

  return result;
}
