/**
 * SignalR routes integration tests
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

// Mock envelope queries (used by group join to verify envelope exists)
const mockGetEnvelopeById = jest.fn() as AnyMock;
jest.unstable_mockModule('../../db/queries/envelopes.js', () => ({
  getAllEnvelopes: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  getParticipantEnvelopes: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  getEnvelopeById: mockGetEnvelopeById,
  createEnvelope: jest.fn(),
  updateEnvelope: jest.fn(),
  deleteEnvelope: jest.fn(),
  updateEnvelopeStatus: jest.fn(),
}));

// Mock realtime service
const mockGetTransport = jest.fn() as AnyMock;
const mockGetRealtimeService = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/realtime.js', () => ({
  getTransport: mockGetTransport,
  getRealtimeService: mockGetRealtimeService,
  initializeRealtimeService: jest.fn(),
  getSocketIO: jest.fn().mockReturnValue(null),
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

describe('SignalR Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // POST /api/signalr/negotiate
  // ================================================================
  describe('POST /api/signalr/negotiate', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/signalr/negotiate');
      expect(res.status).toBe(401);
    });

    it('should return socketio transport info', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetTransport.mockReturnValue('socketio');

      const res = await request(app)
        .post('/api/signalr/negotiate')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transport).toBe('socketio');
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.userId).toBe('guest-id');
    });
  });

  // ================================================================
  // POST /api/signalr/groups/join
  // ================================================================
  describe('POST /api/signalr/groups/join', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/signalr/groups/join')
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 if groupName is missing', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/signalr/groups/join')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid group name format', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/signalr/groups/join')
        .set('Cookie', cookies)
        .send({ groupName: 'invalid-format' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if envelope does not exist', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/signalr/groups/join')
        .set('Cookie', cookies)
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should return 503 if realtime service is not available', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue({ id: 'test-123' });
      mockGetRealtimeService.mockReturnValue(null);

      const res = await request(app)
        .post('/api/signalr/groups/join')
        .set('Cookie', cookies)
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should join group successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue({ id: 'test-123' });
      const mockAdapter = { addUserToGroup: (jest.fn() as AnyMock).mockResolvedValue(undefined) };
      mockGetRealtimeService.mockReturnValue(mockAdapter);

      const res = await request(app)
        .post('/api/signalr/groups/join')
        .set('Cookie', cookies)
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(200);
      expect(res.body.data.joined).toBe(true);
      expect(mockAdapter.addUserToGroup).toHaveBeenCalledWith('guest-id', 'activity:test-123');
    });
  });

  // ================================================================
  // POST /api/signalr/groups/leave
  // ================================================================
  describe('POST /api/signalr/groups/leave', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/signalr/groups/leave')
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 if groupName is missing', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/signalr/groups/leave')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid group name format', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/signalr/groups/leave')
        .set('Cookie', cookies)
        .send({ groupName: '../../../etc/passwd' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 503 if realtime service is not available', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetRealtimeService.mockReturnValue(null);

      const res = await request(app)
        .post('/api/signalr/groups/leave')
        .set('Cookie', cookies)
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should leave group successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const mockAdapter = { removeUserFromGroup: (jest.fn() as AnyMock).mockResolvedValue(undefined) };
      mockGetRealtimeService.mockReturnValue(mockAdapter);

      const res = await request(app)
        .post('/api/signalr/groups/leave')
        .set('Cookie', cookies)
        .send({ groupName: 'activity:test-123' });

      expect(res.status).toBe(200);
      expect(res.body.data.left).toBe(true);
      expect(mockAdapter.removeUserFromGroup).toHaveBeenCalledWith('guest-id', 'activity:test-123');
    });
  });
});
