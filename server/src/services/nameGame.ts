import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import { generateNames } from './anthropic.js';
import {
  getNameGameState as getNameGameStateQuery,
  getExcludedNames,
  getNextRoundNumber,
  createRound,
  createNames,
  getRoundResults,
  getAccumulatedMatches as getAccumulatedMatchesQuery,
  getRoundCount,
  getRoundIdForName,
} from '../db/queries/nameGame.js';
import { logger } from '../utils/logger.js';
import type {
  NameGameStateResponse,
  NameGameRoundResponse,
  NameGameResults,
  NameVoteChoice,
  GeneratedName,
  NameVoteSubmittedMessage,
  NameRoundCompleteMessage,
} from 'shared';

/**
 * Baby Name Game service
 * Business logic for AI-powered name generation, voting, and match tracking
 * Integrates with Anthropic API for name generation and SignalR for real-time sync
 */

// ============================================================
// State
// ============================================================

/**
 * Get current name game state for a participant
 * Returns current round with vote states + accumulated matches across all rounds
 */
export async function getNameGameState(
  envelopeId: string,
  participantId: string
): Promise<NameGameStateResponse> {
  const currentRound = await getNameGameStateQuery(envelopeId, participantId);
  const allMatches = await getAccumulatedMatchesQuery(envelopeId);
  const roundCount = await getRoundCount(envelopeId);

  return {
    currentRound,
    allMatches,
    roundCount,
  };
}

// ============================================================
// Round Generation
// ============================================================

/**
 * Generate a new round of baby names using the Anthropic API
 *
 * Flow:
 * 1. Get next round number
 * 2. Get excluded names from all previous rounds
 * 3. Call Anthropic API for name generation
 * 4. Create round record in DB
 * 5. Create name records in DB from AI response
 * 6. Return the new round state
 */
export async function generateRound(
  envelopeId: string,
  participantId: string,
  guidance?: string
): Promise<NameGameRoundResponse> {
  const roundNumber = await getNextRoundNumber(envelopeId);
  const excludeNames = await getExcludedNames(envelopeId);

  logger.info('Generating name game round', {
    envelopeId,
    roundNumber,
    excludeCount: excludeNames.length,
    hasGuidance: !!guidance,
  });

  // Call Anthropic API
  const aiResponse = await generateNames({
    count: 10,
    excludeNames,
    userGuidance: guidance,
  });

  // Create round in DB
  const round = await createRound(envelopeId, roundNumber, guidance);

  // Create name records from AI response
  const names = await createNames(round.id, aiResponse.names);

  logger.info('Name game round created', {
    roundId: round.id,
    roundNumber,
    nameCount: names.length,
  });

  return {
    roundId: round.id,
    roundNumber: round.roundNumber,
    names: names.map((name) => ({
      name,
      myVote: null,
      partnerVoted: false,
    })),
    allVoted: false,
  };
}

// ============================================================
// Voting
// ============================================================

/**
 * Vote submission response
 */
export interface VoteResult {
  allVoted: boolean;
  results?: NameGameResults;
}

/**
 * Submit a vote for a name
 *
 * Uses Serializable isolation to prevent race conditions when both
 * participants vote simultaneously. Same pattern as WYR voting.
 *
 * After voting:
 * - If round complete (both participants voted on ALL names): compute results
 *   and broadcast name_round_complete via SignalR
 * - If not complete: broadcast name_vote_submitted with progress
 */
