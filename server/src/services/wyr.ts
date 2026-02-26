import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import {
  getPromptsByEnvelopeId,
  getPromptById,
  getVoteForParticipant,
  countVotesForPrompt,
  getVotesForPromptIds,
} from '../db/queries/wyr.js';
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

  // Batch-fetch all votes for all prompts in a single query (avoids N+1)
  const promptIds = prompts.map((p) => p.id);
  const votesByPrompt = await getVotesForPromptIds(promptIds);

  const promptStates: WYRPromptState[] = [];
  let currentPromptIndex = prompts.length - 1; // Default to last if all done
  let foundIncomplete = false;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]!;
    const votes = votesByPrompt.get(prompt.id) ?? [];

    // Get current participant's vote
    const myVoteRecord = votes.find((v) => v.participantId === participantId);
    const myVote = myVoteRecord?.choice ?? null;

    // Check if partner voted
    const partnerVote = votes.find((v) => v.participantId !== participantId);
    const partnerVoted = !!partnerVote;

    // Build results if both have voted
    let results: WYRResults | null = null;
    if (myVote && partnerVote) {
      results = {
        myChoice: myVote,
        partnerChoice: partnerVote.choice,
        isMatch: myVote === partnerVote.choice,
      };
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
  // Use Serializable transaction for vote creation AND completion check
  // to prevent stale reads from concurrent votes
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

    // If both voted on this prompt, check completion of ALL prompts
    let results: WYRResults | null = null;
    let isLastPrompt = false;
    let envelopeComplete = false;

    if (voteCount >= 2) {
      const votes = await tx.wyrVote.findMany({
        where: { promptId },
      });

      const myVote = votes.find((v) => v.participantId === participantId);
      const partnerVote = votes.find((v) => v.participantId !== participantId);

      if (myVote && partnerVote) {
        results = {
          myChoice: myVote.choice as WYRChoice,
          partnerChoice: partnerVote.choice as WYRChoice,
          isMatch: myVote.choice === partnerVote.choice,
        };

        // Check if ALL prompts for this envelope now have both votes
        const allPrompts = await tx.wyrPrompt.findMany({
          where: { envelopeId: prompt.envelopeId },
          select: { id: true },
        });

        let allHaveBothVotes = true;
        for (const p of allPrompts) {
          const count = await tx.wyrVote.count({
            where: { promptId: p.id },
          });
          if (count < 2) {
            allHaveBothVotes = false;
            break;
          }
        }
        envelopeComplete = allHaveBothVotes;
        isLastPrompt = envelopeComplete;

        if (envelopeComplete) {
          await tx.envelope.update({
            where: { id: prompt.envelopeId },
            data: { status: 'completed' },
          });
        }
      }
    }

    return { prompt, voteCount, results, isLastPrompt, envelopeComplete };
  }, { isolationLevel: 'Serializable' });

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

  // Broadcast reveal ready if both voted on this prompt
  if (result.results) {
    if (realtime) {
      const revealMessage: WYRRevealReadyMessage = {
        type: 'wyr_reveal_ready',
        promptId,
        results: result.results,
        isLastPrompt: result.isLastPrompt,
        envelopeComplete: result.envelopeComplete,
      };
      await realtime.sendToGroup(`activity:${result.prompt.envelopeId}`, {
        target: 'wyrRevealReady',
        arguments: [revealMessage],
      });
    }

    return {
      revealed: true,
      results: result.results,
      isLastPrompt: result.isLastPrompt,
      envelopeComplete: result.envelopeComplete,
    };
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
