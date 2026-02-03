/**
 * Participant service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// Create mock functions
const mockParticipant = {
  findUnique: jest.fn() as AnyMock,
  count: jest.fn() as AnyMock,
  create: jest.fn() as AnyMock,
  update: jest.fn() as AnyMock,
  deleteMany: jest.fn() as AnyMock,
};

const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    $transaction: mockTransaction,
  },
}));

// Import after mocking
const { getOrCreateParticipant, resetParticipants } = await import('../../services/participant.js');

describe('Participant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({ participant: mockParticipant });
    });
  });

  describe('getOrCreateParticipant - Guest Role', () => {
    it('should return existing participant if fingerprint exists', async () => {
      const existingParticipant = {
        id: 'existing-id',
        deviceFingerprint: 'test-fp',
        designation: 'A',
        role: 'guest',
      };
      mockParticipant.findUnique.mockResolvedValue(existingParticipant);

      const result = await getOrCreateParticipant('test-fp', 'guest');

      expect(result).toEqual({
        participantId: 'existing-id',
        designation: 'A',
      });
    });

    it('should create participant A for first guest device', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.count.mockResolvedValue(0);
      mockParticipant.create.mockResolvedValue({
        id: 'new-id',
        designation: 'A',
      });

      const result = await getOrCreateParticipant('new-fp', 'guest');

      expect(result.designation).toBe('A');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should create participant B for second guest device', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.count.mockResolvedValue(1);
      mockParticipant.create.mockResolvedValue({
        id: 'new-id',
        designation: 'B',
      });

      const result = await getOrCreateParticipant('new-fp', 'guest');

      expect(result.designation).toBe('B');
    });

    it('should create readonly participant for third+ guest device', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.count.mockResolvedValue(5);
      mockParticipant.create.mockResolvedValue({
        id: 'new-id',
        designation: 'readonly',
      });

      const result = await getOrCreateParticipant('new-fp', 'guest');

      expect(result.designation).toBe('readonly');
    });
  });

  describe('getOrCreateParticipant - Admin Role', () => {
    it('should return null designation for admin', async () => {
      mockParticipant.findUnique.mockResolvedValue({
        id: 'admin-id',
        role: 'admin',
        designation: 'readonly',
      });

      const result = await getOrCreateParticipant('admin-fp', 'admin');

      expect(result.designation).toBeNull();
    });

    it('should create new admin participant if not exists', async () => {
      mockParticipant.findUnique.mockResolvedValue(null);
      mockParticipant.create.mockResolvedValue({
        id: 'new-admin-id',
        role: 'admin',
        designation: 'readonly',
      });

      const result = await getOrCreateParticipant('new-admin-fp', 'admin');

      expect(result.designation).toBeNull();
      expect(mockParticipant.create).toHaveBeenCalledWith({
        data: {
          deviceFingerprint: 'new-admin-fp',
          designation: 'readonly',
          role: 'admin',
        },
      });
    });

    it('should upgrade guest to admin', async () => {
      mockParticipant.findUnique.mockResolvedValue({
        id: 'guest-id',
        role: 'guest',
        designation: 'A',
      });
      mockParticipant.update.mockResolvedValue({
        id: 'guest-id',
        role: 'admin',
      });

      const result = await getOrCreateParticipant('guest-fp', 'admin');

      expect(mockParticipant.update).toHaveBeenCalled();
      expect(result.designation).toBeNull();
    });
  });

  describe('resetParticipants', () => {
    it('should delete all guest participants', async () => {
      mockParticipant.deleteMany.mockResolvedValue({ count: 2 });

      await resetParticipants();

      expect(mockParticipant.deleteMany).toHaveBeenCalledWith({
        where: { role: 'guest' },
      });
    });
  });
});
