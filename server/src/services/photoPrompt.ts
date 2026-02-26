import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import {
  getPromptByEnvelopeId,
  getResponseForParticipant,
  getResponsesForPrompt,
} from '../db/queries/photoPrompt.js';
import { updateEnvelopeStatus } from '../db/queries/envelopes.js';
import type {
  PhotoPromptActivityResponse,
  PhotoPromptResponse,
  PhotoPromptSubmittedMessage,
  PhotoPromptCompleteMessage,
} from 'shared';

/**
 * Photo Prompt service
 * Business logic for photo prompt activities with SignalR integration
 */

/**
 * Get current state of a photo prompt activity for a participant
 * Returns prompt, my response, and partner response
 */
export async function getPhotoPromptState(
  envelopeId: string,
  participantId: string
): Promise<PhotoPromptActivityResponse | null> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    return null;
  }

  // Get current participant's response
  const myResponse = await getResponseForParticipant(prompt.id, participantId);

  // Get all responses to find partner's
  const allResponses = await getResponsesForPrompt(prompt.id);
  const partnerResponse = allResponses.find((r) => r.participantId !== participantId) ?? null;

  return {
    prompt,
    myResponse,
    partnerResponse,
  };
}

/**
 * Submit a photo response for a participant
 * Uses Serializable isolation to prevent race conditions
 * Broadcasts via SignalR when submitted or activity completes
 */
export async function submitResponse(
  envelopeId: string,
  participantId: string,
  photoUrl: string
): Promise<{ response: PhotoPromptResponse; completed: boolean; responses?: PhotoPromptResponse[] }> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    throw new Error('PHOTO_PROMPT_NOT_FOUND');
  }

  // Use Serializable transaction to prevent duplicate responses
  const result = await db.$transaction(async (tx) => {
    // Check if already responded
    const existing = await tx.photoPromptResponse.findUnique({
      where: {
        promptId_participantId: {
          promptId: prompt.id,
          participantId,
        },
      },
    });

    if (existing) {
      throw new Error('ALREADY_RESPONDED');
    }

    // Create the response
    const created = await tx.photoPromptResponse.create({
      data: {
        promptId: prompt.id,
        participantId,
        photoUrl,
      },
    });

    // Count total responses after this one
    const responseCount = await tx.photoPromptResponse.count({
      where: { promptId: prompt.id },
    });

    return {
      response: {
        id: created.id,
        promptId: created.promptId,
        participantId: created.participantId,
        photoUrl: created.photoUrl,
        createdAt: created.createdAt.toISOString(),
      } as PhotoPromptResponse,
      responseCount,
    };
  }, { isolationLevel: 'Serializable' });

  // Broadcast submission via SignalR
  const realtime = getRealtimeService();
  const submitMessage: PhotoPromptSubmittedMessage = {
    type: 'photo_prompt_submitted',
    promptId: prompt.id,
    participantId,
  };

  if (realtime) {
    await realtime.sendToGroup(`activity:${envelopeId}`, {
      target: 'photoPromptSubmitted',
      arguments: [submitMessage],
    });
  }

  // Check if both participants have responded
  if (result.responseCount >= 2) {
    const allResponses = await getResponsesForPrompt(prompt.id);

    // Update envelope status to completed
    await updateEnvelopeStatus(envelopeId, 'completed');

    // Broadcast completion via SignalR
    if (realtime) {
      const completeMessage: PhotoPromptCompleteMessage = {
        type: 'photo_prompt_complete',
        promptId: prompt.id,
        responses: allResponses,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'photoPromptComplete',
        arguments: [completeMessage],
      });
    }

    return { response: result.response, completed: true, responses: allResponses };
  }

  return { response: result.response, completed: false };
}
