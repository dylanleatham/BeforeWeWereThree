import type { PrismaClient } from '@prisma/client';
import { db } from '../db/connection.js';

/**
 * Admin service for Before We Were Three
 * Handles administrative operations like session reset
 */

export interface ResetSessionResult {
  participantsDeleted: number;
  envelopesReset: number;
  votesDeleted: number;
  lettersDeleted: number;
  photosDeleted: number;
}

/**
 * Reset the entire session state
 *
 * This resets everything to a fresh state for testing or re-running the experience:
 * - Deletes all letters (user content)
 * - Deletes all WYR votes
 * - Deletes all guest participants (kicks out users, clears A/B designations)
 * - Resets all envelopes to 'sealed' status
 *
 * Reset order matters due to foreign key constraints:
 * 1. Letters (FK to participants and prompts)
 * 2. WYR votes (FK to participants)
 * 3. Photos (FK to participants)
 * 4. Participants (FK target for letters, votes, and photos)
 * 5. Envelopes (just status reset, no FK issues)
 *
 * NOT reset (by design):
 * - LetterPrompts (admin-created content, preserved)
 * - WyrPrompts (admin-created content, preserved)
 *
 * IMPORTANT: When adding new features, include reset logic here.
 * See CLAUDE.md "Reset Capability" section.
 */
export async function resetSession(): Promise<ResetSessionResult> {
  // Use transaction to ensure atomic reset
  const result = await db.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
    // 1. Delete all letters first (has FK to participants and prompts)
    const lettersDeleted = await tx.letter.deleteMany({});

    // 2. Delete all WYR votes (has FK to participants)
    const votesDeleted = await tx.wyrVote.deleteMany({});

    // 3. Delete all photos (has FK to participants)
    const photosDeleted = await tx.photo.deleteMany({});

    // 4. Delete all guest participants
    const participantsDeleted = await tx.participant.deleteMany({
      where: { role: 'guest' },
    });

    // 5. Reset all envelopes to 'sealed' status
    const envelopesReset = await tx.envelope.updateMany({
      data: { status: 'sealed' },
    });

    return {
      participantsDeleted: participantsDeleted.count,
      envelopesReset: envelopesReset.count,
      votesDeleted: votesDeleted.count,
      lettersDeleted: lettersDeleted.count,
      photosDeleted: photosDeleted.count,
    };
  });

  return result;
}
