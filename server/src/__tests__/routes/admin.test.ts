/**
 * Admin routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock participant for auth
const mockParticipant = {
  findUnique: jest.fn<() => Promise<unknown>>(),
  count: jest.fn<() => Promise<number>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
  deleteMany: jest.fn() as AnyMock,
};

const mockLetter = { deleteMany: jest.fn() as AnyMock };
const mockWyrVote = { deleteMany: jest.fn() as AnyMock };
const mockPhoto = { deleteMany: jest.fn() as AnyMock };
const mockNameGameVote = { deleteMany: jest.fn() as AnyMock };
const mockNameGameName = { deleteMany: jest.fn() as AnyMock };
const mockNameGameRound = { deleteMany: jest.fn() as AnyMock };
const mockNameGameGuidance = { deleteMany: jest.fn() as AnyMock };
const mockTriviaAnswer = { deleteMany: jest.fn() as AnyMock };
const mockEnvelope = { updateMany: jest.fn() as AnyMock };
const mockTransaction = jest.fn() as AnyMock;

const mockFriend = {
  findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
};

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    friend: mockFriend,
    letter: mockLetter,
    wyrVote: mockWyrVote,
    photo: mockPhoto,
    nameGameVote: mockNameGameVote,
    nameGameName: mockNameGameName,
    nameGameRound: mockNameGameRound,
    nameGameGuidance: mockNameGameGuidance,
    triviaAnswer: mockTriviaAnswer,
    envelope: mockEnvelope,
    $transaction: mockTransaction,
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  disconnectDatabase: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../db/queries/config.js', () => ({
  getGuestPin: jest.fn<() => Promise<string>>().mockResolvedValue('01152025'),
  getAdminPin: jest.fn<() => Promise<string>>().mockResolvedValue('12251990'),
}));

// Import after mocking
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

/**
 * Helper to get an authenticated admin session cookie
 */
async function getAdminCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.create.mockResolvedValue(mockAdminParticipant);

  const loginResponse = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '12251990', deviceFingerprint: 'admin-fp' });

  return loginResponse.headers['set-cookie'] as unknown as string[];
}

/**
 * Helper to get an authenticated guest session cookie
 */
async function getGuestCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.count.mockResolvedValue(0);
  mockParticipant.create.mockResolvedValue(mockGuestParticipant);

  const loginResponse = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '01152025', deviceFingerprint: 'guest-fp' });

  return loginResponse.headers['set-cookie'] as unknown as string[];
}

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up transaction mock for reset
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        letter: mockLetter,
        wyrVote: mockWyrVote,
        photo: mockPhoto,
        nameGameVote: mockNameGameVote,
        nameGameName: mockNameGameName,
        nameGameRound: mockNameGameRound,
        nameGameGuidance: mockNameGameGuidance,
        triviaAnswer: mockTriviaAnswer,
        participant: mockParticipant,
        envelope: mockEnvelope,
      });
    });
    mockLetter.deleteMany.mockResolvedValue({ count: 2 });
    mockWyrVote.deleteMany.mockResolvedValue({ count: 4 });
    mockPhoto.deleteMany.mockResolvedValue({ count: 1 });
    mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
    mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
    mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
    mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
    mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
    mockParticipant.deleteMany.mockResolvedValue({ count: 2 });
    mockEnvelope.updateMany.mockResolvedValue({ count: 3 });
  });

  describe('POST /api/admin/reset-session', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/reset-session');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if authenticated as guest', async () => {
      const cookies = await getGuestCookies();

      // Reset mocks after login so they can be used by the reset call
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const response = await request(app)
        .post('/api/admin/reset-session')
        .set('Cookie', cookies);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reset session successfully for admin', async () => {
      const cookies = await getAdminCookies();

      // Reset mocks after login
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const response = await request(app)
        .post('/api/admin/reset-session')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Session reset successfully');
      expect(response.body.data.participantsDeleted).toBe(2);
      expect(response.body.data.envelopesReset).toBe(3);
      expect(response.body.data.votesDeleted).toBe(4);
      expect(response.body.data.lettersDeleted).toBe(2);
      expect(response.body.data.photosDeleted).toBe(1);
    });

    it('should return 500 if reset fails', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockTransaction.mockRejectedValue(new Error('DB connection lost'));

      // Silence expected console.error from the route handler
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/admin/reset-session')
        .set('Cookie', cookies);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
