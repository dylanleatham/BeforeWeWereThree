import type { PrismaClient } from '@prisma/client';
import { db } from '../db/connection.js';
import { logger } from '../utils/logger.js';

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
  photoPromptResponsesDeleted: number;
  babymoonReopened: boolean;
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

    // 5.25. Delete photo prompt responses (FK to participants, preserves prompts)
    const photoPromptResponsesDeleted = await tx.photoPromptResponse.deleteMany({});

    // 5.5. Reset gender reveal state — clear validation AND gender value
    // Gender value is friend-set content (user-generated), so it should reset
    // Keys are admin-created content and are preserved
    const genderRevealReset = await tx.genderRevealConfig.updateMany({
      data: {
        genderValue: null,
        setByFriendId: null,
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

    // 8. Clear babymoon closed state (reopen for fresh experience)
    const babymoonConfig = await tx.appConfig.deleteMany({
      where: { key: 'babymoon_closed_at' },
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
      photoPromptResponsesDeleted: photoPromptResponsesDeleted.count,
      babymoonReopened: babymoonConfig.count > 0,
    };
  });

  return result;
}

export interface ResetEnvelopeResult {
  message: string;
  envelopeId: string;
  envelopeType: string;
  itemsDeleted: number;
}

/**
 * Reset a single envelope to fresh state
 *
 * Deletes user-generated activity data for this envelope and resets status to 'sealed'.
 * Admin-created content (prompts, questions, config keys) is preserved.
 *
 * Friend-letter envelopes cannot be reset (friend contributions must be preserved).
 */
export async function resetEnvelope(envelopeId: string): Promise<ResetEnvelopeResult> {
  const envelope = await db.envelope.findUnique({ where: { id: envelopeId } });
  if (!envelope) {
    throw new Error('ENVELOPE_NOT_FOUND');
  }

  if (envelope.type === 'friend-letter') {
    throw new Error('CANNOT_RESET_FRIEND_LETTER');
  }

  const result = await db.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
    let itemsDeleted = 0;

    switch (envelope.type) {
      case 'would-you-rather': {
        // Delete votes for prompts in this envelope (prompts preserved)
        const prompts = await tx.wyrPrompt.findMany({
          where: { envelopeId },
          select: { id: true },
        });
        const promptIds = prompts.map((p) => p.id);
        if (promptIds.length > 0) {
          const deleted = await tx.wyrVote.deleteMany({
            where: { promptId: { in: promptIds } },
          });
          itemsDeleted += deleted.count;
        }
        break;
      }

      case 'letter': {
        // Delete letters for the prompt in this envelope (prompt preserved)
        const prompt = await tx.letterPrompt.findUnique({
          where: { envelopeId },
          select: { id: true },
        });
        if (prompt) {
          const deleted = await tx.letter.deleteMany({
            where: { promptId: prompt.id },
          });
          itemsDeleted += deleted.count;
        }
        break;
      }

      case 'trivia': {
        // Delete answers for this envelope (questions and assignments preserved)
        const deleted = await tx.triviaAnswer.deleteMany({
          where: { envelopeId },
        });
        itemsDeleted += deleted.count;
        break;
      }

      case 'name-game': {
        // FK order: votes -> names -> rounds, guidance standalone
        const rounds = await tx.nameGameRound.findMany({
          where: { envelopeId },
          select: { id: true },
        });
        const roundIds = rounds.map((r) => r.id);

        if (roundIds.length > 0) {
          const names = await tx.nameGameName.findMany({
            where: { roundId: { in: roundIds } },
            select: { id: true },
          });
          const nameIds = names.map((n) => n.id);

          if (nameIds.length > 0) {
            const votesDeleted = await tx.nameGameVote.deleteMany({
              where: { nameId: { in: nameIds } },
            });
            itemsDeleted += votesDeleted.count;
          }

          const namesDeleted = await tx.nameGameName.deleteMany({
            where: { roundId: { in: roundIds } },
          });
          itemsDeleted += namesDeleted.count;
        }

        const roundsDeleted = await tx.nameGameRound.deleteMany({
          where: { envelopeId },
        });
        itemsDeleted += roundsDeleted.count;

        const guidanceDeleted = await tx.nameGameGuidance.deleteMany({
          where: { envelopeId },
        });
        itemsDeleted += guidanceDeleted.count;
        break;
      }

      case 'gender-reveal': {
        // Reset validation and gender value (keys preserved)
        const updated = await tx.genderRevealConfig.updateMany({
          where: { envelopeId },
          data: {
            genderValue: null,
            setByFriendId: null,
            keyAValidated: false,
            keyBValidated: false,
            revealedAt: null,
          },
        });
        itemsDeleted += updated.count;
        break;
      }

      case 'photo-prompt': {
        // Delete responses for the prompt in this envelope (prompt preserved)
        const prompt = await tx.photoPrompt.findUnique({
          where: { envelopeId },
          select: { id: true },
        });
        if (prompt) {
          const deleted = await tx.photoPromptResponse.deleteMany({
            where: { promptId: prompt.id },
          });
          itemsDeleted += deleted.count;
        }
        break;
      }

      default:
        logger.warn('resetEnvelope: no cleanup logic for envelope type', { type: envelope.type });
    }

    // Reset envelope status to sealed
    await tx.envelope.update({
      where: { id: envelopeId },
      data: { status: 'sealed' },
    });

    return itemsDeleted;
  });

  return {
    message: `Envelope reset successfully`,
    envelopeId,
    envelopeType: envelope.type,
    itemsDeleted: result,
  };
}
