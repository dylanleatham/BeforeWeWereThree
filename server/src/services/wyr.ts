import { db } from '../db/connection.js';
import { getSignalRService } from './signalr.js';
import {
  getPromptByEnvelopeId,
  getPromptById,
  getVoteForParticipant,
  getVotesForPrompt,
  countVotesForPrompt,
} from '../db/queries/wyr.js';
import { updateEnvelopeStatus } from '../db/queries/envelopes.js';
import type {
  WYRChoice,
  WYRPromptResponse,
  WYRResults,
  WYRVoteResponse,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
} from 'shared';

/**
 * Would You Rather service
 * Business logic for WYR activities with SignalR integration
 */

/**
 * Get current state of a WYR prompt for a participant
 * Returns prompt, voting status, and results if both have voted
 */
export async function getPromptState(
  envelopeId: string,
  participantId: string
): Promise<WYRPromptResponse | null> {
  const prompt = await getPromptByEnvelopeId(envelopeId);
  if (!prompt) {
    return null;
  }

  // Get current participant's vote
  const myVoteRecord = await getVoteForParticipant(prompt.id, participantId);
  const myVote = myVoteRecord?.choice ?? null;

  // Get all votes to check if partner voted
  const votes = await getVotesForPrompt(prompt.id);
  const partnerVoted = votes.some((v) => v.participantId !== participantId);

  // Build results if both have voted
  let results: WYRResults | null = null;
  if (myVote && partnerVoted) {
    const partnerVote = votes.find((v) => v.participantId !== participantId);
    if (partnerVote) {
      results = {
        myChoice: myVote,
        partnerChoice: partnerVote.choice,
        isMatch: myVote === partnerVote.choice,
      };
    }
  }

  return {
    prompt,
    myVote,
    partnerVoted,
    results,
  };
}

/**
 * Submit a vote for a WYR prompt
 * Uses transaction for race condition safety
 * Broadcasts via SignalR when vote is submitted or reveal is ready
 */
export async function submitVote(
  promptId: string,
  participantId: string,
  choice: WYRChoice
): Promise<WYRVoteResponse> {
  // Use transaction to prevent race conditions
  // If two votes come in simultaneously, unique constraint ensures only one succeeds per participant
  const result = await db.$transaction(async (tx) => {
    // Check if prompt exists
    const prompt = await tx.wyrPrompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt) {
      throw new Error('PROMPT_NOT_FOUND');
    }

    // Check if already voted (unique constraint will also enforce this)
    const existingVote = await tx.wyrVote.findUnique({
      where: {
        promptId_participantId: {
          promptId,
          participantId,
        },
      },
    });
    if (existingVote) {
      throw new Error('ALREADY_VOTED');
    }

    // Create the vote
    await tx.wyrVote.create({
      data: {
        promptId,
        participantId,
        choice,
      },
    });

    // Count votes after creation
    const voteCount = await tx.wyrVote.count({
      where: { promptId },
    });

    return { prompt, voteCount };
  });

  // Broadcast vote submitted via SignalR
  const signalr = getSignalRService();
  const voteSubmittedMessage: WYRVoteSubmittedMessage = {
    type: 'wyr_vote_submitted',
    promptId,
    participantId,
  };

  if (signalr) {
    // Use envelope ID as group name for activity-specific messaging
    await signalr.sendToGroup(`activity:${result.prompt.envelopeId}`, {
      target: 'wyrVoteSubmitted',
      arguments: [voteSubmittedMessage],
    });
  }

  // Check if both participants have voted
  if (result.voteCount >= 2) {
    // Get all votes to build results
    const votes = await getVotesForPrompt(promptId);

    // Find my vote and partner vote
    const myVote = votes.find((v) => v.participantId === participantId);
    const partnerVote = votes.find((v) => v.participantId !== participantId);

    if (myVote && partnerVote) {
      const results: WYRResults = {
        myChoice: myVote.choice,
        partnerChoice: partnerVote.choice,
        isMatch: myVote.choice === partnerVote.choice,
      };

      // Update envelope status to completed
      await updateEnvelopeStatus(result.prompt.envelopeId, 'completed');

      // Broadcast reveal ready via SignalR
      if (signalr) {
        const revealMessage: WYRRevealReadyMessage = {
          type: 'wyr_reveal_ready',
          promptId,
          results,
        };
        await signalr.sendToGroup(`activity:${result.prompt.envelopeId}`, {
          target: 'wyrRevealReady',
          arguments: [revealMessage],
        });
      }

      return { revealed: true, results };
    }
  }

  return { revealed: false };
}

/**
 * Validate that a prompt exists and return it
 */
export async function validatePrompt(promptId: string): Promise<boolean> {
  const prompt = await getPromptById(promptId);
  return prompt !== null;
}

/**
 * Check if participant has already voted on a prompt
 */
export async function hasVoted(promptId: string, participantId: string): Promise<boolean> {
  const vote = await getVoteForParticipant(promptId, participantId);
  return vote !== null;
}

/**
 * Get vote count for a prompt
 */
export async function getVoteCount(promptId: string): Promise<number> {
  return countVotesForPrompt(promptId);
}