export async function submitVote(
  nameId: string,
  participantId: string,
  choice: NameVoteChoice,
  envelopeId: string
): Promise<VoteResult> {
  // Get roundId for this name (needed for vote count queries)
  const roundId = await getRoundIdForName(nameId);
  if (!roundId) {
    throw new Error('NAME_NOT_FOUND');
  }

  // Use Serializable transaction to prevent race conditions
  const txResult = await db.$transaction(async (tx) => {
    // Check if already voted (unique constraint will also enforce this)
    const existingVote = await tx.nameGameVote.findUnique({
      where: {
        nameId_participantId: {
          nameId,
          participantId,
        },
      },
    });
    if (existingVote) {
      throw new Error('ALREADY_VOTED');
    }

    // Create the vote
    await tx.nameGameVote.create({
      data: {
        nameId,
        participantId,
        choice,
      },
    });

    // Count how many names this participant has voted on in this round
    const myVoteCount = await tx.nameGameVote.count({
      where: {
        participantId,
        name: { roundId },
      },
    });

    // Count total names in the round
    const totalNames = await tx.nameGameName.count({
      where: { roundId },
    });

    // Check if both participants have voted on ALL names
    // Group votes by participant and check each has totalNames votes
    const participantVoteCounts = await tx.nameGameVote.groupBy({
      by: ['participantId'],
      where: {
        name: { roundId },
      },
      _count: { id: true },
    });

    const completedParticipants = participantVoteCounts.filter(
      (p) => p._count.id >= totalNames
    ).length;

    const roundComplete = completedParticipants >= 2;

    return { myVoteCount, totalNames, roundComplete };
  }, { isolationLevel: 'Serializable' });

  const realtime = getRealtimeService();

  if (txResult.roundComplete) {
    // Round is complete - compute results and broadcast
    const results = await computeRoundResults(roundId, participantId);

    if (realtime) {
      const completeMessage: NameRoundCompleteMessage = {
        type: 'name_round_complete',
        roundId,
        results,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'nameRoundComplete',
        arguments: [completeMessage],
      });
    }

    return { allVoted: true, results };
  } else {
    // Round not complete - broadcast vote progress
    if (realtime) {
      const progressMessage: NameVoteSubmittedMessage = {
        type: 'name_vote_submitted',
        roundId,
        participantId,
        namesVotedCount: txResult.myVoteCount,
        totalNames: txResult.totalNames,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'nameVoteSubmitted',
        arguments: [progressMessage],
      });
    }

    return { allVoted: false };
  }
}

// ============================================================
// Results
// ============================================================

/**
 * Compute round results after both participants finish voting
 *
 * Categories:
 * - matches: Both voted 'love'
 * - nearMisses: One voted 'love', other voted 'maybe'
 * - worthDiscussing: Both voted 'maybe'
 */
async function computeRoundResults(
  roundId: string,
  requestingParticipantId: string
): Promise<NameGameResults> {
  const roundData = await getRoundResults(roundId);

  const matches: GeneratedName[] = [];
  const nearMisses: GeneratedName[] = [];
  const worthDiscussing: GeneratedName[] = [];
  const myVotes: Record<string, NameVoteChoice> = {};
  const partnerVotes: Record<string, NameVoteChoice> = {};

  for (const entry of roundData) {
    const myVote = entry.votes.find((v) => v.participantId === requestingParticipantId);
    const partnerVote = entry.votes.find((v) => v.participantId !== requestingParticipantId);

    if (myVote) {
      myVotes[entry.name.id] = myVote.choice;
    }
    if (partnerVote) {
      partnerVotes[entry.name.id] = partnerVote.choice;
    }

    if (!myVote || !partnerVote) continue;

    const choices = [myVote.choice, partnerVote.choice];

    if (choices[0] === 'love' && choices[1] === 'love') {
      matches.push(entry.name);
    } else if (
      (choices[0] === 'love' && choices[1] === 'maybe') ||
      (choices[0] === 'maybe' && choices[1] === 'love')
    ) {
      nearMisses.push(entry.name);
    } else if (choices[0] === 'maybe' && choices[1] === 'maybe') {
      worthDiscussing.push(entry.name);
    }
  }

  return {
    matches,
    nearMisses,
    worthDiscussing,
    myVotes,
    partnerVotes,
  };
}

// ============================================================
// Matches
// ============================================================

/**
 * Get accumulated matches across all rounds for an envelope
 * Returns names where both participants voted 'love'
 */
export async function getAccumulatedMatches(
  envelopeId: string
): Promise<GeneratedName[]> {
  return getAccumulatedMatchesQuery(envelopeId);
}
