import {
  getQuestionsByEnvelopeId,
  getQuestionById,
  getAnswersForEnvelope,
  createAnswer,
  countAnswersForEnvelope,
} from '../db/queries/trivia.js';
import { updateEnvelopeStatus } from '../db/queries/envelopes.js';
import type {
  TriviaOption,
  TriviaEnvelopeResponse,
  TriviaQuestionState,
  TriviaAnswerResponse,
} from 'shared';

/**
 * Trivia service
 * Business logic for solo trivia activity (no SignalR, no partner sync)
 */

/**
 * Get current state of all trivia questions for an envelope
 * Returns per-question state, current question index, and overall completion
 */
export async function getEnvelopeState(
  envelopeId: string,
  participantId: string
): Promise<TriviaEnvelopeResponse | null> {
  const questions = await getQuestionsByEnvelopeId(envelopeId);
  if (questions.length === 0) {
    return null;
  }

  // Get all answers for this participant in one query
  const answers = await getAnswersForEnvelope(envelopeId, participantId);
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const questionStates: TriviaQuestionState[] = [];
  let currentQuestionIndex = questions.length - 1; // Default to last if all done
  let foundUnanswered = false;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]!;
    const answer = answerMap.get(question.id);

    questionStates.push({
      question,
      selectedIndex: answer?.selectedIndex ?? null,
      isCorrect: answer?.isCorrect ?? null,
      answered: answer !== undefined,
    });

    // First unanswered question is the current one
    if (!foundUnanswered && !answer) {
      currentQuestionIndex = i;
      foundUnanswered = true;
    }
  }

  const allComplete = !foundUnanswered;

  return {
    questions: questionStates,
    currentQuestionIndex,
    allComplete,
  };
}

/**
 * Submit an answer for a trivia question
 * Validates question is assigned to envelope, checks correctness, records answer.
 * Marks envelope as completed when all questions are answered.
 */
export async function submitAnswer(
  envelopeId: string,
  questionId: string,
  participantId: string,
  selectedIndex: number
): Promise<TriviaAnswerResponse> {
  // Validate the question exists
  const question = await getQuestionById(questionId);
  if (!question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  // Validate the question is assigned to this envelope
  const assignedQuestions = await getQuestionsByEnvelopeId(envelopeId);
  const isAssigned = assignedQuestions.some((q) => q.id === questionId);
  if (!isAssigned) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  // Determine correctness
  const options = question.options as TriviaOption[];
  const correctIndex = options.findIndex((o) => o.isCorrect);
  const isCorrect = selectedIndex === correctIndex;

  // Create the answer (unique constraint prevents duplicates)
  try {
    await createAnswer(envelopeId, questionId, participantId, selectedIndex, isCorrect);
  } catch (error) {
    // Prisma unique constraint violation - already answered
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      throw new Error('ALREADY_ANSWERED');
    }
    throw error;
  }

  // Check if all questions are now answered
  const totalQuestions = assignedQuestions.length;
  const answerCount = await countAnswersForEnvelope(envelopeId, participantId);
  const isLastQuestion = answerCount >= totalQuestions;
  const envelopeComplete = isLastQuestion;

  if (envelopeComplete) {
    await updateEnvelopeStatus(envelopeId, 'completed');
  }

  return {
    isCorrect,
    correctIndex,
    explanation: question.explanation,
    isLastQuestion,
    envelopeComplete,
  };
}
