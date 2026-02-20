/**
 * Friend service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetFriendById = jest.fn() as AnyMock;
const mockGetFriendByPin = jest.fn() as AnyMock;
const mockDbCreateFriend = jest.fn() as AnyMock;
const mockDbDeleteFriend = jest.fn() as AnyMock;
const mockGetFriendLetters = jest.fn() as AnyMock;
const mockGetFriendLetterById = jest.fn() as AnyMock;
const mockDbCreateFriendLetter = jest.fn() as AnyMock;
const mockDbUpdateFriendLetter = jest.fn() as AnyMock;
const mockGetThankYouNote = jest.fn() as AnyMock;
const mockDbUpsertThankYouNote = jest.fn() as AnyMock;
const mockGetGuestPin = jest.fn() as AnyMock;
const mockGetAdminPin = jest.fn() as AnyMock;

// Mock Prisma transaction models
const mockFriendLetterUpdate = jest.fn() as AnyMock;
const mockEnvelopeAggregate = jest.fn() as AnyMock;
const mockEnvelopeCreate = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/friend.js', () => ({
  getFriendById: mockGetFriendById,
  getFriendByPin: mockGetFriendByPin,
  createFriend: mockDbCreateFriend,
  deleteFriend: mockDbDeleteFriend,
  getFriendLetters: mockGetFriendLetters,
  getFriendLetterById: mockGetFriendLetterById,
  createFriendLetter: mockDbCreateFriendLetter,
  updateFriendLetter: mockDbUpdateFriendLetter,
  getThankYouNote: mockGetThankYouNote,
  upsertThankYouNote: mockDbUpsertThankYouNote,
}));

jest.unstable_mockModule('../../db/queries/config.js', () => ({
  getGuestPin: mockGetGuestPin,
  getAdminPin: mockGetAdminPin,
}));

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    friend: {
      findMany: jest.fn() as AnyMock,
    },
    $transaction: mockTransaction,
  },
}));

const {
  createFriend,
  removeFriend,
  saveThankYouNote,
  getFriendLettersForAdmin,
  getFriendDashboard,
  createNewFriendLetter,
  saveFriendLetter,
  submitFriendLetterAndCreateEnvelope,
  getFriendLetterForCouple,
} = await import('../../services/friend.js');

// Test fixtures
const FRIEND = {
  id: 'friend-1',
  name: 'Alice',
  pin: '11112222',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const LETTER_DRAFT = {
  id: 'letter-1',
  friendId: 'friend-1',
  recipient: 'baby',
  title: null,
  content: 'Dear baby...',
  mediaUrl: null,
  mediaType: null,
  submittedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const LETTER_SUBMITTED = {
  ...LETTER_DRAFT,
  submittedAt: new Date('2026-01-02'),
};

describe('Friend Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGuestPin.mockResolvedValue('01152025');
    mockGetAdminPin.mockResolvedValue('12251990');
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        friendLetter: { update: mockFriendLetterUpdate },
        envelope: { aggregate: mockEnvelopeAggregate, create: mockEnvelopeCreate },
      });
    });
  });

  // ================================================================
  // createFriend
  // ================================================================
  describe('createFriend', () => {
    it('should create friend with unique PIN', async () => {
      mockGetFriendByPin.mockResolvedValue(null);
      mockDbCreateFriend.mockResolvedValue(FRIEND);

      const result = await createFriend('Alice', '11112222');

      expect(result).toEqual(FRIEND);
      expect(mockDbCreateFriend).toHaveBeenCalledWith('Alice', '11112222');
    });

    it('should throw PIN_ALREADY_EXISTS if PIN matches guest PIN', async () => {
      await expect(createFriend('Alice', '01152025')).rejects.toThrow('PIN_ALREADY_EXISTS');
      expect(mockDbCreateFriend).not.toHaveBeenCalled();
    });

    it('should throw PIN_ALREADY_EXISTS if PIN matches admin PIN', async () => {
      await expect(createFriend('Alice', '12251990')).rejects.toThrow('PIN_ALREADY_EXISTS');
      expect(mockDbCreateFriend).not.toHaveBeenCalled();
    });

    it('should throw PIN_ALREADY_EXISTS if PIN matches existing friend', async () => {
      mockGetFriendByPin.mockResolvedValue(FRIEND);

      await expect(createFriend('Bob', '11112222')).rejects.toThrow('PIN_ALREADY_EXISTS');
      expect(mockDbCreateFriend).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // removeFriend
  // ================================================================
  describe('removeFriend', () => {
    it('should delete friend by ID', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockDbDeleteFriend.mockResolvedValue(true);

      const result = await removeFriend('friend-1');

      expect(result).toBe(true);
      expect(mockDbDeleteFriend).toHaveBeenCalledWith('friend-1');
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(removeFriend('nonexistent')).rejects.toThrow('FRIEND_NOT_FOUND');
    });
  });

  // ================================================================
  // saveThankYouNote
  // ================================================================
  describe('saveThankYouNote', () => {
    it('should upsert thank-you note', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      const note = { id: 'note-1', friendId: 'friend-1', content: 'Thank you!' };
      mockDbUpsertThankYouNote.mockResolvedValue(note);

      const result = await saveThankYouNote('friend-1', { content: 'Thank you!' });

      expect(result).toEqual(note);
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(
        saveThankYouNote('nonexistent', { content: 'Thank you!' })
      ).rejects.toThrow('FRIEND_NOT_FOUND');
    });
  });

  // ================================================================
  // getFriendLettersForAdmin
  // ================================================================
  describe('getFriendLettersForAdmin', () => {
    it('should return friend and letters', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockGetFriendLetters.mockResolvedValue([LETTER_SUBMITTED]);

      const result = await getFriendLettersForAdmin('friend-1');

      expect(result.friend).toEqual(FRIEND);
      expect(result.letters).toEqual([LETTER_SUBMITTED]);
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(getFriendLettersForAdmin('nonexistent')).rejects.toThrow('FRIEND_NOT_FOUND');
    });
  });

  // ================================================================
  // getFriendDashboard
  // ================================================================
  describe('getFriendDashboard', () => {
    it('should return dashboard with friend info, letters, and thank-you note', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockGetThankYouNote.mockResolvedValue(null);
      mockGetFriendLetters.mockResolvedValue([LETTER_DRAFT]);

      const result = await getFriendDashboard('friend-1');

      expect(result.friend).toEqual({ id: 'friend-1', name: 'Alice' });
      expect(result.thankYouNote).toBeNull();
      expect(result.letters).toHaveLength(1);
      expect(result.letters[0]!.status).toBe('draft');
    });

    it('should mark submitted letters correctly', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockGetThankYouNote.mockResolvedValue(null);
      mockGetFriendLetters.mockResolvedValue([LETTER_SUBMITTED]);

      const result = await getFriendDashboard('friend-1');

      expect(result.letters[0]!.status).toBe('submitted');
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(getFriendDashboard('nonexistent')).rejects.toThrow('FRIEND_NOT_FOUND');
    });
  });

  // ================================================================
  // createNewFriendLetter
  // ================================================================
  describe('createNewFriendLetter', () => {
    it('should create a new letter draft', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockDbCreateFriendLetter.mockResolvedValue(LETTER_DRAFT);

      const result = await createNewFriendLetter('friend-1', 'baby');

      expect(result).toEqual(LETTER_DRAFT);
      expect(mockDbCreateFriendLetter).toHaveBeenCalledWith('friend-1', 'baby');
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(createNewFriendLetter('nonexistent', 'baby')).rejects.toThrow('FRIEND_NOT_FOUND');
    });
  });

  // ================================================================
  // saveFriendLetter
  // ================================================================
  describe('saveFriendLetter', () => {
    it('should update letter draft', async () => {
      mockGetFriendLetterById.mockResolvedValue(LETTER_DRAFT);
      const updated = { ...LETTER_DRAFT, content: 'Updated content' };
      mockDbUpdateFriendLetter.mockResolvedValue(updated);

      const result = await saveFriendLetter('friend-1', 'letter-1', { content: 'Updated content' });

      expect(result).toEqual(updated);
    });

    it('should throw LETTER_NOT_FOUND if letter does not exist', async () => {
      mockGetFriendLetterById.mockResolvedValue(null);

      await expect(
        saveFriendLetter('friend-1', 'nonexistent', { content: 'test' })
      ).rejects.toThrow('LETTER_NOT_FOUND');
    });

    it('should throw LETTER_NOT_FOUND if letter belongs to different friend', async () => {
      mockGetFriendLetterById.mockResolvedValue({ ...LETTER_DRAFT, friendId: 'other-friend' });

      await expect(
        saveFriendLetter('friend-1', 'letter-1', { content: 'test' })
      ).rejects.toThrow('LETTER_NOT_FOUND');
    });

    it('should throw ALREADY_SUBMITTED if letter was already submitted', async () => {
      mockGetFriendLetterById.mockResolvedValue(LETTER_SUBMITTED);

      await expect(
        saveFriendLetter('friend-1', 'letter-1', { content: 'test' })
      ).rejects.toThrow('ALREADY_SUBMITTED');
    });
  });

  // ================================================================
  // submitFriendLetterAndCreateEnvelope
  // ================================================================
  describe('submitFriendLetterAndCreateEnvelope', () => {
    it('should submit letter and create envelope in transaction', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockGetFriendLetterById.mockResolvedValue(LETTER_DRAFT);
      mockFriendLetterUpdate.mockResolvedValue({
        ...LETTER_DRAFT,
        content: 'Final content',
        submittedAt: new Date('2026-01-02'),
        recipient: 'baby',
      });
      mockEnvelopeAggregate.mockResolvedValue({ _max: { order: 5 } });
      mockEnvelopeCreate.mockResolvedValue({});

      const result = await submitFriendLetterAndCreateEnvelope(
        'friend-1',
        'letter-1',
        { content: 'Final content' }
      );

      expect(result.submittedAt).toBeDefined();
      expect(mockFriendLetterUpdate).toHaveBeenCalled();
      expect(mockEnvelopeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'friend-letter',
            status: 'sealed',
            order: 6,
            friendLetterId: 'letter-1',
          }),
        })
      );
    });

    it('should throw FRIEND_NOT_FOUND if friend does not exist', async () => {
      mockGetFriendById.mockResolvedValue(null);

      await expect(
        submitFriendLetterAndCreateEnvelope('nonexistent', 'letter-1', { content: 'test' })
      ).rejects.toThrow('FRIEND_NOT_FOUND');
    });

    it('should throw ALREADY_SUBMITTED if letter was already submitted', async () => {
      mockGetFriendById.mockResolvedValue(FRIEND);
      mockGetFriendLetterById.mockResolvedValue(LETTER_SUBMITTED);

      await expect(
        submitFriendLetterAndCreateEnvelope('friend-1', 'letter-1', { content: 'test' })
      ).rejects.toThrow('ALREADY_SUBMITTED');
    });
  });

  // ================================================================
  // getFriendLetterForCouple
  // ================================================================
  describe('getFriendLetterForCouple', () => {
    it('should return letter view for submitted letter', async () => {
      mockGetFriendLetterById.mockResolvedValue({
        ...LETTER_SUBMITTED,
        submittedAt: '2026-01-02T00:00:00.000Z',
      });
      mockGetFriendById.mockResolvedValue(FRIEND);

      const result = await getFriendLetterForCouple('letter-1');

      expect(result).not.toBeNull();
      expect(result!.friendName).toBe('Alice');
      expect(result!.content).toBe('Dear baby...');
    });

    it('should return null if letter not found', async () => {
      mockGetFriendLetterById.mockResolvedValue(null);

      const result = await getFriendLetterForCouple('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if letter not submitted', async () => {
      mockGetFriendLetterById.mockResolvedValue(LETTER_DRAFT);

      const result = await getFriendLetterForCouple('letter-1');

      expect(result).toBeNull();
    });
  });
});
