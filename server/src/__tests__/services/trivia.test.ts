/**
 * Trivia service tests
 * Tests solo trivia envelope state, answer submission, and envelope completion
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions (trivia)
const mockGetQuestionsByEnvelopeId = jest.fn() as AnyMock;
const mockGetQuestionById = jest.fn() as AnyMock;
const mockGetAnswersForEnvelope = jest.fn() as AnyMock;
const mockCreateAnswer = jest.fn() as AnyMock;
const mockCountAnswersForEnvelope = jest.fn() as AnyMock;

// Mock DB query functions (envelopes)
const mockUpdateEnvelopeStatus = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/trivia.js', () => ({
  getQuestionsByEnvelopeId: mockGetQuestionsByEnvelopeId,
  getQuestionById: mockGetQuestionById,
  getAnswersForEnvelope: mockGetAnswersForEnvelope,
  createAnswer: mockCreateAnswer,
  countAnswersForEnvelope: mockCountAnswersForEnvelope,
}));

jest.unstable_mockModule('../../db/queries/envelopes.js', () => ({
  updateEnvelopeStatus: mockUpdateEnvelopeStatus,
}));

// Import after mocking
const { getEnvelopeState, submitAnswer } = await import('../../services/trivia.js');

// Test fixtures
const QUESTION_1 = {
  id: 'question-1',
  questionText: 'What year were you born?',
  options: [
    { text: '1990', isCorrect: true },
    { text: '2000', isCorrect: false },
  ],
  explanation: 'Because that is the year.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const QUESTION_2 = {
  id: 'question-2',
  questionText: 'What is the capital of France?',
  options: [
    { text: 'London', isCorrect: false },
    { text: 'Paris', isCorrect: true },
    { text: 'Berlin', isCorrect: false },
  ],
  explanation: 'Paris is the capital of France.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const QUESTION_3 = {
  id: 'question-3',
  questionText: 'How many continents are there?',
  options: [
    { text: '5', isCorrect: false },
    { text: '6', isCorrect: false },
    { text: '7', isCorrect: true },
  ],
  explanation: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// Assigned question fixtures (what getQuestionsByEnvelopeId returns)
const ASSIGNED_1 = { id: 'aq-1', envelopeId: 'env-1', questionId: 'question-1', sortOrder: 0, question: QUESTION_1 };
const ASSIGNED_2 = { id: 'aq-2', envelopeId: 'env-1', questionId: 'question-2', sortOrder: 1, question: QUESTION_2 };
const ASSIGNED_3 = { id: 'aq-3', envelopeId: 'env-1', questionId: 'question-3', sortOrder: 2, question: QUESTION_3 };

const PARTICIPANT_ID = 'participant-a';

describe('Trivia Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEnvelopeStatus.mockResolvedValue(null);
  });

  // ================================================================
  // getEnvelopeState
  // ================================================================
  describe('getEnvelopeState', () => {
    it('should return null if no questions exist for envelope', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      expect(result).toBeNull();
    });

    it('should return single question with no answers', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1]);
      mockGetAnswersForEnvelope.mockResolvedValue([]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      expect(result).not.toBeNull();
      expect(result!.questions).toHaveLength(1);
      expect(result!.currentQuestionIndex).toBe(0);
      expect(result!.allComplete).toBe(false);
      expect(result!.questions[0]).toEqual({
        question: QUESTION_1,
        selectedIndex: null,
        isCorrect: null,
        answered: false,
      });
    });

    it('should mark answered questions with their selected index and correctness', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2]);
      mockGetAnswersForEnvelope.mockResolvedValue([
        { questionId: 'question-1', selectedIndex: 0, isCorrect: true },
      ]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      expect(result!.questions).toHaveLength(2);

      // First question answered correctly
      expect(result!.questions[0]).toEqual({
        question: QUESTION_1,
        selectedIndex: 0,
        isCorrect: true,
        answered: true,
      });

      // Second question unanswered
      expect(result!.questions[1]).toEqual({
        question: QUESTION_2,
        selectedIndex: null,
        isCorrect: null,
        answered: false,
      });
    });

    it('should set currentQuestionIndex to first unanswered question', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2, ASSIGNED_3]);
      mockGetAnswersForEnvelope.mockResolvedValue([
        { questionId: 'question-1', selectedIndex: 0, isCorrect: true },
      ]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      // Question 1 is answered, so current should be question 2 (index 1)
      expect(result!.currentQuestionIndex).toBe(1);
      expect(result!.allComplete).toBe(false);
    });

    it('should skip to the correct unanswered question when middle is answered', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2, ASSIGNED_3]);
      mockGetAnswersForEnvelope.mockResolvedValue([
        { questionId: 'question-1', selectedIndex: 0, isCorrect: true },
        { questionId: 'question-2', selectedIndex: 1, isCorrect: true },
      ]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      // Questions 1 and 2 are answered, so current should be question 3 (index 2)
      expect(result!.currentQuestionIndex).toBe(2);
      expect(result!.allComplete).toBe(false);
    });

    it('should set allComplete when all questions are answered', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2]);
      mockGetAnswersForEnvelope.mockResolvedValue([
        { questionId: 'question-1', selectedIndex: 0, isCorrect: true },
        { questionId: 'question-2', selectedIndex: 1, isCorrect: true },
      ]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      expect(result!.allComplete).toBe(true);
      // currentQuestionIndex defaults to last when all complete
      expect(result!.currentQuestionIndex).toBe(1);
    });

    it('should handle incorrect answers in state', async () => {
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1]);
      mockGetAnswersForEnvelope.mockResolvedValue([
        { questionId: 'question-1', selectedIndex: 1, isCorrect: false },
      ]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_ID);

      expect(result!.questions[0]).toEqual({
        question: QUESTION_1,
        selectedIndex: 1,
        isCorrect: false,
        answered: true,
      });
      expect(result!.allComplete).toBe(true);
    });
  });

  // ================================================================
  // submitAnswer
  // ================================================================
  describe('submitAnswer', () => {
    it('should throw QUESTION_NOT_FOUND if question does not exist', async () => {
      mockGetQuestionById.mockResolvedValue(null);

      await expect(
        submitAnswer('env-1', 'nonexistent', PARTICIPANT_ID, 0)
      ).rejects.toThrow('QUESTION_NOT_FOUND');
    });

    it('should throw QUESTION_NOT_FOUND if question is not assigned to envelope', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_2]); // Only question 2 assigned

      await expect(
        submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 0)
      ).rejects.toThrow('QUESTION_NOT_FOUND');
    });

    it('should throw ALREADY_ANSWERED on Prisma P2002 unique constraint violation', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1]);
      mockCreateAnswer.mockRejectedValue(
        Object.assign(new Error('P2002'), { code: 'P2002' })
      );

      await expect(
        submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 0)
      ).rejects.toThrow('ALREADY_ANSWERED');
    });

    it('should rethrow non-P2002 errors from createAnswer', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1]);
      mockCreateAnswer.mockRejectedValue(new Error('DB_CONNECTION_LOST'));

      await expect(
        submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 0)
      ).rejects.toThrow('DB_CONNECTION_LOST');
    });

    it('should return correct answer details when answer is correct', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-1', questionId: 'question-1', selectedIndex: 0, isCorrect: true });
      mockCountAnswersForEnvelope.mockResolvedValue(1);

      const result = await submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 0);

      expect(result.isCorrect).toBe(true);
      expect(result.correctIndex).toBe(0); // First option is correct
      expect(result.explanation).toBe('Because that is the year.');
      expect(result.isLastQuestion).toBe(false); // 1 of 2 answered
      expect(result.envelopeComplete).toBe(false);
    });

    it('should return incorrect answer details when answer is wrong', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_2);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_2]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-2', questionId: 'question-2', selectedIndex: 0, isCorrect: false });
      mockCountAnswersForEnvelope.mockResolvedValue(1);

      const result = await submitAnswer('env-1', 'question-2', PARTICIPANT_ID, 0);

      expect(result.isCorrect).toBe(false);
      expect(result.correctIndex).toBe(1); // Second option (Paris) is correct
      expect(result.explanation).toBe('Paris is the capital of France.');
      expect(result.isLastQuestion).toBe(true); // 1 of 1 answered
      expect(result.envelopeComplete).toBe(true);
    });

    it('should return null explanation when question has no explanation', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_3);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_3]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-3', questionId: 'question-3', selectedIndex: 2, isCorrect: true });
      mockCountAnswersForEnvelope.mockResolvedValue(1);

      const result = await submitAnswer('env-1', 'question-3', PARTICIPANT_ID, 2);

      expect(result.explanation).toBeNull();
    });

    it('should call createAnswer with correct parameters', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-1', questionId: 'question-1', selectedIndex: 1, isCorrect: false });
      mockCountAnswersForEnvelope.mockResolvedValue(1);

      await submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 1);

      expect(mockCreateAnswer).toHaveBeenCalledWith(
        'env-1',
        'question-1',
        PARTICIPANT_ID,
        1,
        false // selectedIndex 1 !== correctIndex 0
      );
    });

    it('should mark envelope as completed when all questions are answered', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_2);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-2', questionId: 'question-2', selectedIndex: 1, isCorrect: true });
      mockCountAnswersForEnvelope.mockResolvedValue(2); // 2 answers for 2 questions

      const result = await submitAnswer('env-1', 'question-2', PARTICIPANT_ID, 1);

      expect(result.isLastQuestion).toBe(true);
      expect(result.envelopeComplete).toBe(true);
      expect(mockUpdateEnvelopeStatus).toHaveBeenCalledWith('env-1', 'completed');
    });

    it('should NOT mark envelope as completed when questions remain', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_1);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2, ASSIGNED_3]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-1', questionId: 'question-1', selectedIndex: 0, isCorrect: true });
      mockCountAnswersForEnvelope.mockResolvedValue(1); // 1 of 3 answered

      const result = await submitAnswer('env-1', 'question-1', PARTICIPANT_ID, 0);

      expect(result.isLastQuestion).toBe(false);
      expect(result.envelopeComplete).toBe(false);
      expect(mockUpdateEnvelopeStatus).not.toHaveBeenCalled();
    });

    it('should complete envelope when final question of 3 is answered', async () => {
      mockGetQuestionById.mockResolvedValue(QUESTION_3);
      mockGetQuestionsByEnvelopeId.mockResolvedValue([ASSIGNED_1, ASSIGNED_2, ASSIGNED_3]);
      mockCreateAnswer.mockResolvedValue({ id: 'answer-3', questionId: 'question-3', selectedIndex: 2, isCorrect: true });
      mockCountAnswersForEnvelope.mockResolvedValue(3); // All 3 answered

      const result = await submitAnswer('env-1', 'question-3', PARTICIPANT_ID, 2);

      expect(result.isLastQuestion).toBe(true);
      expect(result.envelopeComplete).toBe(true);
      expect(mockUpdateEnvelopeStatus).toHaveBeenCalledWith('env-1', 'completed');
    });
  });
});
