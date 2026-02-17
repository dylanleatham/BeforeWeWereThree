import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type {
  LetterPrompt as PrismaLetterPrompt,
  Letter as PrismaLetter,
} from '@prisma/client';
import type {
  LetterPrompt,
  Letter,
  CreateLetterPromptRequest,
  UpdateLetterPromptRequest,
} from 'shared';

/**
 * Database queries for Letter prompts and content
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma LetterPrompt to API LetterPrompt
 * Converts Date objects to ISO strings for transport
 */
function toApiPrompt(prompt: PrismaLetterPrompt): LetterPrompt {
  return {
    id: prompt.id,
    envelopeId: prompt.envelopeId,
    prompt: prompt.prompt,
    createdAt: prompt.createdAt.toISOString(),
  };
}

/**
 * Transform Prisma Letter to API Letter
 * Converts Date objects to ISO strings for transport
 */
function toApiLetter(letter: PrismaLetter): Letter {
  return {
    id: letter.id,
    promptId: letter.promptId,
    participantId: letter.participantId,
    content: letter.content,
    photoUrl: letter.photoUrl,
    submittedAt: letter.submittedAt?.toISOString() ?? null,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
  };
}

// ============================================================
// Prompt Queries
// ============================================================

/**
 * Get letter prompt by envelope ID
 */
export async function getPromptByEnvelopeId(envelopeId: string): Promise<LetterPrompt | null> {
  const prompt = await db.letterPrompt.findUnique({
    where: { envelopeId },
  });
  return prompt ? toApiPrompt(prompt) : null;
}

/**
 * Get letter prompt by prompt ID
 */
export async function getPromptById(promptId: string): Promise<LetterPrompt | null> {
  const prompt = await db.letterPrompt.findUnique({
    where: { id: promptId },
  });
  return prompt ? toApiPrompt(prompt) : null;
}

/**
 * Create new letter prompt (admin only)
 */
export async function createPrompt(data: CreateLetterPromptRequest): Promise<LetterPrompt> {
  const prompt = await db.letterPrompt.create({
    data: {
      envelopeId: data.envelopeId,
      prompt: data.prompt,
    },
  });
  return toApiPrompt(prompt);
}

/**
 * Update letter prompt (admin only)
 */
export async function updatePrompt(
  id: string,
  data: UpdateLetterPromptRequest
): Promise<LetterPrompt | null> {
  try {
    const prompt = await db.letterPrompt.update({
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
 * Delete letter prompt (admin only)
 * Cascades to delete associated letters
 */
export async function deletePrompt(id: string): Promise<boolean> {
  try {
    await db.letterPrompt.delete({
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
// Letter Queries
// ============================================================

/**
 * Get letter for a specific participant on a prompt
 */
export async function getLetterForParticipant(
  promptId: string,
  participantId: string
): Promise<Letter | null> {
  const letter = await db.letter.findUnique({
    where: {
      promptId_participantId: {
        promptId,
        participantId,
      },
    },
  });
  return letter ? toApiLetter(letter) : null;
}

/**
 * Get all letters for a prompt
 */
export async function getLettersForPrompt(promptId: string): Promise<Letter[]> {
  const letters = await db.letter.findMany({
    where: { promptId },
  });
  return letters.map(toApiLetter);
}

/**
 * Get all submitted letters for a prompt
 * Only returns letters where submittedAt is set
 */
export async function getSubmittedLettersForPrompt(promptId: string): Promise<Letter[]> {
  const letters = await db.letter.findMany({
    where: {
      promptId,
      submittedAt: { not: null },
    },
  });
  return letters.map(toApiLetter);
}

/**
 * Count submitted letters for a prompt
 */
export async function countSubmittedLetters(promptId: string): Promise<number> {
  return db.letter.count({
    where: {
      promptId,
      submittedAt: { not: null },
    },
  });
}

/**
 * Create letter for a participant
 */
export async function createLetter(data: {
  promptId: string;
  participantId: string;
  content?: string;
  photoUrl?: string | null;
}): Promise<Letter> {
  const letter = await db.letter.create({
    data: {
      promptId: data.promptId,
      participantId: data.participantId,
      content: data.content ?? '',
      photoUrl: data.photoUrl ?? null,
    },
  });
  return toApiLetter(letter);
}

/**
 * Update letter content and/or photo
 */
export async function updateLetter(
  id: string,
  data: { content?: string; photoUrl?: string | null }
): Promise<Letter | null> {
  try {
    const letter = await db.letter.update({
      where: { id },
      data,
    });
    return toApiLetter(letter);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Submit letter (sets submittedAt timestamp)
 */
export async function submitLetter(id: string): Promise<Letter | null> {
  try {
    const letter = await db.letter.update({
      where: { id },
      data: {
        submittedAt: new Date(),
      },
    });
    return toApiLetter(letter);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Create or update letter for a participant (upsert pattern for auto-save)
 * If letter exists, update it. If not, create it.
 */
export async function createOrUpdateLetter(
  promptId: string,
  participantId: string,
  data: { content?: string; photoUrl?: string | null }
): Promise<Letter> {
  const letter = await db.letter.upsert({
    where: {
      promptId_participantId: {
        promptId,
        participantId,
      },
    },
    update: {
      content: data.content,
      photoUrl: data.photoUrl,
    },
    create: {
      promptId,
      participantId,
      content: data.content ?? '',
      photoUrl: data.photoUrl ?? null,
    },
  });
  return toApiLetter(letter);
}
