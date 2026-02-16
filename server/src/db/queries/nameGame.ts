import { db } from '../connection.js';
import type {
  NameGameRound as PrismaNameGameRound,
  NameGameName as PrismaNameGameName,
  NameGameVote as PrismaNameGameVote,
} from '@prisma/client';
import type {
  GeneratedName,
  NameVoteChoice,
  NameVoteState,
  NameGameRoundResponse,
} from 'shared';

/**
 * Database queries for Baby Name Game
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

// ============================================================
// Transform helpers
// ============================================================

/**
 * Transform Prisma NameGameName to API GeneratedName
 */
function toApiName(name: PrismaNameGameName): GeneratedName {
  return {
    id: name.id,
    roundId: name.roundId,
    name: name.name,
    origin: name.origin,
    meaning: name.meaning,
    notes: name.notes,
    sortOrder: name.sortOrder,
  };
}

// ============================================================
// Round Queries
// ============================================================

/**
 * Get the next round number for an envelope
 * Returns 1 if no rounds exist
 */
export async function getNextRoundNumber(envelopeId: string): Promise<number> {
  const lastRound = await db.nameGameRound.findFirst({
    where: { envelopeId },
    orderBy: { roundNumber: 'desc' },
    select: { roundNumber: true },
  });
  return lastRound ? lastRound.roundNumber + 1 : 1;
}

/**
 * Create a new NameGameRound
 * @param status - 'generating' while AI call is in progress, 'ready' when names are saved
 */
export async function createRound(
  envelopeId: string,
  roundNumber: number,
  guidance?: string,
  status: string = 'ready'
): Promise<PrismaNameGameRound> {
  return db.nameGameRound.create({
    data: {
      envelopeId,
      roundNumber,
      guidance: guidance ?? null,
      status,
    },
  });
}

/**
 * Update a round's status (e.g., from 'generating' to 'ready')
 */
export async function updateRoundStatus(
  roundId: string,
  status: string
): Promise<void> {
  await db.nameGameRound.update({
    where: { id: roundId },
    data: { status },
  });
}

// ============================================================
// Name Queries
// ============================================================

/**
 * Bulk create NameGameName records from AI response
 * Each name gets a sortOrder (0-indexed)
 */
export async function createNames(
  roundId: string,
  names: Array<{ name: string; origin: string[]; meaning: string; notes: string }>
): Promise<GeneratedName[]> {
  const created = await db.$transaction(
    names.map((n, i) =>
      db.nameGameName.create({
        data: {
          roundId,
          name: n.name,
          origin: n.origin,
          meaning: n.meaning,
          notes: n.notes,
          sortOrder: i,
        },
      })
    )
  );

  return created.map(toApiName);
}

/**
 * Get all name strings from all rounds for this envelope
 * Used to build exclusion list for Anthropic API
 */
export async function getExcludedNames(envelopeId: string): Promise<string[]> {
  const names = await db.nameGameName.findMany({
    where: {
      round: { envelopeId },
    },
    select: { name: true },
  });
  return names.map((n) => n.name);
}

// ============================================================
// Vote Queries
// ============================================================

/**
 * Create a NameGameVote
 * Uses create (not upsert) — the @@unique constraint prevents double votes
 */
export async function submitVote(
  nameId: string,
  participantId: string,
  choice: NameVoteChoice
): Promise<PrismaNameGameVote> {
  return db.nameGameVote.create({
    data: {
      nameId,
      participantId,
      choice,
    },
  });
}

/**
 * Count how many distinct participants have voted on ALL names in a round
 * Returns 0, 1, or 2
 */
export async function getVoteCountForRound(roundId: string): Promise<number> {
  // Get total names in this round
  const totalNames = await db.nameGameName.count({
    where: { roundId },
  });

  if (totalNames === 0) return 0;

  // Get all votes for names in this round, grouped by participant
  const votes = await db.nameGameVote.groupBy({
    by: ['participantId'],
    where: {
      name: { roundId },
    },
    _count: { id: true },
  });

  // Count participants who voted on ALL names
  return votes.filter((v) => v._count.id >= totalNames).length;
}

/**
 * Get the number of names a participant has voted on in a round
 */
export async function getParticipantVoteCount(
  roundId: string,
  participantId: string
): Promise<number> {
  return db.nameGameVote.count({
    where: {
      participantId,
      name: { roundId },
    },
  });
}

// ============================================================
// State Queries
// ============================================================

/**
 * Get current round with names and vote states for a participant
 * Returns null if no rounds exist or latest round is still generating
 */
export async function getNameGameState(
  envelopeId: string,
  participantId: string
): Promise<NameGameRoundResponse | null> {
  // Get the latest ready round (skip rounds still being generated)
  const round = await db.nameGameRound.findFirst({
    where: { envelopeId, status: 'ready' },
    orderBy: { roundNumber: 'desc' },
    include: {
      names: {
        orderBy: { sortOrder: 'asc' },
        include: {
          votes: true,
        },
      },
    },
  });

  if (!round) return null;

  // Build NameVoteState for each name
  const names: NameVoteState[] = round.names.map((name) => {
    const myVoteRecord = name.votes.find((v) => v.participantId === participantId);
    const partnerVoted = name.votes.some((v) => v.participantId !== participantId);

    return {
      name: toApiName(name),
      myVote: (myVoteRecord?.choice as NameVoteChoice) ?? null,
      partnerVoted,
    };
  });

  // Check if all names have been voted on by both participants
  const allVoted = names.length > 0 && names.every((n) => n.myVote !== null && n.partnerVoted);

  return {
    roundId: round.id,
    roundNumber: round.roundNumber,
    names,
    allVoted,
  };
}

