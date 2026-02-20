import type { PrismaClient } from '@prisma/client';
import { db } from '../db/connection.js';

/**
 * Admin service for Before We Were Three
 * Handles administrative operations like session reset
 */

export interface ResetSessionResult {
  message: string;
  participantsDeleted: number;
  envelopesReset: number;
  votesDeleted: number;
  lettersDeleted: number;
  photosDeleted: number;
  nameVotesDeleted: number;
  nameNamesDeleted: number;
  nameRoundsDeleted: number;
  nameGuidanceDeleted: number;
  triviaAnswersDeleted: number;
  genderRevealReset: number;
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
 * 4. Name game votes (FK to participants and names)
 * 5. Name game names (FK to rounds)
 * 6. Name game rounds (FK to envelopes)
 * 7. Trivia answers (FK to participants)
 * 8. Participants (FK target for letters, votes, photos, name votes, trivia answers)
 * 9. Envelopes (just status reset, no FK issues)
 *
 * NOT reset (by design):
 * - LetterPrompts (admin-created content, preserved)
 * - WyrPrompts (admin-created content, preserved)
 * - TriviaQuestions and TriviaEnvelopeQuestions (admin-created content, preserved)
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

    // 3. Delete all photos uploaded by non-friend participants (has FK to participants)
    const photosDeleted = await tx.photo.deleteMany({
      where: { uploadedBy: { role: { not: 'friend' } } },
    });

    // 4. Delete name game data (FK order: votes -> names -> rounds, guidance -> participants)
    const nameVotesDeleted = await tx.nameGameVote.deleteMany({});
    const nameNamesDeleted = await tx.nameGameName.deleteMany({});
    const nameRoundsDeleted = await tx.nameGameRound.deleteMany({});
    const nameGuidanceDeleted = await tx.nameGameGuidance.deleteMany({});

    // 5. Delete trivia answers (FK to participants, preserves questions and assignments)
    const triviaAnswersDeleted = await tx.triviaAnswer.deleteMany({});

    // 5.5. Reset gender reveal state (preserve config, clear validation)
    // Gender value and keys are admin-created content — only clear reveal state
    const genderRevealReset = await tx.genderRevealConfig.updateMany({
      data: {
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: null,
      },
    });

    // 6. Delete all guest participants
    const participantsDeleted = await tx.participant.deleteMany({
      where: { role: 'guest' },
    });

    // 7. Reset all non-friend-letter envelopes to 'sealed' status
    const envelopesReset = await tx.envelope.updateMany({
      where: { type: { not: 'friend-letter' } },
      data: { status: 'sealed' },
    });

    return {
      message: 'Session reset successfully',
      participantsDeleted: participantsDeleted.count,
      envelopesReset: envelopesReset.count,
      votesDeleted: votesDeleted.count,
      lettersDeleted: lettersDeleted.count,
      photosDeleted: photosDeleted.count,
      nameVotesDeleted: nameVotesDeleted.count,
      nameNamesDeleted: nameNamesDeleted.count,
      nameRoundsDeleted: nameRoundsDeleted.count,
      nameGuidanceDeleted: nameGuidanceDeleted.count,
      triviaAnswersDeleted: triviaAnswersDeleted.count,
      genderRevealReset: genderRevealReset.count,
    };
  });

  return result;
}
