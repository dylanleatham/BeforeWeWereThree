import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type { WyrPrompt as PrismaWyrPrompt, WyrVote as PrismaWyrVote } from '@prisma/client';
import type {
  WYRPrompt,
  WYRChoice,
  CreateWYRPromptRequest,
  UpdateWYRPromptRequest,
} from 'shared';

/**
 * Database queries for Would You Rather prompts and votes
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma WyrPrompt to API WYRPrompt
 * Converts Date objects to ISO strings for transport
 */
function toApiPrompt(prompt: PrismaWyrPrompt): WYRPrompt {
  return {
    id: prompt.id,
    envelopeId: prompt.envelopeId,
    optionA: prompt.optionA,
    optionB: prompt.optionB,
    sortOrder: prompt.sortOrder,
    createdAt: prompt.createdAt.toISOString(),
  };
}

/**
 * Vote with choice typed
 */
export interface WYRVote {
  id: string;
  promptId: string;
  participantId: string;
  choice: WYRChoice;
  createdAt: string;
}

/**
 * Transform Prisma WyrVote to typed WYRVote
 */
function toApiVote(vote: PrismaWyrVote): WYRVote {
  return {
    id: vote.id,
    promptId: vote.promptId,
    participantId: vote.participantId,
    choice: vote.choice as WYRChoice,
    createdAt: vote.createdAt.toISOString(),
  };
}

// ============================================================
// Prompt Queries
// ============================================================

/**
 * Get all WYR prompts for an envelope, ordered by sortOrder
 */
export async function getPromptsByEnvelopeId(envelopeId: string): Promise<WYRPrompt[]> {
  const prompts = await db.wyrPrompt.findMany({
    where: { envelopeId },
    orderBy: { sortOrder: 'asc' },
  });
  return prompts.map(toApiPrompt);
}

/**
 * Get WYR prompt by prompt ID
 */
export async function getPromptById(promptId: string): Promise<WYRPrompt | null> {
  const prompt = await db.wyrPrompt.findUnique({
    where: { id: promptId },
  });
  return prompt ? toApiPrompt(prompt) : null;
}

/**
 * Get the next available sort order for an envelope.
 * Accepts an optional transaction client for use inside transactions.
 */
export async function getNextSortOrder(
  envelopeId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx ?? db;
  const lastPrompt = await client.wyrPrompt.findFirst({
    where: { envelopeId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return lastPrompt ? lastPrompt.sortOrder + 1 : 0;
}

/**
 * Create new WYR prompt (admin only)
 * Uses a transaction to prevent sort order race conditions
 */
export async function createPrompt(data: CreateWYRPromptRequest): Promise<WYRPrompt> {
  if (data.sortOrder !== undefined) {
    const prompt = await db.wyrPrompt.create({
      data: {
        envelopeId: data.envelopeId,
        optionA: data.optionA,
        optionB: data.optionB,
        sortOrder: data.sortOrder,
      },
    });
    return toApiPrompt(prompt);
  }

  const prompt = await db.$transaction(async (tx) => {
    const sortOrder = await getNextSortOrder(data.envelopeId, tx);
    return tx.wyrPrompt.create({
      data: {
        envelopeId: data.envelopeId,
        optionA: data.optionA,
        optionB: data.optionB,
        sortOrder,
      },
    });
  });
  return toApiPrompt(prompt);
}

/**
 * Bulk create WYR prompts for an envelope (admin only)
 * Auto-assigns sortOrder starting from next available.
 * Sort order calculation is inside the transaction to prevent race conditions.
 */
export async function createPromptsBulk(
  envelopeId: string,
  prompts: Array<{ optionA: string; optionB: string }>
): Promise<WYRPrompt[]> {
  const created = await db.$transaction(async (tx) => {
    const startOrder = await getNextSortOrder(envelopeId, tx);
    const results: PrismaWyrPrompt[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i]!;
      const prompt = await tx.wyrPrompt.create({
        data: {
          envelopeId,
          optionA: p.optionA,
          optionB: p.optionB,
          sortOrder: startOrder + i,
        },
      });
      results.push(prompt);
    }
    return results;
  });

  return created.map(toApiPrompt);
}

/**
 * Update WYR prompt (admin only)
 */
export async function updatePrompt(
  id: string,
  data: UpdateWYRPromptRequest
): Promise<WYRPrompt | null> {
  try {
    const prompt = await db.wyrPrompt.update({
      where: { id },
      data,
    });
    return toApiPrompt(prompt);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete WYR prompt (admin only)
 * Cascades to delete associated votes
 */
export async function deletePrompt(id: string): Promise<boolean> {
  try {
    await db.wyrPrompt.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

// ============================================================
// Vote Queries
// ============================================================

/**
 * Get vote for a specific participant on a prompt
 */
export async function getVoteForParticipant(
  promptId: string,
  participantId: string
): Promise<WYRVote | null> {
  const vote = await db.wyrVote.findUnique({
    where: {
      promptId_participantId: {
        promptId,
        participantId,
      },
    },
  });
  return vote ? toApiVote(vote) : null;
}

/**
 * Get all votes for a prompt
 */
export async function getVotesForPrompt(promptId: string): Promise<WYRVote[]> {
  const votes = await db.wyrVote.findMany({
    where: { promptId },
  });
  return votes.map(toApiVote);
}

/**
 * Create vote (uses transaction in service layer for race safety)
 */
export async function createVote(
  promptId: string,
  participantId: string,
  choice: WYRChoice
): Promise<WYRVote> {
  const vote = await db.wyrVote.create({
    data: {
      promptId,
      participantId,
      choice,
    },
  });
  return toApiVote(vote);
}

/**
 * Count votes for a prompt
 */
export async function countVotesForPrompt(promptId: string): Promise<number> {
  return db.wyrVote.count({
    where: { promptId },
  });
}

/**
 * Get all votes for multiple prompts in a single query
 * Returns votes indexed by promptId for efficient lookup
 */
export async function getVotesForPromptIds(
  promptIds: string[]
): Promise<Map<string, WYRVote[]>> {
  const votes = await db.wyrVote.findMany({
    where: { promptId: { in: promptIds } },
  });

  const votesByPrompt = new Map<string, WYRVote[]>();
  for (const promptId of promptIds) {
    votesByPrompt.set(promptId, []);
  }
  for (const vote of votes) {
    votesByPrompt.get(vote.promptId)!.push(toApiVote(vote));
  }
  return votesByPrompt;
}
