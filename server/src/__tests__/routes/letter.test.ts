/**
 * Letter routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock participant for auth
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

// Bypass rate limiter
jest.unstable_mockModule('../../middleware/rateLimit.js', () => ({
  pinRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  resetRateLimit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRemainingAttempts: jest.fn<() => Promise<number>>().mockResolvedValue(5),
  createRateLimiter: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock letter service
const mockGetLetterState = jest.fn() as AnyMock;
const mockSaveLetter = jest.fn() as AnyMock;
const mockSubmitLetter = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/letter.js', () => ({
  getLetterState: mockGetLetterState,
  saveLetter: mockSaveLetter,
  submitLetter: mockSubmitLetter,
}));

// Mock letter query functions
const mockCreatePrompt = jest.fn() as AnyMock;
const mockUpdatePrompt = jest.fn() as AnyMock;
const mockDeletePrompt = jest.fn() as AnyMock;
const mockGetPromptById = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/letter.js', () => ({
  createPrompt: mockCreatePrompt,
  updatePrompt: mockUpdatePrompt,
  deletePrompt: mockDeletePrompt,
  getPromptById: mockGetPromptById,
  getPromptByEnvelopeId: jest.fn(),
  getLetterForParticipant: jest.fn(),
  getSubmittedLettersForPrompt: jest.fn(),
  createOrUpdateLetter: jest.fn(),
}));

const { default: request } = await import('supertest');
const { app } = await import('../../index.js');

const mockGuestParticipant = {
  id: 'guest-id',
  deviceFingerprint: 'guest-fp',
  designation: 'A',
  role: 'guest',
  createdAt: new Date('2024-01-01'),
};

const mockAdminParticipant = {
  id: 'admin-id',
  deviceFingerprint: 'admin-fp',
  designation: 'readonly',
  role: 'admin',
  createdAt: new Date('2024-01-01'),
};

async function getGuestCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.count.mockResolvedValue(0);
  mockParticipant.create.mockResolvedValue(mockGuestParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '01152025', deviceFingerprint: 'guest-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

async function getAdminCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.create.mockResolvedValue(mockAdminParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '12251990', deviceFingerprint: 'admin-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

describe('Letter Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/letters/:envelopeId
  // ================================================================
  describe('GET /api/letters/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/letters/env-1');
      expect(res.status).toBe(401);
    });

    it('should return 404 if no prompt found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetLetterState.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/letters/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return letter state for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const state = {
        prompt: { id: 'p1', prompt: 'Write a letter' },
        phase: 'writing',
        myLetter: null,
        partnerSubmitted: false,
        revealedLetters: [],
      };
      mockGetLetterState.mockResolvedValue(state);

      const res = await request(app)
        .get('/api/letters/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phase).toBe('writing');
    });
  });

  // ================================================================
  // PUT /api/letters/:envelopeId
  // ================================================================
  describe('PUT /api/letters/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/letters/env-1')
        .send({ content: 'test' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid body', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .put('/api/letters/env-1')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should save letter content', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const letter = { id: 'l1', content: 'Dear baby...' };
      mockSaveLetter.mockResolvedValue(letter);

      const res = await request(app)
        .put('/api/letters/env-1')
        .set('Cookie', cookies)
        .send({ content: 'Dear baby...' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.letter).toEqual(letter);
    });
  });

  // ================================================================
  // POST /api/letters/:envelopeId/submit
  // ================================================================
  describe('POST /api/letters/:envelopeId/submit', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/letters/env-1/submit')
        .send({ content: 'test' });
      expect(res.status).toBe(401);
    });

    it('should return 409 for already submitted letter', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSaveLetter.mockRejectedValue(new Error('ALREADY_SUBMITTED'));

      const res = await request(app)
        .post('/api/letters/env-1/submit')
        .set('Cookie', cookies)
        .send({ content: 'Final draft' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_SUBMITTED');
    });

    it('should submit letter and return result', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSaveLetter.mockResolvedValue({ id: 'l1' });
      mockSubmitLetter.mockResolvedValue({ revealed: false });

      const res = await request(app)
        .post('/api/letters/env-1/submit')
        .set('Cookie', cookies)
        .send({ content: 'Final letter' });

      expect(res.status).toBe(200);
      expect(res.body.data.revealed).toBe(false);
    });
  });

  // ================================================================
  // Admin: POST /api/letters/prompt
  // ================================================================
  describe('POST /api/letters/prompt', () => {
    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/letters/prompt')
        .set('Cookie', cookies)
        .send({ envelopeId: 'env-1', prompt: 'Write a letter' });

      expect(res.status).toBe(403);
    });

    it('should create prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const envelopeId = 'a0000000-0000-4000-8000-000000000001';
      const prompt = { id: 'p1', envelopeId, prompt: 'Write a letter' };
      mockCreatePrompt.mockResolvedValue(prompt);

      const res = await request(app)
        .post('/api/letters/prompt')
        .set('Cookie', cookies)
        .send({ envelopeId, prompt: 'Write a letter' });

      expect(res.status).toBe(201);
      expect(res.body.data.prompt).toEqual(prompt);
    });
  });

  // ================================================================
  // Admin: DELETE /api/letters/prompt/:id
  // ================================================================
  describe('DELETE /api/letters/prompt/:id', () => {
    it('should return 404 if prompt not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeletePrompt.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/letters/prompt/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
    });

    it('should delete prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeletePrompt.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/letters/prompt/p1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
