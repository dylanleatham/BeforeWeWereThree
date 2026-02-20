import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type { TriviaQuestion as PrismaTriviaQuestion } from '@prisma/client';
import type {
  TriviaQuestion,
  TriviaOption,
  CreateTriviaQuestionRequest,
  UpdateTriviaQuestionRequest,
} from 'shared';

/**
 * Database queries for Trivia questions, envelope assignments, and answers
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma TriviaQuestion to API TriviaQuestion
 * Casts Prisma Json field to typed TriviaOption array
 */
function toApiQuestion(question: PrismaTriviaQuestion): TriviaQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    options: question.options as unknown as TriviaOption[],
    explanation: question.explanation,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

// ============================================================
// Question Queries (Content Library)
// ============================================================

/**
 * Get all trivia questions (admin content library)
 */
export async function getAllQuestions(): Promise<TriviaQuestion[]> {
  const questions = await db.triviaQuestion.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return questions.map(toApiQuestion);
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(id: string): Promise<TriviaQuestion | null> {
  const question = await db.triviaQuestion.findUnique({
    where: { id },
  });
  return question ? toApiQuestion(question) : null;
}

/**
 * Create a new trivia question (admin only)
 */
export async function createQuestion(data: CreateTriviaQuestionRequest): Promise<TriviaQuestion> {
  const question = await db.triviaQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options as unknown as Prisma.InputJsonValue,
      explanation: data.explanation ?? null,
    },
  });
  return toApiQuestion(question);
}

/**
 * Update a trivia question (admin only)
 */
export async function updateQuestion(
  id: string,
  data: UpdateTriviaQuestionRequest
): Promise<TriviaQuestion | null> {
  try {
    const updateData: Prisma.TriviaQuestionUpdateInput = {};
    if (data.questionText !== undefined) updateData.questionText = data.questionText;
    if (data.options !== undefined) updateData.options = data.options as unknown as Prisma.InputJsonValue;
    if (data.explanation !== undefined) updateData.explanation = data.explanation ?? null;

    const question = await db.triviaQuestion.update({
      where: { id },
      data: updateData,
    });
    return toApiQuestion(question);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a trivia question (admin only)
 * Cascades to delete envelope assignments
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  try {
    await db.triviaQuestion.delete({
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
// Envelope Assignment Queries
// ============================================================

/**
 * Get all questions assigned to an envelope, ordered by sortOrder
 * Returns flattened TriviaQuestion array (not the join table shape)
 */
export async function getQuestionsByEnvelopeId(envelopeId: string): Promise<TriviaQuestion[]> {
  const assignments = await db.triviaEnvelopeQuestion.findMany({
    where: { envelopeId },
    include: { question: true },
    orderBy: { sortOrder: 'asc' },
  });
  return assignments.map((a) => toApiQuestion(a.question));
}

/**
 * Assign questions to an envelope (admin only)
 * Replaces all existing assignments. Array order = sortOrder.
 * Uses transaction for atomicity.
 */
export async function assignQuestionsToEnvelope(
  envelopeId: string,
  questionIds: string[]
): Promise<number> {
  await db.$transaction(async (tx) => {
    // Delete all existing assignments for this envelope
    await tx.triviaEnvelopeQuestion.deleteMany({
      where: { envelopeId },
    });

    // Create new assignments with sortOrder = array index
    for (let i = 0; i < questionIds.length; i++) {
      await tx.triviaEnvelopeQuestion.create({
        data: {
          envelopeId,
          questionId: questionIds[i]!,
          sortOrder: i,
        },
      });
    }
  });

  return questionIds.length;
}

/**
 * Reorder questions within an envelope (admin only)
 * Reuses assign logic since it replaces all assignments
 */
export async function reorderEnvelopeQuestions(
  envelopeId: string,
  questionIds: string[]
): Promise<number> {
  return assignQuestionsToEnvelope(envelopeId, questionIds);
}

// ============================================================
// Answer Queries
// ============================================================

/**
 * Get all answers for a participant in an envelope
 */
export async function getAnswersForEnvelope(
  envelopeId: string,
  participantId: string
): Promise<Array<{ questionId: string; selectedIndex: number; isCorrect: boolean }>> {
  const answers = await db.triviaAnswer.findMany({
    where: { envelopeId, participantId },
  });
  return answers.map((a) => ({
    questionId: a.questionId,
    selectedIndex: a.selectedIndex,
    isCorrect: a.isCorrect,
  }));
}

/**
 * Create a trivia answer
 */
export async function createAnswer(
  envelopeId: string,
  questionId: string,
  participantId: string,
  selectedIndex: number,
  isCorrect: boolean
): Promise<{ id: string; questionId: string; selectedIndex: number; isCorrect: boolean }> {
  const answer = await db.triviaAnswer.create({
    data: {
      envelopeId,
      questionId,
      participantId,
      selectedIndex,
      isCorrect,
    },
  });
  return {
    id: answer.id,
    questionId: answer.questionId,
    selectedIndex: answer.selectedIndex,
    isCorrect: answer.isCorrect,
  };
}

/**
 * Count answers for a participant in an envelope
 */
export async function countAnswersForEnvelope(
  envelopeId: string,
  participantId: string
): Promise<number> {
  return db.triviaAnswer.count({
    where: { envelopeId, participantId },
  });
}
