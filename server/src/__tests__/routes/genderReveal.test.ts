/**
 * Gender Reveal routes integration tests
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

// Mock gender reveal service functions
const mockGetRevealState = jest.fn() as AnyMock;
const mockValidateKey = jest.fn() as AnyMock;
const mockConfigureReveal = jest.fn() as AnyMock;
const mockGetAdminConfig = jest.fn() as AnyMock;
const mockResealReveal = jest.fn() as AnyMock;
const mockSetGenderByFriend = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/genderReveal.js', () => ({
  getRevealState: mockGetRevealState,
  validateKey: mockValidateKey,
  configureReveal: mockConfigureReveal,
  getAdminConfig: mockGetAdminConfig,
  resealReveal: mockResealReveal,
  setGenderByFriend: mockSetGenderByFriend,
}));

// Mock gender reveal query functions
// Must include all exports since the friend service also imports from this module
const mockDeleteConfig = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/genderReveal.js', () => ({
  getConfig: jest.fn(),
  createConfig: jest.fn(),
  updateConfig: jest.fn(),
  deleteConfig: mockDeleteConfig,
  findGenderRevealConfig: jest.fn(),
  setGenderValue: jest.fn(),
  resetRevealState: jest.fn(),
  setKeyValidated: jest.fn(),
}));

// Mock friend query functions
// Must include all exports since the friend service and routes import many functions from this module
const mockGetGenderKeeper = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/friend.js', () => ({
  getAllFriends: jest.fn(),
  getFriendById: jest.fn(),
  getFriendByPin: jest.fn(),
  createFriend: jest.fn(),
  getGenderKeeper: mockGetGenderKeeper,
  setGenderKeeper: jest.fn(),
  deleteFriend: jest.fn(),
  getFriendLetters: jest.fn(),
  createFriendLetter: jest.fn(),
  getFriendLetterById: jest.fn(),
  updateFriendLetter: jest.fn(),
  submitFriendLetter: jest.fn(),
  countFriendLetters: jest.fn(),
  getThankYouNote: jest.fn(),
  upsertThankYouNote: jest.fn(),
}));

// Mock realtime service (return null for route tests)
// Must include all exports used by any route loaded by the app (signalr.ts imports getTransport)
jest.unstable_mockModule('../../services/realtime.js', () => ({
  getRealtimeService: jest.fn().mockReturnValue(null),
  getTransport: jest.fn().mockReturnValue('socketio'),
  initializeRealtimeService: jest.fn(),
  getSocketIO: jest.fn().mockReturnValue(null),
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
  // The auth route looks up friend by PIN via db.friend.findUnique
  // PIN must be 8 digits to pass Zod validation
  mockFriend.findUnique.mockResolvedValue({ id: 'friend-1' });
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.create.mockResolvedValue(mockFriendParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '99990001', deviceFingerprint: 'friend-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

const envelopeId = 'a0000000-0000-4000-8000-000000000001';

describe('Gender Reveal Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/gender-reveal/admin/:envelopeId
  // ================================================================
  describe('GET /api/gender-reveal/admin/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/gender-reveal/admin/${envelopeId}`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .get(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return admin config for admin user', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetAdminConfig.mockResolvedValue({
        configured: true,
        genderSet: false,
        keyAValidated: false,
        keyBValidated: false,
      });

      const res = await request(app)
        .get(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(true);
    });

    it('should return 500 if service throws', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockGetAdminConfig.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/gender-reveal/admin/:envelopeId/configure
  // ================================================================
  describe('POST /api/gender-reveal/admin/:envelopeId/configure', () => {
    const validBody = { keyA: '01152025', keyB: '12251990' };

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .send(validBody);

      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send(validBody);

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid configuration data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send({ keyA: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if envelope not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockConfigureReveal.mockRejectedValue(new Error('ENVELOPE_NOT_FOUND'));

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send(validBody);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should return 409 if reveal already done', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockConfigureReveal.mockRejectedValue(new Error('REVEAL_ALREADY_DONE'));

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REVEAL_ALREADY_DONE');
    });

    it('should configure reveal for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockConfigureReveal.mockResolvedValue({
        configured: true,
        genderSet: false,
        keyAValidated: false,
        keyBValidated: false,
      });

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(true);
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockConfigureReveal.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/configure`)
        .set('Cookie', cookies)
        .send(validBody);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/gender-reveal/admin/:envelopeId/re-seal
  // ================================================================
  describe('POST /api/gender-reveal/admin/:envelopeId/re-seal', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/re-seal`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/re-seal`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if reveal not configured', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockResealReveal.mockRejectedValue(new Error('REVEAL_NOT_CONFIGURED'));

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/re-seal`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REVEAL_NOT_CONFIGURED');
    });

    it('should re-seal reveal for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockResealReveal.mockResolvedValue({
        configured: true,
        genderSet: true,
        keyAValidated: false,
        keyBValidated: false,
      });

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/re-seal`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.keyAValidated).toBe(false);
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockResealReveal.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post(`/api/gender-reveal/admin/${envelopeId}/re-seal`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // DELETE /api/gender-reveal/admin/:envelopeId
  // ================================================================
  describe('DELETE /api/gender-reveal/admin/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/gender-reveal/admin/${envelopeId}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .delete(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if config not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteConfig.mockResolvedValue(false);

      const res = await request(app)
        .delete(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REVEAL_NOT_CONFIGURED');
    });

    it('should delete config for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteConfig.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteConfig.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .delete(`/api/gender-reveal/admin/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/gender-reveal/set-gender
  // ================================================================
  describe('POST /api/gender-reveal/set-gender', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(403);
    });

    it('should return 403 if friend is not the gender keeper', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'different-friend-id', name: 'Other' });

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_GENDER_KEEPER');
    });

    it('should return 403 if no gender keeper is set', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_GENDER_KEEPER');
    });

    it('should return 400 for invalid gender value', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'friend-1', name: 'Keeper' });

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if reveal not configured', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'friend-1', name: 'Keeper' });
      mockSetGenderByFriend.mockRejectedValue(new Error('REVEAL_NOT_CONFIGURED'));

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REVEAL_NOT_CONFIGURED');
    });

    it('should return 409 if gender already set', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'friend-1', name: 'Keeper' });
      mockSetGenderByFriend.mockRejectedValue(new Error('GENDER_ALREADY_SET'));

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'boy' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('GENDER_ALREADY_SET');
    });

    it('should set gender for gender keeper friend', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'friend-1', name: 'Keeper' });
      mockSetGenderByFriend.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'girl' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.set).toBe(true);
      expect(mockSetGenderByFriend).toHaveBeenCalledWith('friend-1', 'girl');
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getFriendCookies();
      mockParticipant.findUnique.mockResolvedValue(mockFriendParticipant);
      mockGetGenderKeeper.mockResolvedValue({ id: 'friend-1', name: 'Keeper' });
      mockSetGenderByFriend.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/gender-reveal/set-gender')
        .set('Cookie', cookies)
        .send({ genderValue: 'boy' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // GET /api/gender-reveal/:envelopeId
  // ================================================================
  describe('GET /api/gender-reveal/:envelopeId', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/gender-reveal/${envelopeId}`);
      expect(res.status).toBe(401);
    });

    it('should return reveal state for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetRevealState.mockResolvedValue({
        configured: true,
        keysValidated: 0,
        myKeyValidated: false,
        revealed: false,
        keyLength: 8,
      });

      const res = await request(app)
        .get(`/api/gender-reveal/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configured).toBe(true);
      expect(res.body.data.revealed).toBe(false);
    });

    it('should return unconfigured state when no config exists', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetRevealState.mockResolvedValue({
        configured: false,
        keysValidated: 0,
        myKeyValidated: false,
        revealed: false,
      });

      const res = await request(app)
        .get(`/api/gender-reveal/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.configured).toBe(false);
    });

    it('should return 500 if service throws', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetRevealState.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get(`/api/gender-reveal/${envelopeId}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/gender-reveal/:envelopeId/validate-key
  // ================================================================
  describe('POST /api/gender-reveal/:envelopeId/validate-key', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .send({ key: '01152025' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid key format', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for non-digit key', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: 'abcdefgh' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing key', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if reveal not configured', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockValidateKey.mockRejectedValue(new Error('REVEAL_NOT_CONFIGURED'));

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '01152025' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REVEAL_NOT_CONFIGURED');
    });

    it('should return validation result for valid key submission', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockValidateKey.mockResolvedValue({
        status: 'waiting_for_partner',
        keysValidated: 1,
      });

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '01152025' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('waiting_for_partner');
    });

    it('should return revealed result when both keys validated', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockValidateKey.mockResolvedValue({
        status: 'revealed',
        gender: 'girl',
      });

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '12251990' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('revealed');
      expect(res.body.data.gender).toBe('girl');
    });

    it('should return invalid_key result for wrong key', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockValidateKey.mockResolvedValue({
        status: 'invalid_key',
      });

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '99999999' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('invalid_key');
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockValidateKey.mockRejectedValue(new Error('Unexpected DB failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post(`/api/gender-reveal/${envelopeId}/validate-key`)
        .set('Cookie', cookies)
        .send({ key: '01152025' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
