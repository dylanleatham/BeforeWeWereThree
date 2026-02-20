/**
 * Admin service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Create mock functions for all models used in resetSession
const mockLetter = {
  deleteMany: jest.fn() as AnyMock,
};

const mockWyrVote = {
  deleteMany: jest.fn() as AnyMock,
};

const mockParticipant = {
  deleteMany: jest.fn() as AnyMock,
};

const mockPhoto = {
  deleteMany: jest.fn() as AnyMock,
};

const mockNameGameVote = {
  deleteMany: jest.fn() as AnyMock,
};

const mockNameGameName = {
  deleteMany: jest.fn() as AnyMock,
};

const mockNameGameRound = {
  deleteMany: jest.fn() as AnyMock,
};

const mockNameGameGuidance = {
  deleteMany: jest.fn() as AnyMock,
};

const mockTriviaAnswer = {
  deleteMany: jest.fn() as AnyMock,
};

const mockGenderRevealConfig = {
  updateMany: jest.fn() as AnyMock,
};

const mockEnvelope = {
  updateMany: jest.fn() as AnyMock,
};

const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    letter: mockLetter,
    wyrVote: mockWyrVote,
    photo: mockPhoto,
    nameGameVote: mockNameGameVote,
    nameGameName: mockNameGameName,
    nameGameRound: mockNameGameRound,
    nameGameGuidance: mockNameGameGuidance,
    triviaAnswer: mockTriviaAnswer,
    genderRevealConfig: mockGenderRevealConfig,
    participant: mockParticipant,
    envelope: mockEnvelope,
    $transaction: mockTransaction,
  },
}));

// Import after mocking
const { resetSession } = await import('../../services/admin.js');

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock transaction to execute the callback with our mocked tx
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
        genderRevealConfig: mockGenderRevealConfig,
        participant: mockParticipant,
        envelope: mockEnvelope,
      });
    });
  });

  describe('resetSession', () => {
    it('should delete all letters', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 5 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 2 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 2 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 3 });

      const result = await resetSession();

      expect(mockLetter.deleteMany).toHaveBeenCalled();
      expect(result.lettersDeleted).toBe(5);
    });

    it('should delete all WYR votes', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 0 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 10 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 2 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 3 });

      const result = await resetSession();

      expect(mockWyrVote.deleteMany).toHaveBeenCalled();
      expect(result.votesDeleted).toBe(10);
    });

    it('should delete all photos', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 0 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 0 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 4 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 2 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 3 });

      const result = await resetSession();

      expect(mockPhoto.deleteMany).toHaveBeenCalled();
      expect(result.photosDeleted).toBe(4);
    });

    it('should delete all guest participants', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 0 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 0 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 3 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 5 });

      const result = await resetSession();

      expect(mockParticipant.deleteMany).toHaveBeenCalledWith({
        where: { role: 'guest' },
      });
      expect(result.participantsDeleted).toBe(3);
    });

    it('should reset all envelopes to sealed status', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 0 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 0 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 0 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 7 });

      const result = await resetSession();

      expect(mockEnvelope.updateMany).toHaveBeenCalledWith({
        where: { type: { not: 'friend-letter' } },
        data: { status: 'sealed' },
      });
      expect(result.envelopesReset).toBe(7);
    });

    it('should run all operations in a transaction', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 1 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 2 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 3 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 4 });

      await resetSession();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should return all reset counts', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 2 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 4 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 3 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 8 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 10 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 1 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 2 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 5 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 1 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 1 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 6 });

      const result = await resetSession();

      expect(result).toEqual({
        message: 'Session reset successfully',
        lettersDeleted: 2,
        votesDeleted: 4,
        photosDeleted: 3,
        nameVotesDeleted: 8,
        nameNamesDeleted: 10,
        nameRoundsDeleted: 1,
        nameGuidanceDeleted: 2,
        triviaAnswersDeleted: 5,
        genderRevealReset: 1,
        participantsDeleted: 1,
        envelopesReset: 6,
      });
    });

    it('should handle zero counts gracefully', async () => {
      mockLetter.deleteMany.mockResolvedValue({ count: 0 });
      mockWyrVote.deleteMany.mockResolvedValue({ count: 0 });
      mockPhoto.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameVote.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameName.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameRound.deleteMany.mockResolvedValue({ count: 0 });
      mockNameGameGuidance.deleteMany.mockResolvedValue({ count: 0 });
      mockTriviaAnswer.deleteMany.mockResolvedValue({ count: 0 });
      mockGenderRevealConfig.updateMany.mockResolvedValue({ count: 0 });
      mockParticipant.deleteMany.mockResolvedValue({ count: 0 });
      mockEnvelope.updateMany.mockResolvedValue({ count: 0 });

      const result = await resetSession();

      expect(result).toEqual({
        message: 'Session reset successfully',
        lettersDeleted: 0,
        votesDeleted: 0,
        photosDeleted: 0,
        nameVotesDeleted: 0,
        nameNamesDeleted: 0,
        nameRoundsDeleted: 0,
        nameGuidanceDeleted: 0,
        triviaAnswersDeleted: 0,
        genderRevealReset: 0,
        participantsDeleted: 0,
        envelopesReset: 0,
      });
    });
  });
});
