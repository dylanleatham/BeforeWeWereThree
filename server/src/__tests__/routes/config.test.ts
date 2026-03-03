/**
 * Config routes integration tests
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

const mockAppConfig = {
  findUnique: jest.fn() as AnyMock,
  deleteMany: jest.fn() as AnyMock,
  upsert: jest.fn() as AnyMock,
};

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    friend: mockFriend,
    appConfig: mockAppConfig,
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

describe('Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/config
  // ================================================================
  describe('GET /api/config', () => {
    it('should return config without authentication', async () => {
      mockAppConfig.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.spotifyUrl).toBeNull();
    });

    it('should return spotify URL when configured', async () => {
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'spotify_url',
        value: 'https://open.spotify.com/playlist/abc123',
      });

      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body.data.spotifyUrl).toBe('https://open.spotify.com/playlist/abc123');
    });

    it('should return 500 if database query fails', async () => {
      mockAppConfig.findUnique.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/api/config');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // PUT /api/config
  // ================================================================
  describe('PUT /api/config', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/config')
        .send({ spotifyUrl: 'https://open.spotify.com/playlist/abc' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .put('/api/config')
        .set('Cookie', cookies)
        .send({ spotifyUrl: 'https://open.spotify.com/playlist/abc' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid URL', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .put('/api/config')
        .set('Cookie', cookies)
        .send({ spotifyUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update spotify URL for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockAppConfig.upsert.mockResolvedValue({
        key: 'spotify_url',
        value: 'https://open.spotify.com/playlist/new',
      });
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'spotify_url',
        value: 'https://open.spotify.com/playlist/new',
      });

      const res = await request(app)
        .put('/api/config')
        .set('Cookie', cookies)
        .send({ spotifyUrl: 'https://open.spotify.com/playlist/new' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.spotifyUrl).toBe('https://open.spotify.com/playlist/new');
    });

    it('should delete spotify URL when set to null', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockAppConfig.deleteMany.mockResolvedValue({ count: 1 });
      mockAppConfig.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/config')
        .set('Cookie', cookies)
        .send({ spotifyUrl: null });

      expect(res.status).toBe(200);
      expect(res.body.data.spotifyUrl).toBeNull();
      expect(mockAppConfig.deleteMany).toHaveBeenCalled();
    });

    it('should return 500 if update fails', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockAppConfig.upsert.mockRejectedValue(new Error('DB write error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .put('/api/config')
        .set('Cookie', cookies)
        .send({ spotifyUrl: 'https://open.spotify.com/playlist/abc' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
