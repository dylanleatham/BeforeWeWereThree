/**
 * Trivia routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

type AnyMock = jest.Mock<any>;

const mockParticipant = {
  findUnique: jest.fn<() => Promise<unknown>>(),
  count: jest.fn<() => Promise<number>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
};

const mockFriend = {
  findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
};

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    friend: mockFriend,
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({ participant: mockParticipant });
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  disconnectDatabase: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../db/queries/config.js', () => ({
  getGuestPin: jest.fn<() => Promise<string>>().mockResolvedValue('01152025'),
  getAdminPin: jest.fn<() => Promise<string>>().mockResolvedValue('12251990'),
}));

jest.unstable_mockModule('../../middleware/rateLimit.js', () => ({
  pinRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  resetRateLimit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRemainingAttempts: jest.fn<() => Promise<number>>().mockResolvedValue(5),
  createRateLimiter: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock trivia query functions
const mockGetAllQuestions = jest.fn() as AnyMock;
const mockCreateQuestion = jest.fn() as AnyMock;
const mockUpdateQuestion = jest.fn() as AnyMock;
const mockDeleteQuestion = jest.fn() as AnyMock;
const mockGetQuestionsByEnvelopeId = jest.fn() as AnyMock;
const mockAssignQuestionsToEnvelope = jest.fn() as AnyMock;
const mockReorderEnvelopeQuestions = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/trivia.js', () => ({
  getAllQuestions: mockGetAllQuestions,
  createQuestion: mockCreateQuestion,
  updateQuestion: mockUpdateQuestion,
  deleteQuestion: mockDeleteQuestion,
  getQuestionsByEnvelopeId: mockGetQuestionsByEnvelopeId,
  assignQuestionsToEnvelope: mockAssignQuestionsToEnvelope,
  reorderEnvelopeQuestions: mockReorderEnvelopeQuestions,
}));

// Mock trivia service functions
const mockGetEnvelopeState = jest.fn() as AnyMock;
const mockSubmitAnswer = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/trivia.js', () => ({
  getEnvelopeState: mockGetEnvelopeState,
  submitAnswer: mockSubmitAnswer,
}));

const { default: request } = await import('supertest');
const { app } = await import('../../index.js');

const mockAdminParticipant = {
  id: 'admin-id',
  deviceFingerprint: 'admin-fp',
  designation: 'readonly',
  role: 'admin',
  createdAt: new Date('2024-01-01'),
};

const mockGuestParticipant = {
  id: 'guest-id',
  deviceFingerprint: 'guest-fp',
  designation: 'A',
  role: 'guest',
  createdAt: new Date('2024-01-01'),
};

async function getAdminCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.create.mockResolvedValue(mockAdminParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '12251990', deviceFingerprint: 'admin-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

async function getGuestCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.count.mockResolvedValue(0);
  mockParticipant.create.mockResolvedValue(mockGuestParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '01152025', deviceFingerprint: 'guest-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

const envelopeId = 'a0000000-0000-4000-8000-000000000001';
const questionId = 'b0000000-0000-4000-8000-000000000001';

const validQuestion = {
  questionText: 'What color?',
  options: [
    { text: 'Red', isCorrect: true },
    { text: 'Blue', isCorrect: false },
  ],
};

describe('Trivia Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/trivia/:envelopeId
  // ================================================================
  describe('GET /api/trivia/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/trivia/${envelopeId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 if no questions found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeState.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/trivia/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return envelope state for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const state = {
        questions: [
          {
            question: { id: questionId, questionText: 'What color?', options: [] },
            selectedIndex: null,
            isCorrect: null,
            answered: false,
          },
        ],
        currentQuestionIndex: 0,
        allComplete: false,
      };
      mockGetEnvelopeState.mockResolvedValue(state);

      const res = await request(app)
        .get(`/api/trivia/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions).toHaveLength(1);
    });

    it('should return 500 if service throws', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeState.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get(`/api/trivia/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/trivia/:envelopeId/answer
  // ================================================================
  describe('POST /api/trivia/:envelopeId/answer', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .send({ questionId, selectedIndex: 0 });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid body', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .set('Cookie', cookies)
        .send({ questionId: 'not-a-uuid', selectedIndex: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent question', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitAnswer.mockRejectedValue(new Error('QUESTION_NOT_FOUND'));

      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .set('Cookie', cookies)
        .send({ questionId, selectedIndex: 0 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return 409 for duplicate answer', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitAnswer.mockRejectedValue(new Error('ALREADY_ANSWERED'));

      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .set('Cookie', cookies)
        .send({ questionId, selectedIndex: 0 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_VOTED');
    });

    it('should submit answer successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitAnswer.mockResolvedValue({
        isCorrect: true,
        correctIndex: 0,
        explanation: null,
        isLastQuestion: false,
        envelopeComplete: false,
      });

      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .set('Cookie', cookies)
        .send({ questionId, selectedIndex: 0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCorrect).toBe(true);
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitAnswer.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post(`/api/trivia/${envelopeId}/answer`)
        .set('Cookie', cookies)
        .send({ questionId, selectedIndex: 0 });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // GET /api/trivia/admin/questions (admin: list all questions)
  // ================================================================
  describe('GET /api/trivia/admin/questions', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/trivia/admin/questions');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get('/api/trivia/admin/questions')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return questions for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const questions = [{ id: questionId, questionText: 'What color?', options: [] }];
      mockGetAllQuestions.mockResolvedValue(questions);

      const res = await request(app)
        .get('/api/trivia/admin/questions')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(1);
    });

    it('should return 500 if query throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetAllQuestions.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get('/api/trivia/admin/questions')
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/trivia/admin/questions (admin: create question)
  // ================================================================
  describe('POST /api/trivia/admin/questions', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .send(validQuestion);
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send(validQuestion);

      expect(res.status).toBe(403);
    });

    it('should return 400 for missing questionText', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send({ options: validQuestion.options });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for no correct option', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send({
          questionText: 'What color?',
          options: [
            { text: 'Red', isCorrect: false },
            { text: 'Blue', isCorrect: false },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for too few options', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send({
          questionText: 'What color?',
          options: [{ text: 'Red', isCorrect: true }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create question for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const question = { id: questionId, ...validQuestion };
      mockCreateQuestion.mockResolvedValue(question);

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send(validQuestion);

      expect(res.status).toBe(201);
      expect(res.body.data.question.questionText).toBe('What color?');
    });

    it('should return 500 if create throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockCreateQuestion.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/trivia/admin/questions')
        .set('Cookie', cookies)
        .send(validQuestion);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // PATCH /api/trivia/admin/questions/:id (admin: update question)
  // ================================================================
  describe('PATCH /api/trivia/admin/questions/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .patch(`/api/trivia/admin/questions/${questionId}`)
        .send({ questionText: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .patch(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies)
        .send({ questionText: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .patch(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies)
        .send({ questionText: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if question not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockUpdateQuestion.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies)
        .send({ questionText: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should update question for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const updated = { id: questionId, questionText: 'Updated', options: validQuestion.options };
      mockUpdateQuestion.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies)
        .send({ questionText: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.question.questionText).toBe('Updated');
    });
  });

  // ================================================================
  // DELETE /api/trivia/admin/questions/:id (admin: delete question)
  // ================================================================
  describe('DELETE /api/trivia/admin/questions/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete(`/api/trivia/admin/questions/${questionId}`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .delete(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if question not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteQuestion.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should delete question for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteQuestion.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/trivia/admin/questions/${questionId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ================================================================
  // GET /api/trivia/admin/envelope/:envelopeId/questions (admin)
  // ================================================================
  describe('GET /api/trivia/admin/envelope/:envelopeId/questions', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/trivia/admin/envelope/${envelopeId}/questions`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return questions for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const questions = [
        { id: 'eq1', envelopeId, questionId, sortOrder: 0, question: { id: questionId } },
      ];
      mockGetQuestionsByEnvelopeId.mockResolvedValue(questions);

      const res = await request(app)
        .get(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(1);
    });

    it('should return 500 if query throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetQuestionsByEnvelopeId.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // PUT /api/trivia/admin/envelope/:envelopeId/questions (admin: assign)
  // ================================================================
  describe('PUT /api/trivia/admin/envelope/:envelopeId/questions', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .send({ questionIds: [questionId] });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies)
        .send({ questionIds: [questionId] });

      expect(res.status).toBe(403);
    });

    it('should return 400 for empty questionIds', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies)
        .send({ questionIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for non-uuid questionIds', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies)
        .send({ questionIds: ['not-a-uuid'] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should assign questions for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockAssignQuestionsToEnvelope.mockResolvedValue(1);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies)
        .send({ questionIds: [questionId] });

      expect(res.status).toBe(200);
      expect(res.body.data.assigned).toBe(1);
    });

    it('should return 500 if assign throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockAssignQuestionsToEnvelope.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions`)
        .set('Cookie', cookies)
        .send({ questionIds: [questionId] });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // PUT /api/trivia/admin/envelope/:envelopeId/questions/reorder (admin)
  // ================================================================
  describe('PUT /api/trivia/admin/envelope/:envelopeId/questions/reorder', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions/reorder`)
        .send({ questionIds: [questionId] });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions/reorder`)
        .set('Cookie', cookies)
        .send({ questionIds: [questionId] });

      expect(res.status).toBe(403);
    });

    it('should return 400 for empty questionIds', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions/reorder`)
        .set('Cookie', cookies)
        .send({ questionIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reorder questions for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockReorderEnvelopeQuestions.mockResolvedValue(2);

      const secondQuestionId = 'b0000000-0000-4000-8000-000000000002';
      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions/reorder`)
        .set('Cookie', cookies)
        .send({ questionIds: [secondQuestionId, questionId] });

      expect(res.status).toBe(200);
      expect(res.body.data.reordered).toBe(2);
    });

    it('should return 500 if reorder throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockReorderEnvelopeQuestions.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .put(`/api/trivia/admin/envelope/${envelopeId}/questions/reorder`)
        .set('Cookie', cookies)
        .send({ questionIds: [questionId] });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
