import { db } from '../db/connection.js';
import { getRealtimeService } from './realtime.js';
import { generateNames } from './anthropic.js';
import {
  getNameGameState as getNameGameStateQuery,
  getExcludedNames,
  createNames,
  updateRoundStatus,
  getRoundResults,
  getAccumulatedMatches as getAccumulatedMatchesQuery,
  getRoundCount,
  getRoundIdForName,
  getGuidanceForRound,
  getPendingGuidanceState,
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
  SubmitGuidanceResponse,
  NameRoundGeneratedMessage,
  NameGuidanceSubmittedMessage,
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
 * Includes pendingGuidance if guidance submissions exist for an ungenerated round
 */
export async function getNameGameState(
  envelopeId: string,
  participantId: string
): Promise<NameGameStateResponse> {
  const currentRound = await getNameGameStateQuery(envelopeId, participantId);
  const allMatches = await getAccumulatedMatchesQuery(envelopeId);
  const roundCount = await getRoundCount(envelopeId);
  const pendingGuidance = await getPendingGuidanceState(envelopeId, participantId);

  return {
    currentRound,
    allMatches,
    roundCount,
    pendingGuidance: pendingGuidance ?? undefined,
  };
}

// ============================================================
// Coordinated Round Generation
// ============================================================

/**
 * Submit guidance/readiness for the next round.
 *
 * Coordinates between two participants:
 * - Round 1: First submission triggers generation immediately (no guidance needed)
 * - Round 2+: Both participants must submit guidance; generation triggers on the second submission
 *
 * Uses Serializable isolation to prevent race conditions on the count-then-create pattern.
 */
export async function submitGuidance(
  envelopeId: string,
  participantId: string,
  guidance?: string
): Promise<SubmitGuidanceResponse> {
  // Phase 1: Coordination transaction (Serializable to prevent races)
  // All queries use `tx` (not the module-level `db`) so they run within the transaction scope.
  const txResult = await db.$transaction(async (tx) => {
    // Get next round number
    const lastRound = await tx.nameGameRound.findFirst({
      where: { envelopeId },
      orderBy: { roundNumber: 'desc' },
      select: { roundNumber: true },
    });
    const nextRound = lastRound ? lastRound.roundNumber + 1 : 1;

    // Idempotent: if round already exists and is ready, return it
    const existingReady = await tx.nameGameRound.findFirst({
      where: { envelopeId, roundNumber: nextRound, status: 'ready' },
    });
    if (existingReady) {
      return { action: 'already_ready' as const, roundNumber: nextRound };
    }

    // Idempotent: if this participant already submitted guidance, return current state
    const existingGuidance = await tx.nameGameGuidance.findUnique({
      where: {
        envelopeId_roundNumber_participantId: {
          envelopeId,
          roundNumber: nextRound,
          participantId,
        },
      },
    });
    if (existingGuidance) {
      return { action: 'already_submitted' as const, roundNumber: nextRound };
    }

    // Create guidance record
    await tx.nameGameGuidance.create({
      data: {
        envelopeId,
        roundNumber: nextRound,
        participantId,
        guidance: guidance ?? null,
      },
    });

    // Count total guidance submissions (including the one we just created)
    const guidanceCount = await tx.nameGameGuidance.count({
      where: { envelopeId, roundNumber: nextRound },
    });

    // Determine if ready to generate:
    // Round 1: ready after 1 submission
    // Round 2+: ready after 2 submissions
    const readyToGenerate = nextRound === 1 ? guidanceCount >= 1 : guidanceCount >= 2;

    if (!readyToGenerate) {
      return { action: 'waiting' as const, roundNumber: nextRound };
    }

    // Create round record with 'generating' status to claim the generation slot
    const round = await tx.nameGameRound.create({
      data: {
        envelopeId,
        roundNumber: nextRound,
        guidance: null,
        status: 'generating',
      },
    });

    return {
      action: 'generate' as const,
      roundNumber: nextRound,
      roundId: round.id,
    };
  }, { isolationLevel: 'Serializable' });

  // Phase 2: Handle results outside transaction

  if (txResult.action === 'already_ready') {
    // Round already generated — load and return it
    const state = await getNameGameStateQuery(envelopeId, participantId);
    if (state) {
      return { status: 'round_generated', round: state };
    }
    return { status: 'waiting_for_partner', roundNumber: txResult.roundNumber };
  }

  if (txResult.action === 'already_submitted' || txResult.action === 'waiting') {
    // Broadcast to partner that we submitted guidance
    const realtime = getRealtimeService();
    if (realtime && txResult.action === 'waiting') {
      const guidanceMsg: NameGuidanceSubmittedMessage = {
        type: 'name_guidance_submitted',
        roundNumber: txResult.roundNumber,
        participantId,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'nameGuidanceSubmitted',
        arguments: [guidanceMsg],
      });
    }
    return { status: 'waiting_for_partner', roundNumber: txResult.roundNumber };
  }

  // Phase 3: Generate names (outside transaction — don't hold locks during slow API call)
  const { roundId, roundNumber } = txResult;

  try {
    const excludeNames = await getExcludedNames(envelopeId);

    // Gather guidance texts for the prompt
    const guidanceRecords = await getGuidanceForRound(envelopeId, roundNumber);
    const participantGuidance = guidanceRecords
      .filter((g) => g.guidance !== null && g.guidance.trim() !== '')
      .map((g) => ({ guidance: g.guidance! }));

    logger.info('Generating name game round', {
      envelopeId,
      roundNumber,
      excludeCount: excludeNames.length,
      guidanceCount: participantGuidance.length,
    });

    const aiResponse = await generateNames({
      count: 10,
      excludeNames,
      participantGuidance: participantGuidance.length > 0 ? participantGuidance : undefined,
    });

    // Save names and mark round as ready
    const names = await createNames(roundId, aiResponse.names);
    await updateRoundStatus(roundId, 'ready');

    logger.info('Name game round created', {
      roundId,
      roundNumber,
      nameCount: names.length,
    });

    const roundResponse: NameGameRoundResponse = {
      roundId,
      roundNumber,
      names: names.map((name) => ({
        name,
        myVote: null,
        partnerVoted: false,
      })),
      allVoted: false,
    };

    // Broadcast to all participants in the activity group
    const realtime = getRealtimeService();
    if (realtime) {
      const generatedMessage: NameRoundGeneratedMessage = {
        type: 'name_round_generated',
        round: roundResponse,
      };
      await realtime.sendToGroup(`activity:${envelopeId}`, {
        target: 'nameRoundGenerated',
        arguments: [generatedMessage],
      });
    }

    return { status: 'round_generated', round: roundResponse };
  } catch (err) {
    // Generation failed — clean up the 'generating' round so it can be retried
    logger.error('Name generation failed, cleaning up round', { roundId, error: err });
    try {
      await db.nameGameRound.delete({ where: { id: roundId } });
      // Also clean up guidance so participants can resubmit
      await db.nameGameGuidance.deleteMany({
        where: { envelopeId, roundNumber },
      });
    } catch (cleanupErr) {
      logger.error('Failed to clean up after generation failure', { error: cleanupErr });
    }
    throw err;
  }
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
