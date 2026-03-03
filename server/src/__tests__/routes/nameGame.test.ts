/**
 * Name Game routes integration tests
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
  getBabymoonClosedAt: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  setBabymoonClosedAt: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  deleteBabymoonClosedAt: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../middleware/rateLimit.js', () => ({
  pinRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  resetRateLimit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRemainingAttempts: jest.fn<() => Promise<number>>().mockResolvedValue(5),
  createRateLimiter: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock name game service
const mockGetNameGameState = jest.fn() as AnyMock;
const mockSubmitGuidance = jest.fn() as AnyMock;
const mockSubmitVote = jest.fn() as AnyMock;
const mockGetAccumulatedMatches = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/nameGame.js', () => ({
  getNameGameState: mockGetNameGameState,
  submitGuidance: mockSubmitGuidance,
  submitVote: mockSubmitVote,
  getAccumulatedMatches: mockGetAccumulatedMatches,
}));

// Mock query for vote route
const mockGetEnvelopeIdForName = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/nameGame.js', () => ({
  getEnvelopeIdForName: mockGetEnvelopeIdForName,
  getNameGameState: jest.fn(),
  getExcludedNames: jest.fn(),
  createNames: jest.fn(),
  updateRoundStatus: jest.fn(),
  getRoundResults: jest.fn(),
  getAccumulatedMatches: jest.fn(),
  getRoundCount: jest.fn(),
  getRoundIdForName: jest.fn(),
  getGuidanceForRound: jest.fn(),
  getPendingGuidanceState: jest.fn(),
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

async function getGuestCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.count.mockResolvedValue(0);
  mockParticipant.create.mockResolvedValue(mockGuestParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '01152025', deviceFingerprint: 'guest-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

describe('Name Game Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/name-game/:envelopeId
  // ================================================================
  describe('GET /api/name-game/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/name-game/env-1');
      expect(res.status).toBe(401);
    });

    it('should return name game state', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const state = {
        currentRound: null,
        allMatches: [],
        roundCount: 0,
      };
      mockGetNameGameState.mockResolvedValue(state);

      const res = await request(app)
        .get('/api/name-game/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roundCount).toBe(0);
    });
  });

  // ================================================================
  // POST /api/name-game/:envelopeId/guidance
  // ================================================================
  describe('POST /api/name-game/:envelopeId/guidance', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/name-game/env-1/guidance')
        .send({});
      expect(res.status).toBe(401);
    });

    it('should submit guidance and return waiting', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitGuidance.mockResolvedValue({
        status: 'waiting_for_partner',
        roundNumber: 1,
      });

      const res = await request(app)
        .post('/api/name-game/env-1/guidance')
        .set('Cookie', cookies)
        .send({ guidance: 'Nature-inspired names' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('waiting_for_partner');
    });

    it('should return 503 when API key is missing', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockSubmitGuidance.mockRejectedValue(new Error('ANTHROPIC_API_KEY is required'));

      const res = await request(app)
        .post('/api/name-game/env-1/guidance')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  // ================================================================
  // POST /api/name-game/:nameId/vote
  // ================================================================
  describe('POST /api/name-game/:nameId/vote', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/name-game/name-1/vote')
        .send({ choice: 'love' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid vote choice', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/name-game/name-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if name not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeIdForName.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/name-game/nonexistent/vote')
        .set('Cookie', cookies)
        .send({ choice: 'love' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NAME_NOT_FOUND');
    });

    it('should return 409 for already voted', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeIdForName.mockResolvedValue('env-1');
      mockSubmitVote.mockRejectedValue(new Error('ALREADY_VOTED'));

      const res = await request(app)
        .post('/api/name-game/name-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'love' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_VOTED');
    });

    it('should submit vote successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeIdForName.mockResolvedValue('env-1');
      mockSubmitVote.mockResolvedValue({ allVoted: false });

      const res = await request(app)
        .post('/api/name-game/name-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'love' });

      expect(res.status).toBe(200);
      expect(res.body.data.allVoted).toBe(false);
    });

    it('should handle Prisma unique constraint violation', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeIdForName.mockResolvedValue('env-1');
      const prismaError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      mockSubmitVote.mockRejectedValue(prismaError);

      const res = await request(app)
        .post('/api/name-game/name-1/vote')
        .set('Cookie', cookies)
        .send({ choice: 'love' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_VOTED');
    });
  });

  // ================================================================
  // GET /api/name-game/:envelopeId/matches
  // ================================================================
  describe('GET /api/name-game/:envelopeId/matches', () => {
    it('should return accumulated matches', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const matches = [{ id: 'n1', name: 'Luna' }];
      mockGetAccumulatedMatches.mockResolvedValue(matches);

      const res = await request(app)
        .get('/api/name-game/env-1/matches')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.matches).toEqual(matches);
    });
  });
});