/**
 * Get all names with all votes for a round
 * Used to compute matches/near-misses/worth-discussing
 */
export async function getRoundResults(roundId: string): Promise<
  Array<{
    name: GeneratedName;
    votes: Array<{ participantId: string; choice: NameVoteChoice }>;
  }>
> {
  const names = await db.nameGameName.findMany({
    where: { roundId },
    orderBy: { sortOrder: 'asc' },
    include: {
      votes: {
        select: {
          participantId: true,
          choice: true,
        },
      },
    },
  });

  return names.map((name) => ({
    name: toApiName(name),
    votes: name.votes.map((v) => ({
      participantId: v.participantId,
      choice: v.choice as NameVoteChoice,
    })),
  }));
}

/**
 * Get all names across all rounds where both participants voted 'love'
 */
export async function getAccumulatedMatches(envelopeId: string): Promise<GeneratedName[]> {
  const names = await db.nameGameName.findMany({
    where: {
      round: { envelopeId },
    },
    include: {
      votes: {
        select: {
          choice: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Filter to names where at least 2 votes are 'love'
  return names
    .filter((name) => {
      const loveVotes = name.votes.filter((v) => v.choice === 'love');
      return loveVotes.length >= 2;
    })
    .map(toApiName);
}

/**
 * Get the total number of ready rounds for an envelope
 */
export async function getRoundCount(envelopeId: string): Promise<number> {
  return db.nameGameRound.count({
    where: { envelopeId, status: 'ready' },
  });
}

/**
 * Get the total number of names in a round
 */
export async function getNameCountForRound(roundId: string): Promise<number> {
  return db.nameGameName.count({
    where: { roundId },
  });
}

/**
 * Look up the envelopeId for a given nameId (via round)
 */
export async function getEnvelopeIdForName(nameId: string): Promise<string | null> {
  const name = await db.nameGameName.findUnique({
    where: { id: nameId },
    select: {
      round: {
        select: { envelopeId: true },
      },
    },
  });
  return name?.round.envelopeId ?? null;
}

/**
 * Get the roundId for a given nameId
 */
export async function getRoundIdForName(nameId: string): Promise<string | null> {
  const name = await db.nameGameName.findUnique({
    where: { id: nameId },
    select: { roundId: true },
  });
  return name?.roundId ?? null;
}

// ============================================================
// Guidance Queries
// ============================================================

/**
 * Count guidance submissions for a specific round
 */
export async function getGuidanceCount(
  envelopeId: string,
  roundNumber: number
): Promise<number> {
  return db.nameGameGuidance.count({
    where: { envelopeId, roundNumber },
  });
}

/**
 * Check if a participant has already submitted guidance for a round
 */
export async function hasSubmittedGuidance(
  envelopeId: string,
  roundNumber: number,
  participantId: string
): Promise<boolean> {
  const record = await db.nameGameGuidance.findUnique({
    where: {
      envelopeId_roundNumber_participantId: {
        envelopeId,
        roundNumber,
        participantId,
      },
    },
  });
  return record !== null;
}

/**
 * Create a guidance submission record
 */
export async function createGuidance(
  envelopeId: string,
  roundNumber: number,
  participantId: string,
  guidance?: string
): Promise<void> {
  await db.nameGameGuidance.create({
    data: {
      envelopeId,
      roundNumber,
      participantId,
      guidance: guidance ?? null,
    },
  });
}

/**
 * Get all guidance texts for a round (for building the Anthropic prompt)
 */
export async function getGuidanceForRound(
  envelopeId: string,
  roundNumber: number
): Promise<Array<{ guidance: string | null; participantId: string }>> {
  return db.nameGameGuidance.findMany({
    where: { envelopeId, roundNumber },
    select: { guidance: true, participantId: true },
  });
}

/**
 * Get pending guidance state for an envelope
 * Checks if there's a round being coordinated (guidance exists but no ready round)
 */
export async function getPendingGuidanceState(
  envelopeId: string,
  participantId: string
): Promise<{ roundNumber: number; myGuidanceSubmitted: boolean; partnerGuidanceSubmitted: boolean } | null> {
  // Get the next round number (after the latest ready round)
  const latestReady = await db.nameGameRound.findFirst({
    where: { envelopeId, status: 'ready' },
    orderBy: { roundNumber: 'desc' },
    select: { roundNumber: true },
  });

  const nextRound = latestReady ? latestReady.roundNumber + 1 : 1;

  // Check if a generating round exists for this number
  const generatingRound = await db.nameGameRound.findFirst({
    where: { envelopeId, roundNumber: nextRound, status: 'generating' },
  });

  // Check for guidance submissions
  const guidanceRecords = await db.nameGameGuidance.findMany({
    where: { envelopeId, roundNumber: nextRound },
    select: { participantId: true },
  });

  if (guidanceRecords.length === 0 && !generatingRound) return null;

  const myGuidanceSubmitted = guidanceRecords.some((g) => g.participantId === participantId);
  const partnerGuidanceSubmitted = guidanceRecords.some((g) => g.participantId !== participantId);

  return {
    roundNumber: nextRound,
    myGuidanceSubmitted,
    partnerGuidanceSubmitted,
  };
}

/**
 * Check if a ready round already exists for a given round number
 */
export async function getReadyRound(
  envelopeId: string,
  roundNumber: number
): Promise<PrismaNameGameRound | null> {
  return db.nameGameRound.findFirst({
    where: { envelopeId, roundNumber, status: 'ready' },
  });
}
