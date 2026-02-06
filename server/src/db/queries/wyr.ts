import { db } from '../connection.js';
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
 * Get WYR prompt by envelope ID
 */
export async function getPromptByEnvelopeId(envelopeId: string): Promise<WYRPrompt | null> {
  const prompt = await db.wyrPrompt.findUnique({
    where: { envelopeId },
  });
  return prompt ? toApiPrompt(prompt) : null;
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
 * Create new WYR prompt (admin only)
 */
export async function createPrompt(data: CreateWYRPromptRequest): Promise<WYRPrompt> {
  const prompt = await db.wyrPrompt.create({
    data: {
      envelopeId: data.envelopeId,
      optionA: data.optionA,
      optionB: data.optionB,
    },
  });
  return toApiPrompt(prompt);
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
  } catch {
    // Prisma throws if record not found
    return null;
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
  } catch {
    return false;
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
