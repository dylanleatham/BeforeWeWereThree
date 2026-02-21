/**
 * Envelope routes integration tests
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

// Mock envelope query functions
const mockGetAllEnvelopes = jest.fn() as AnyMock;
const mockGetParticipantEnvelopes = jest.fn() as AnyMock;
const mockGetEnvelopeById = jest.fn() as AnyMock;
const mockCreateEnvelope = jest.fn() as AnyMock;
const mockUpdateEnvelope = jest.fn() as AnyMock;
const mockDeleteEnvelope = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/envelopes.js', () => ({
  getAllEnvelopes: mockGetAllEnvelopes,
  getParticipantEnvelopes: mockGetParticipantEnvelopes,
  getEnvelopeById: mockGetEnvelopeById,
  createEnvelope: mockCreateEnvelope,
  updateEnvelope: mockUpdateEnvelope,
  deleteEnvelope: mockDeleteEnvelope,
  updateEnvelopeStatus: jest.fn() as AnyMock,
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

const mockEnvelope = {
  id: 'env-1',
  title: 'Test Envelope',
  type: 'would-you-rather',
  status: 'sealed',
  order: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('Envelope Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // GET /api/envelopes
  // ================================================================
  describe('GET /api/envelopes', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/envelopes');
      expect(res.status).toBe(401);
    });

    it('should return envelopes list for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetParticipantEnvelopes.mockResolvedValue([mockEnvelope]);

      const res = await request(app)
        .get('/api/envelopes')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.envelopes).toHaveLength(1);
      expect(res.body.data.envelopes[0].title).toBe('Test Envelope');
    });

    it('should return 500 if query fails', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetParticipantEnvelopes.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get('/api/envelopes')
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // GET /api/envelopes/:id
  // ================================================================
  describe('GET /api/envelopes/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/envelopes/env-1');
      expect(res.status).toBe(401);
    });

    it('should return 404 if envelope not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/envelopes/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should return envelope by ID', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue(mockEnvelope);

      const res = await request(app)
        .get('/api/envelopes/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.envelope.id).toBe('env-1');
    });
  });

  // ================================================================
  // POST /api/envelopes
  // ================================================================
  describe('POST /api/envelopes', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/envelopes')
        .send({ title: 'New', type: 'letter', order: 0 });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/envelopes')
        .set('Cookie', cookies)
        .send({ title: 'New', type: 'letter', order: 0 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .post('/api/envelopes')
        .set('Cookie', cookies)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create envelope for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const newEnvelope = { ...mockEnvelope, id: 'env-new', title: 'New Envelope' };
      mockCreateEnvelope.mockResolvedValue(newEnvelope);

      const res = await request(app)
        .post('/api/envelopes')
        .set('Cookie', cookies)
        .send({ title: 'New Envelope', type: 'would-you-rather', order: 0 });

      expect(res.status).toBe(201);
      expect(res.body.data.envelope.title).toBe('New Envelope');
    });

    it('should return 500 if creation fails', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockCreateEnvelope.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/envelopes')
        .set('Cookie', cookies)
        .send({ title: 'New', type: 'letter', order: 1 });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/envelopes/:id/open
  // ================================================================
  describe('POST /api/envelopes/:id/open', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/envelopes/env-1/open');
      expect(res.status).toBe(401);
    });

    it('should return 404 if envelope not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/envelopes/nonexistent/open')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should open a sealed envelope', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetEnvelopeById.mockResolvedValue({ ...mockEnvelope, status: 'sealed' });
      mockUpdateEnvelope.mockResolvedValue({ ...mockEnvelope, status: 'opened' });

      const res = await request(app)
        .post('/api/envelopes/env-1/open')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.envelope.status).toBe('opened');
    });

    it('should return current state for already opened envelope', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      const openedEnvelope = { ...mockEnvelope, status: 'opened' };
      mockGetEnvelopeById.mockResolvedValue(openedEnvelope);

      const res = await request(app)
        .post('/api/envelopes/env-1/open')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.envelope.status).toBe('opened');
      // updateEnvelope should not be called since it is already opened
      expect(mockUpdateEnvelope).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // PATCH /api/envelopes/:id
  // ================================================================
  describe('PATCH /api/envelopes/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .patch('/api/envelopes/env-1')
        .send({ title: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .patch('/api/envelopes/env-1')
        .set('Cookie', cookies)
        .send({ title: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);

      const res = await request(app)
        .patch('/api/envelopes/env-1')
        .set('Cookie', cookies)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if envelope not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockUpdateEnvelope.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/envelopes/nonexistent')
        .set('Cookie', cookies)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should update envelope for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      const updated = { ...mockEnvelope, title: 'Updated Title' };
      mockUpdateEnvelope.mockResolvedValue(updated);

      const res = await request(app)
        .patch('/api/envelopes/env-1')
        .set('Cookie', cookies)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.envelope.title).toBe('Updated Title');
    });
  });

  // ================================================================
  // DELETE /api/envelopes/:id
  // ================================================================
  describe('DELETE /api/envelopes/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete('/api/envelopes/env-1');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .delete('/api/envelopes/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if envelope not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteEnvelope.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/envelopes/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENVELOPE_NOT_FOUND');
    });

    it('should delete envelope for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteEnvelope.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/envelopes/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('should return 500 if deletion fails', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockDeleteEnvelope.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .delete('/api/envelopes/env-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
