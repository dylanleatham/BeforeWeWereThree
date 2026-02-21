/**
 * Would You Rather routes integration tests
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

// Mock WYR query functions
const mockCreatePrompt = jest.fn() as AnyMock;
const mockCreatePromptsBulk = jest.fn() as AnyMock;
const mockUpdatePrompt = jest.fn() as AnyMock;
const mockDeletePrompt = jest.fn() as AnyMock;
const mockGetPromptById = jest.fn() as AnyMock;
const mockGetPromptsByEnvelopeId = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/wyr.js', () => ({
  createPrompt: mockCreatePrompt,
  createPromptsBulk: mockCreatePromptsBulk,
  updatePrompt: mockUpdatePrompt,
  deletePrompt: mockDeletePrompt,
  getPromptById: mockGetPromptById,
  getPromptsByEnvelopeId: mockGetPromptsByEnvelopeId,
}));

// Mock WYR service functions
const mockGetEnvelopeState = jest.fn() as AnyMock;
const mockSubmitVote = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/wyr.js', () => ({
  getEnvelopeState: mockGetEnvelopeState,
  submitVote: mockSubmitVote,
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

describe('WYR Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/wyr/:envelopeId
  // ================================================================
  describe('GET /api/wyr/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/wyr/${envelopeId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 if no prompts found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeState.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/wyr/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return envelope state for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const state = {
        prompts: [{ id: 'p1', optionA: 'A', optionB: 'B' }],
        currentPromptIndex: 0,
      };
      mockGetEnvelopeState.mockResolvedValue(state);

      const res = await request(app)
        .get(`/api/wyr/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prompts).toHaveLength(1);
    });

    it('should return 500 if service throws', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeState.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get(`/api/wyr/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/wyr/:promptId/vote
  // ================================================================
  describe('POST /api/wyr/:promptId/vote', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/wyr/prompt-1/vote')
        .send({ choice: 'option_a' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid choice', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/wyr/prompt-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'C' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent prompt', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitVote.mockRejectedValue(new Error('PROMPT_NOT_FOUND'));

      const res = await request(app)
        .post('/api/wyr/nonexistent/vote')
        .set('Cookie', cookies)
        .send({ choice: 'option_a' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return 409 for duplicate vote', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitVote.mockRejectedValue(new Error('ALREADY_VOTED'));

      const res = await request(app)
        .post('/api/wyr/prompt-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'option_a' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_VOTED');
    });

    it('should submit vote successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitVote.mockResolvedValue({ revealed: false, results: null });

      const res = await request(app)
        .post('/api/wyr/prompt-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'option_a' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitVote.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/wyr/prompt-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'option_b' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/wyr (admin: create prompt)
  // ================================================================
  describe('POST /api/wyr', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/wyr')
        .send({ envelopeId, optionA: 'A', optionB: 'B' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/wyr')
        .set('Cookie', cookies)
        .send({ envelopeId, optionA: 'A', optionB: 'B' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/wyr')
        .set('Cookie', cookies)
        .send({ optionA: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for sort order conflict', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockCreatePrompt.mockRejectedValue(new Error('Unique constraint failed'));

      const res = await request(app)
        .post('/api/wyr')
        .set('Cookie', cookies)
        .send({ envelopeId, optionA: 'A', optionB: 'B', sortOrder: 0 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SORT_ORDER_CONFLICT');
    });

    it('should create prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const prompt = { id: 'p1', envelopeId, optionA: 'Option A', optionB: 'Option B' };
      mockCreatePrompt.mockResolvedValue(prompt);

      const res = await request(app)
        .post('/api/wyr')
        .set('Cookie', cookies)
        .send({ envelopeId, optionA: 'Option A', optionB: 'Option B' });

      expect(res.status).toBe(201);
      expect(res.body.data.prompt.optionA).toBe('Option A');
    });
  });

  // ================================================================
  // POST /api/wyr/bulk (admin: bulk create)
  // ================================================================
  describe('POST /api/wyr/bulk', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/wyr/bulk')
        .send({ envelopeId, prompts: [] });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/wyr/bulk')
        .set('Cookie', cookies)
        .send({ envelopeId, prompts: [{ optionA: 'A', optionB: 'B' }] });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/wyr/bulk')
        .set('Cookie', cookies)
        .send({ envelopeId, prompts: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should bulk create prompts for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const prompts = [
        { id: 'p1', optionA: 'A1', optionB: 'B1' },
        { id: 'p2', optionA: 'A2', optionB: 'B2' },
      ];
      mockCreatePromptsBulk.mockResolvedValue(prompts);

      const res = await request(app)
        .post('/api/wyr/bulk')
        .set('Cookie', cookies)
        .send({
          envelopeId,
          prompts: [
            { optionA: 'A1', optionB: 'B1' },
            { optionA: 'A2', optionB: 'B2' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.prompts).toHaveLength(2);
    });
  });

  // ================================================================
  // GET /api/wyr/envelope/:envelopeId/prompts (admin)
  // ================================================================
  describe('GET /api/wyr/envelope/:envelopeId/prompts', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/wyr/envelope/${envelopeId}/prompts`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get(`/api/wyr/envelope/${envelopeId}/prompts`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return prompts for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const prompts = [{ id: 'p1', optionA: 'A', optionB: 'B' }];
      mockGetPromptsByEnvelopeId.mockResolvedValue(prompts);

      const res = await request(app)
        .get(`/api/wyr/envelope/${envelopeId}/prompts`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.prompts).toHaveLength(1);
    });
  });

  // ================================================================
  // PATCH /api/wyr/:id (admin: update prompt)
  // ================================================================
  describe('PATCH /api/wyr/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .patch('/api/wyr/p1')
        .send({ optionA: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .patch('/api/wyr/p1')
        .set('Cookie', cookies)
        .send({ optionA: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .patch('/api/wyr/p1')
        .set('Cookie', cookies)
        .send({ optionA: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if prompt not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockUpdatePrompt.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/wyr/nonexistent')
        .set('Cookie', cookies)
        .send({ optionA: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should update prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const updated = { id: 'p1', optionA: 'Updated A', optionB: 'B' };
      mockUpdatePrompt.mockResolvedValue(updated);

      const res = await request(app)
        .patch('/api/wyr/p1')
        .set('Cookie', cookies)
        .send({ optionA: 'Updated A' });

      expect(res.status).toBe(200);
      expect(res.body.data.prompt.optionA).toBe('Updated A');
    });
  });

  // ================================================================
  // DELETE /api/wyr/:id (admin: delete prompt)
  // ================================================================
  describe('DELETE /api/wyr/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete('/api/wyr/p1');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .delete('/api/wyr/p1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if prompt not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeletePrompt.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/wyr/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should delete prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeletePrompt.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/wyr/p1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ================================================================
  // GET /api/wyr/prompt/:id (admin: get prompt by ID)
  // ================================================================
  describe('GET /api/wyr/prompt/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/wyr/prompt/p1');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get('/api/wyr/prompt/p1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if prompt not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetPromptById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/wyr/prompt/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROMPT_NOT_FOUND');
    });

    it('should return prompt for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const prompt = { id: 'p1', optionA: 'A', optionB: 'B', envelopeId };
      mockGetPromptById.mockResolvedValue(prompt);

      const res = await request(app)
        .get('/api/wyr/prompt/p1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.prompt.id).toBe('p1');
    });
  });
});
