/**
 * Auth routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create typed mock functions
const mockParticipant = {
  findUnique: jest.fn<() => Promise<unknown>>(),
  count: jest.fn<() => Promise<number>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
};

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
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

// Import after mocking
const { default: request } = await import('supertest');
const { app } = await import('../../index.js');

const mockParticipantA = {
  id: 'participant-a-id',
  deviceFingerprint: 'fingerprint-a',
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

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/validate-pin', () => {
    it('should return 400 for missing PIN', async () => {
      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ deviceFingerprint: 'test-fp' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing fingerprint', async () => {
      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '01152025' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid PIN format', async () => {
      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '1234567', deviceFingerprint: 'test-fp' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid date PIN', async () => {
      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '13012025', deviceFingerprint: 'test-fp' });

      expect(response.status).toBe(400);
    });

    it('should return 401 for wrong PIN', async () => {
      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '06152024', deviceFingerprint: 'test-fp' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PIN');
    });

    it('should return success for valid guest PIN', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.count.mockResolvedValue(0);
      mockParticipant.create.mockResolvedValue(mockParticipantA);

      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '01152025', deviceFingerprint: 'test-fp' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('guest');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return success for valid admin PIN', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.create.mockResolvedValue(mockAdminParticipant);

      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '12251990', deviceFingerprint: 'admin-fp' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
    });

    it('should return existing participant', async () => {
      mockParticipant.findUnique.mockResolvedValue(mockParticipantA);

      const response = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '01152025', deviceFingerprint: 'fingerprint-a' });

      expect(response.status).toBe(200);
      expect(response.body.data.participantId).toBe(mockParticipantA.id);
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return 401 if no session cookie', async () => {
      const response = await request(app).get('/api/auth/session');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return session info for authenticated user', async () => {
      mockParticipant.findUnique.mockResolvedValue(mockParticipantA);

      const loginResponse = await request(app)
        .post('/api/auth/validate-pin')
        .send({ pin: '01152025', deviceFingerprint: 'fingerprint-a' });

      const cookies = loginResponse.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();

      const sessionResponse = await request(app)
        .get('/api/auth/session')
        .set('Cookie', cookies!);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.data.role).toBe('guest');
      expect(sessionResponse.body.data.expiresAt).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
  });
});
