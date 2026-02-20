/**
 * Health routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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

const { default: request } = await import('supertest');
const { app } = await import('../../index.js');

describe('Health Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 with healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    it('should include a timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.data.timestamp).toBeDefined();
      // Verify it is a valid ISO 8601 timestamp
      expect(new Date(response.body.data.timestamp).toISOString()).toBe(response.body.data.timestamp);
    });

    it('should include a version string', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.data.version).toBeDefined();
      expect(typeof response.body.data.version).toBe('string');
    });

    it('should not require authentication', async () => {
      // No cookies or auth headers
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
    });
  });
});
