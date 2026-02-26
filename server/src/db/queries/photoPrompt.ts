import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type {
  PhotoPrompt as PrismaPhotoPrompt,
  PhotoPromptResponse as PrismaPhotoPromptResponse,
} from '@prisma/client';
import type {
  PhotoPrompt,
  PhotoPromptResponse,
  CreatePhotoPromptRequest,
  UpdatePhotoPromptRequest,
} from 'shared';

/**
 * Database queries for Photo Prompt activities
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma PhotoPrompt to API PhotoPrompt
 */
function toApiPrompt(prompt: PrismaPhotoPrompt): PhotoPrompt {
  return {
    id: prompt.id,
    envelopeId: prompt.envelopeId,
    prompt: prompt.prompt,
    createdAt: prompt.createdAt.toISOString(),
  };
}

/**
 * Transform Prisma PhotoPromptResponse to API PhotoPromptResponse
 */
function toApiResponse(response: PrismaPhotoPromptResponse): PhotoPromptResponse {
  return {
    id: response.id,
    promptId: response.promptId,
    participantId: response.participantId,
    photoUrl: response.photoUrl,
    createdAt: response.createdAt.toISOString(),
  };
}

// ============================================================
// Prompt Queries
// ============================================================

/**
 * Get photo prompt by envelope ID
 */
export async function getPromptByEnvelopeId(envelopeId: string): Promise<PhotoPrompt | null> {
  const prompt = await db.photoPrompt.findUnique({
    where: { envelopeId },
  });
  return prompt ? toApiPrompt(prompt) : null;
}

/**
 * Get photo prompt by prompt ID
 */
export async function getPromptById(promptId: string): Promise<PhotoPrompt | null> {
  const prompt = await db.photoPrompt.findUnique({
    where: { id: promptId },
  });
  return prompt ? toApiPrompt(prompt) : null;
}

/**
 * Create new photo prompt (admin only)
 */
export async function createPrompt(data: CreatePhotoPromptRequest): Promise<PhotoPrompt> {
  const prompt = await db.photoPrompt.create({
    data: {
      envelopeId: data.envelopeId,
      prompt: data.prompt,
    },
  });
  return toApiPrompt(prompt);
}

/**
 * Update photo prompt (admin only)
 */
export async function updatePrompt(
  id: string,
  data: UpdatePhotoPromptRequest
): Promise<PhotoPrompt | null> {
  try {
    const prompt = await db.photoPrompt.update({
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
 * Delete photo prompt (admin only)
 * Cascades to delete associated responses
 */
export async function deletePrompt(id: string): Promise<boolean> {
  try {
    await db.photoPrompt.delete({
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
// Response Queries
// ============================================================

/**
 * Get response for a specific participant on a prompt
 */
export async function getResponseForParticipant(
  promptId: string,
  participantId: string
): Promise<PhotoPromptResponse | null> {
  const response = await db.photoPromptResponse.findUnique({
    where: {
      promptId_participantId: {
        promptId,
        participantId,
      },
    },
  });
  return response ? toApiResponse(response) : null;
}

/**
 * Get all responses for a prompt
 */
export async function getResponsesForPrompt(promptId: string): Promise<PhotoPromptResponse[]> {
  const responses = await db.photoPromptResponse.findMany({
    where: { promptId },
  });
  return responses.map(toApiResponse);
}

/**
 * Create a response for a participant
 */
export async function createResponse(data: {
  promptId: string;
  participantId: string;
  photoUrl: string;
}): Promise<PhotoPromptResponse> {
  const response = await db.photoPromptResponse.create({
    data: {
      promptId: data.promptId,
      participantId: data.participantId,
      photoUrl: data.photoUrl,
    },
  });
  return toApiResponse(response);
}
