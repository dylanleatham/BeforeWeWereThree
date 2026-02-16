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
 */
export async function createRound(
  envelopeId: string,
  roundNumber: number,
  guidance?: string
): Promise<PrismaNameGameRound> {
  return db.nameGameRound.create({
    data: {
      envelopeId,
      roundNumber,
      guidance: guidance ?? null,
    },
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
 * Returns null if no rounds exist
 */
export async function getNameGameState(
  envelopeId: string,
  participantId: string
): Promise<NameGameRoundResponse | null> {
  // Get the latest round
  const round = await db.nameGameRound.findFirst({
    where: { envelopeId },
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
 * Get the total number of rounds for an envelope
 */
export async function getRoundCount(envelopeId: string): Promise<number> {
  return db.nameGameRound.count({
    where: { envelopeId },
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
