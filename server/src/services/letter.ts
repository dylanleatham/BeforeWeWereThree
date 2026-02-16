import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import {
  getPromptByEnvelopeId,
  getLetterForParticipant,
  getSubmittedLettersForPrompt,
  createOrUpdateLetter,
} from '../db/queries/letter.js';
import { updateEnvelopeStatus, getEnvelopeById } from '../db/queries/envelopes.js';
import type {
  LetterPhase,
  LetterState,
  Letter,
  LetterSubmittedMessage,
  LetterRevealReadyMessage,
} from 'shared';

/**
 * Letter to Baby service
 * Business logic for letter activities with SignalR integration
 */

/**
 * Get current state of a letter activity for a participant
 * Returns prompt, phase, my letter, and revealed letters if both submitted
 */
export async function getLetterState(
  envelopeId: string,
  participantId: string
): Promise<LetterState | null> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    return null;
  }

  // Get current participant's letter (may be null if not started)
  const myLetter = await getLetterForParticipant(prompt.id, participantId);

  // Get all submitted letters to check status
  const submittedLetters = await getSubmittedLettersForPrompt(prompt.id);

  // Check if partner has submitted
  const partnerSubmitted = submittedLetters.some((l) => l.participantId !== participantId);

  // Determine phase based on submission state
  let phase: LetterPhase;
  let revealedLetters: Letter[] = [];

  if (!myLetter || !myLetter.submittedAt) {
    // I haven't submitted yet
    phase = 'writing';
  } else if (submittedLetters.length >= 2) {
    // Both have submitted - check envelope status for complete vs revealing
    const envelope = await getEnvelopeById(envelopeId);
    phase = envelope?.status === 'completed' ? 'complete' : 'revealing';
    revealedLetters = submittedLetters;
  } else {
    // I submitted but partner hasn't
    phase = 'waiting';
  }

  return {
    prompt,
    phase,
    myLetter,
    partnerSubmitted,
    revealedLetters,
  };
}

/**
 * Save letter content (auto-save, no submission)
 * Creates letter if doesn't exist, updates if it does
 */
export async function saveLetter(
  envelopeId: string,
  participantId: string,
  content: string,
  photoUrl: string | null
): Promise<Letter> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    throw new Error('PROMPT_NOT_FOUND');
  }

  // Use upsert pattern for auto-save
  const letter = await createOrUpdateLetter(prompt.id, participantId, {
    content,
    photoUrl,
  });

  // No SignalR broadcast for auto-save (silent operation)
  return letter;
}

/**
 * Submit a letter (marks as complete)
 * Uses transaction for race condition safety
 * Broadcasts via SignalR when submitted or reveal is ready
 */
export async function submitLetter(
  envelopeId: string,
  participantId: string
): Promise<{ revealed: boolean; letters?: Letter[] }> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    throw new Error('PROMPT_NOT_FOUND');
  }

  // Use transaction to prevent race conditions
  const result = await db.$transaction(async (tx) => {
    // Get or create letter (must exist to submit)
    let letter = await tx.letter.findUnique({
      where: {
        promptId_participantId: {
          promptId: prompt.id,
          participantId,
        },
      },
    });

    if (!letter) {
      // Create empty letter if it doesn't exist (shouldn't happen normally)
      letter = await tx.letter.create({
        data: {
          promptId: prompt.id,
          participantId,
          content: '',
        },
      });
    }

    // Check if already submitted
    if (letter.submittedAt) {
      throw new Error('ALREADY_SUBMITTED');
    }

    // Set submittedAt timestamp
    await tx.letter.update({
      where: { id: letter.id },
      data: { submittedAt: new Date() },
    });

    // Count submitted letters after this submission
    const submittedCount = await tx.letter.count({
      where: {
        promptId: prompt.id,
        submittedAt: { not: null },
      },
    });

    return { submittedCount };
  }, { isolationLevel: 'Serializable' });

  // Broadcast letter submitted via SignalR
  const realtime = getRealtimeService();
  const submitMessage: LetterSubmittedMessage = {
    type: 'letter_submitted',
    promptId: prompt.id,
    participantId,
  };

  if (realtime) {
    // Use envelope ID as group name for activity-specific messaging
    await realtime.sendToGroup(`activity:${envelopeId}`, {
      target: 'letterSubmitted',
      arguments: [submitMessage],
    });
  }

  // Check if both participants have submitted
  if (result.submittedCount >= 2) {
    // Get all submitted letters to return
    const letters = await getSubmittedLettersForPrompt(prompt.id);

    // Update envelope status to completed
    await updateEnvelopeStatus(envelopeId, 'completed');

    // Broadcast reveal ready via SignalR
    if (realtime) {
      const revealMessage: LetterRevealReadyMessage = {
        type: 'letter_reveal_ready',
        promptId: prompt.id,
        letters,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'letterRevealReady',
        arguments: [revealMessage],
      });
    }

    return { revealed: true, letters };
  }

  return { revealed: false };
}
