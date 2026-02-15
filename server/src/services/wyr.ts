import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import {
  getPromptsByEnvelopeId,
  getPromptById,
  getVoteForParticipant,
  getVotesForPrompt,
  countVotesForPrompt,
} from '../db/queries/wyr.js';
import { updateEnvelopeStatus } from '../db/queries/envelopes.js';
import type {
  WYRChoice,
  WYREnvelopeResponse,
  WYRPromptState,
  WYRResults,
  WYRVoteResponse,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
} from 'shared';

/**
 * Would You Rather service
 * Business logic for WYR activities with SignalR integration
 * Supports multiple prompts per envelope with per-prompt gating
 */

/**
 * Get current state of all WYR prompts for an envelope
 * Returns per-prompt state, current prompt index, and overall completion
 */
export async function getEnvelopeState(
  envelopeId: string,
  participantId: string
): Promise<WYREnvelopeResponse | null> {
  const prompts = await getPromptsByEnvelopeId(envelopeId);
  if (prompts.length === 0) {
    return null;
  }

  const promptStates: WYRPromptState[] = [];
  let currentPromptIndex = prompts.length - 1; // Default to last if all done
  let foundIncomplete = false;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]!;

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

    promptStates.push({ prompt, myVote, partnerVoted, results });

    // First prompt without both votes is the current one
    if (!foundIncomplete && !results) {
      currentPromptIndex = i;
      foundIncomplete = true;
    }
  }

  const allComplete = !foundIncomplete;

  return {
    prompts: promptStates,
    currentPromptIndex,
    allComplete,
  };
}

/**
 * Submit a vote for a WYR prompt
 * Uses transaction for race condition safety
 * Broadcasts via SignalR when vote is submitted or reveal is ready
 * Only marks envelope as completed when ALL prompts have both votes
 */
export async function submitVote(
  promptId: string,
  participantId: string,
  choice: WYRChoice
): Promise<WYRVoteResponse> {
  // Use transaction to prevent race conditions
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

    // Count votes after creation for THIS prompt
    const voteCount = await tx.wyrVote.count({
      where: { promptId },
    });

    return { prompt, voteCount };
  });

  // Broadcast vote submitted via SignalR
  const realtime = getRealtimeService();
  const voteSubmittedMessage: WYRVoteSubmittedMessage = {
    type: 'wyr_vote_submitted',
    promptId,
    participantId,
  };

  if (realtime) {
    await realtime.sendToGroup(`activity:${result.prompt.envelopeId}`, {
      target: 'wyrVoteSubmitted',
      arguments: [voteSubmittedMessage],
    });
  }

  // Check if both participants have voted on THIS prompt
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

      // Check if ALL prompts for this envelope now have both votes
      const allPrompts = await getPromptsByEnvelopeId(result.prompt.envelopeId);
      const isLastPrompt = allPrompts.length <= 1 ||
        allPrompts[allPrompts.length - 1]!.id === promptId;

      let envelopeComplete = false;
      if (isLastPrompt && allPrompts.length <= 1) {
        // Single prompt or this is the last one by sort order — check all
        envelopeComplete = true;
      } else {
        // Check every prompt for 2+ votes
        let allHaveBothVotes = true;
        for (const p of allPrompts) {
          const count = await countVotesForPrompt(p.id);
          if (count < 2) {
            allHaveBothVotes = false;
            break;
          }
        }
        envelopeComplete = allHaveBothVotes;
      }

      if (envelopeComplete) {
        await updateEnvelopeStatus(result.prompt.envelopeId, 'completed');
      }

      // Broadcast reveal ready via SignalR
      if (realtime) {
        const revealMessage: WYRRevealReadyMessage = {
          type: 'wyr_reveal_ready',
          promptId,
          results,
          isLastPrompt,
          envelopeComplete,
        };
        await realtime.sendToGroup(`activity:${result.prompt.envelopeId}`, {
          target: 'wyrRevealReady',
          arguments: [revealMessage],
        });
      }

      return { revealed: true, results, isLastPrompt, envelopeComplete };
    }
  }

  return { revealed: false, isLastPrompt: false, envelopeComplete: false };
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
