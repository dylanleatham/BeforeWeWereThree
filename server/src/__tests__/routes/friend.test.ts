/**
 * Friend routes integration tests
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

// Mock friend service
const mockGetAllFriends = jest.fn() as AnyMock;
const mockCreateFriend = jest.fn() as AnyMock;
const mockRemoveFriend = jest.fn() as AnyMock;
const mockSaveThankYouNote = jest.fn() as AnyMock;
const mockGetFriendLettersForAdmin = jest.fn() as AnyMock;
const mockGetFriendDashboard = jest.fn() as AnyMock;
const mockCreateNewFriendLetter = jest.fn() as AnyMock;
const mockSaveFriendLetter = jest.fn() as AnyMock;
const mockSubmitFriendLetterAndCreateEnvelope = jest.fn() as AnyMock;
const mockGetFriendLetterForCouple = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/friend.js', () => ({
  getAllFriends: mockGetAllFriends,
  createFriend: mockCreateFriend,
  removeFriend: mockRemoveFriend,
  saveThankYouNote: mockSaveThankYouNote,
  getFriendLettersForAdmin: mockGetFriendLettersForAdmin,
  getFriendDashboard: mockGetFriendDashboard,
  createNewFriendLetter: mockCreateNewFriendLetter,
  saveFriendLetter: mockSaveFriendLetter,
  submitFriendLetterAndCreateEnvelope: mockSubmitFriendLetterAndCreateEnvelope,
  getFriendLetterForCouple: mockGetFriendLetterForCouple,
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

const mockFriendParticipant = {
  id: 'friend-participant-id',
  deviceFingerprint: 'friend-fp',
  designation: 'readonly',
  role: 'friend',
  friendId: 'friend-1',
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

async function getFriendCookies(): Promise<string[]> {
  // Friend auth: PIN matches a friend record
  mockParticipant.findUnique.mockResolvedValue(null);
  mockFriend.findUnique.mockResolvedValue({ id: 'friend-1', name: 'Alice', pin: '33334444' });
  mockParticipant.create.mockResolvedValue(mockFriendParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '33334444', deviceFingerprint: 'friend-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

describe('Friend Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset friend mock default
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // Admin: GET /api/friends
  // ================================================================
  describe('GET /api/friends', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/friends');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get('/api/friends')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return friends list for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetAllFriends.mockResolvedValue({
        friends: [{ id: 'f1', name: 'Alice', letterCount: 1 }],
      });

      const res = await request(app)
        .get('/api/friends')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.friends).toHaveLength(1);
    });
  });

  // ================================================================
  // Admin: POST /api/friends
  // ================================================================
  describe('POST /api/friends', () => {
    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/friends')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate PIN', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockCreateFriend.mockRejectedValue(new Error('PIN_ALREADY_EXISTS'));

      const res = await request(app)
        .post('/api/friends')
        .set('Cookie', cookies)
        .send({ name: 'Alice', pin: '01152025' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PIN_ALREADY_EXISTS');
    });

    it('should create friend for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const friend = { id: 'f1', name: 'Bob', pin: '55556666' };
      mockCreateFriend.mockResolvedValue(friend);

      const res = await request(app)
        .post('/api/friends')
        .set('Cookie', cookies)
        .send({ name: 'Bob', pin: '55556666' });

      expect(res.status).toBe(201);
      expect(res.body.data.friend).toEqual(friend);
    });
  });

  // ================================================================
  // Admin: DELETE /api/friends/:friendId
  // ================================================================
  describe('DELETE /api/friends/:friendId', () => {
    it('should return 404 if friend not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockRemoveFriend.mockRejectedValue(new Error('FRIEND_NOT_FOUND'));

      const res = await request(app)
        .delete('/api/friends/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
    });

    it('should delete friend for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockRemoveFriend.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/friends/friend-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ================================================================
  // Friend: GET /api/friends/me/dashboard
  // ================================================================
  describe('GET /api/friends/me/dashboard', () => {
    it('should return 401 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get('/api/friends/me/dashboard')
        .set('Cookie', cookies);

      // friendMiddleware should reject non-friend users
      expect(res.status).toBe(403);
    });

    it('should return dashboard for friend user', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetFriendDashboard.mockResolvedValue({
        friend: { id: 'friend-1', name: 'Alice' },
        thankYouNote: null,
        letters: [],
      });

      const res = await request(app)
        .get('/api/friends/me/dashboard')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.friend.name).toBe('Alice');
    });
  });

  // ================================================================
  // Friend: POST /api/friends/me/letters
  // ================================================================
  describe('POST /api/friends/me/letters', () => {
    it('should create a new letter draft', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      const letter = { id: 'l1', friendId: 'friend-1', recipient: 'baby', content: '' };
      mockCreateNewFriendLetter.mockResolvedValue(letter);

      const res = await request(app)
        .post('/api/friends/me/letters')
        .set('Cookie', cookies)
        .send({ recipient: 'baby' });

      expect(res.status).toBe(201);
      expect(res.body.data.letter.recipient).toBe('baby');
    });
  });

  // ================================================================
  // Friend: PUT /api/friends/me/letters/:letterId
  // ================================================================
  describe('PUT /api/friends/me/letters/:letterId', () => {
    it('should return 409 for already submitted letter', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockSaveFriendLetter.mockRejectedValue(new Error('ALREADY_SUBMITTED'));

      const res = await request(app)
        .put('/api/friends/me/letters/l1')
        .set('Cookie', cookies)
        .send({ content: 'Updated draft' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_SUBMITTED');
    });

    it('should save letter draft', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      const letter = { id: 'l1', content: 'Saved draft' };
      mockSaveFriendLetter.mockResolvedValue(letter);

      const res = await request(app)
        .put('/api/friends/me/letters/l1')
        .set('Cookie', cookies)
        .send({ content: 'Saved draft' });

      expect(res.status).toBe(200);
      expect(res.body.data.letter.content).toBe('Saved draft');
    });
  });

  // ================================================================
  // Friend: POST /api/friends/me/letters/:letterId/submit
  // ================================================================
  describe('POST /api/friends/me/letters/:letterId/submit', () => {
    it('should submit letter and create envelope', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      const letter = { id: 'l1', submittedAt: '2026-01-02T00:00:00.000Z' };
      mockSubmitFriendLetterAndCreateEnvelope.mockResolvedValue(letter);

      const res = await request(app)
        .post('/api/friends/me/letters/l1/submit')
        .set('Cookie', cookies)
        .send({ content: 'Final content' });

      expect(res.status).toBe(200);
      expect(res.body.data.letter.submittedAt).toBeDefined();
    });
  });

  // ================================================================
  // Couple: GET /api/friends/letter/:friendLetterId
  // ================================================================
  describe('GET /api/friends/letter/:friendLetterId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/friends/letter/fl-1');
      expect(res.status).toBe(401);
    });

    it('should return 404 if letter not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetFriendLetterForCouple.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/friends/letter/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
    });

    it('should return friend letter view for couple', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetFriendLetterForCouple.mockResolvedValue({
        friendName: 'Alice',
        recipient: 'baby',
        content: 'Dear baby...',
        submittedAt: '2026-01-02',
      });

      const res = await request(app)
        .get('/api/friends/letter/fl-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.friendName).toBe('Alice');
    });
  });
});
