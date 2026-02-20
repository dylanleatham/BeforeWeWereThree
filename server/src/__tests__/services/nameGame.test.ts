/**
 * Name Game service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetNameGameState = jest.fn() as AnyMock;
const mockGetExcludedNames = jest.fn() as AnyMock;
const mockCreateNames = jest.fn() as AnyMock;
const mockUpdateRoundStatus = jest.fn() as AnyMock;
const mockGetRoundResults = jest.fn() as AnyMock;
const mockGetAccumulatedMatchesQuery = jest.fn() as AnyMock;
const mockGetRoundCount = jest.fn() as AnyMock;
const mockGetRoundIdForName = jest.fn() as AnyMock;
const mockGetGuidanceForRound = jest.fn() as AnyMock;
const mockGetPendingGuidanceState = jest.fn() as AnyMock;

// Mock AI generation
const mockGenerateNames = jest.fn() as AnyMock;

// Mock realtime
const mockSendToGroup = jest.fn() as AnyMock;
const mockGetRealtimeService = jest.fn() as AnyMock;

// Mock logger
const mockLoggerInfo = jest.fn() as AnyMock;
const mockLoggerError = jest.fn() as AnyMock;

// Mock Prisma models for transactions
const mockNameGameRoundFindFirst = jest.fn() as AnyMock;
const mockNameGameRoundCreate = jest.fn() as AnyMock;
const mockNameGameRoundDelete = jest.fn() as AnyMock;
const mockNameGameGuidanceFindUnique = jest.fn() as AnyMock;
const mockNameGameGuidanceCreate = jest.fn() as AnyMock;
const mockNameGameGuidanceCount = jest.fn() as AnyMock;
const mockNameGameGuidanceDeleteMany = jest.fn() as AnyMock;
const mockNameGameVoteFindUnique = jest.fn() as AnyMock;
const mockNameGameVoteCreate = jest.fn() as AnyMock;
const mockNameGameVoteCount = jest.fn() as AnyMock;
const mockNameGameVoteGroupBy = jest.fn() as AnyMock;
const mockNameGameNameCount = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/nameGame.js', () => ({
  getNameGameState: mockGetNameGameState,
  getExcludedNames: mockGetExcludedNames,
  createNames: mockCreateNames,
  updateRoundStatus: mockUpdateRoundStatus,
  getRoundResults: mockGetRoundResults,
  getAccumulatedMatches: mockGetAccumulatedMatchesQuery,
  getRoundCount: mockGetRoundCount,
  getRoundIdForName: mockGetRoundIdForName,
  getGuidanceForRound: mockGetGuidanceForRound,
  getPendingGuidanceState: mockGetPendingGuidanceState,
  getEnvelopeIdForName: jest.fn(),
}));

jest.unstable_mockModule('../../services/anthropic.js', () => ({
  generateNames: mockGenerateNames,
}));

jest.unstable_mockModule('../../services/realtime.js', () => ({
  getRealtimeService: mockGetRealtimeService,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    $transaction: mockTransaction,
    nameGameRound: { delete: mockNameGameRoundDelete },
    nameGameGuidance: { deleteMany: mockNameGameGuidanceDeleteMany },
  },
}));

const { getNameGameState: getState, submitGuidance, submitVote, getAccumulatedMatches } =
  await import('../../services/nameGame.js');

// Test fixtures
const ENVELOPE_ID = 'env-1';
const PARTICIPANT_A = 'participant-a';
const PARTICIPANT_B = 'participant-b';

const GENERATED_NAMES = [
  { id: 'name-1', name: 'Luna', origin: 'Latin', meaning: 'Moon' },
  { id: 'name-2', name: 'Kai', origin: 'Hawaiian', meaning: 'Sea' },
];

describe('Name Game Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRealtimeService.mockReturnValue({
      sendToGroup: mockSendToGroup,
    });
    mockSendToGroup.mockResolvedValue(undefined);
  });

  // ================================================================
  // getNameGameState
  // ================================================================
  describe('getNameGameState', () => {
    it('should return combined state with current round, matches, and count', async () => {
      const roundData = { roundId: 'r1', roundNumber: 1, names: [], allVoted: false };
      mockGetNameGameState.mockResolvedValue(roundData);
      mockGetAccumulatedMatchesQuery.mockResolvedValue([]);
      mockGetRoundCount.mockResolvedValue(1);
      mockGetPendingGuidanceState.mockResolvedValue(null);

      const result = await getState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result.currentRound).toEqual(roundData);
      expect(result.allMatches).toEqual([]);
      expect(result.roundCount).toBe(1);
      expect(result.pendingGuidance).toBeUndefined();
    });

    it('should include pending guidance when present', async () => {
      mockGetNameGameState.mockResolvedValue(null);
      mockGetAccumulatedMatchesQuery.mockResolvedValue([]);
      mockGetRoundCount.mockResolvedValue(0);
      mockGetPendingGuidanceState.mockResolvedValue({
        myGuidanceSubmitted: true,
        partnerGuidanceSubmitted: false,
      });

      const result = await getState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result.pendingGuidance).toEqual({
        myGuidanceSubmitted: true,
        partnerGuidanceSubmitted: false,
      });
    });
  });

  // ================================================================
  // submitGuidance
  // ================================================================
  describe('submitGuidance', () => {
    const txMock = {
      nameGameRound: {
        findFirst: mockNameGameRoundFindFirst,
        create: mockNameGameRoundCreate,
      },
      nameGameGuidance: {
        findUnique: mockNameGameGuidanceFindUnique,
        create: mockNameGameGuidanceCreate,
        count: mockNameGameGuidanceCount,
      },
    };

    beforeEach(() => {
      mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
        return callback(txMock);
      });
    });

    it('should return waiting_for_partner on round 2+ when first to submit', async () => {
      // Last round exists (round 1)
      mockNameGameRoundFindFirst.mockResolvedValue({ roundNumber: 1 });
      // No existing ready round for round 2
      mockNameGameRoundFindFirst
        .mockResolvedValueOnce({ roundNumber: 1 })
        .mockResolvedValueOnce(null);
      // No existing guidance
      mockNameGameGuidanceFindUnique.mockResolvedValue(null);
      // Creates guidance
      mockNameGameGuidanceCreate.mockResolvedValue({});
      // Only 1 guidance so far
      mockNameGameGuidanceCount.mockResolvedValue(1);

      const result = await submitGuidance(ENVELOPE_ID, PARTICIPANT_A, 'More nature names');

      expect(result.status).toBe('waiting_for_partner');
      expect(mockSendToGroup).toHaveBeenCalledWith(
        `activity:${ENVELOPE_ID}`,
        expect.objectContaining({ target: 'nameGuidanceSubmitted' })
      );
    });

    it('should return already_submitted if guidance already exists', async () => {
      mockNameGameRoundFindFirst
        .mockResolvedValueOnce(null) // no last round
        .mockResolvedValueOnce(null); // no ready round
      mockNameGameGuidanceFindUnique.mockResolvedValue({ id: 'existing' });

      const result = await submitGuidance(ENVELOPE_ID, PARTICIPANT_A);

      expect(result.status).toBe('waiting_for_partner');
    });

    it('should generate names on round 1 first submission', async () => {
      // No existing rounds
      mockNameGameRoundFindFirst
        .mockResolvedValueOnce(null) // no last round
        .mockResolvedValueOnce(null); // no ready round
      mockNameGameGuidanceFindUnique.mockResolvedValue(null);
      mockNameGameGuidanceCreate.mockResolvedValue({});
      mockNameGameGuidanceCount.mockResolvedValue(1); // 1 >= 1 for round 1
      mockNameGameRoundCreate.mockResolvedValue({ id: 'round-1' });

      // Outside transaction: generation
      mockGetExcludedNames.mockResolvedValue([]);
      mockGetGuidanceForRound.mockResolvedValue([]);
      mockGenerateNames.mockResolvedValue({ names: GENERATED_NAMES });
      mockCreateNames.mockResolvedValue(GENERATED_NAMES);
      mockUpdateRoundStatus.mockResolvedValue(undefined);

      const result = await submitGuidance(ENVELOPE_ID, PARTICIPANT_A);

      expect(result.status).toBe('round_generated');
      expect(mockGenerateNames).toHaveBeenCalled();
      expect(mockCreateNames).toHaveBeenCalledWith('round-1', GENERATED_NAMES);
      expect(mockUpdateRoundStatus).toHaveBeenCalledWith('round-1', 'ready');
    });

    it('should clean up on generation failure', async () => {
      // Setup for generation trigger
      mockNameGameRoundFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockNameGameGuidanceFindUnique.mockResolvedValue(null);
      mockNameGameGuidanceCreate.mockResolvedValue({});
      mockNameGameGuidanceCount.mockResolvedValue(1);
      mockNameGameRoundCreate.mockResolvedValue({ id: 'round-1' });

      // Generation fails
      mockGetExcludedNames.mockResolvedValue([]);
      mockGetGuidanceForRound.mockResolvedValue([]);
      mockGenerateNames.mockRejectedValue(new Error('API error'));
      mockNameGameRoundDelete.mockResolvedValue({});
      mockNameGameGuidanceDeleteMany.mockResolvedValue({});

      await expect(submitGuidance(ENVELOPE_ID, PARTICIPANT_A)).rejects.toThrow('API error');

      expect(mockNameGameRoundDelete).toHaveBeenCalledWith({ where: { id: 'round-1' } });
      expect(mockNameGameGuidanceDeleteMany).toHaveBeenCalled();
    });
  });

  // ================================================================
  // submitVote
  // ================================================================
  describe('submitVote', () => {
    const txMock = {
      nameGameVote: {
        findUnique: mockNameGameVoteFindUnique,
        create: mockNameGameVoteCreate,
        count: mockNameGameVoteCount,
        groupBy: mockNameGameVoteGroupBy,
      },
      nameGameName: {
        count: mockNameGameNameCount,
      },
    };

    beforeEach(() => {
      mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
        return callback(txMock);
      });
    });

    it('should throw NAME_NOT_FOUND if name does not exist', async () => {
      mockGetRoundIdForName.mockResolvedValue(null);

      await expect(
        submitVote('nonexistent', PARTICIPANT_A, 'love', ENVELOPE_ID)
      ).rejects.toThrow('NAME_NOT_FOUND');
    });

    it('should throw ALREADY_VOTED if already voted on this name', async () => {
      mockGetRoundIdForName.mockResolvedValue('round-1');
      mockNameGameVoteFindUnique.mockResolvedValue({ id: 'existing-vote' });

      await expect(
        submitVote('name-1', PARTICIPANT_A, 'love', ENVELOPE_ID)
      ).rejects.toThrow('ALREADY_VOTED');
    });

    it('should submit vote and return allVoted=false when round incomplete', async () => {
      mockGetRoundIdForName.mockResolvedValue('round-1');
      mockNameGameVoteFindUnique.mockResolvedValue(null);
      mockNameGameVoteCreate.mockResolvedValue({});
      mockNameGameVoteCount.mockResolvedValue(5);
      mockNameGameNameCount.mockResolvedValue(10);
      mockNameGameVoteGroupBy.mockResolvedValue([
        { participantId: PARTICIPANT_A, _count: { id: 5 } },
      ]);

      const result = await submitVote('name-1', PARTICIPANT_A, 'love', ENVELOPE_ID);

      expect(result.allVoted).toBe(false);
      expect(mockSendToGroup).toHaveBeenCalledWith(
        `activity:${ENVELOPE_ID}`,
        expect.objectContaining({ target: 'nameVoteSubmitted' })
      );
    });

    it('should compute results when round is complete', async () => {
      mockGetRoundIdForName.mockResolvedValue('round-1');
      mockNameGameVoteFindUnique.mockResolvedValue(null);
      mockNameGameVoteCreate.mockResolvedValue({});
      mockNameGameVoteCount.mockResolvedValue(10);
      mockNameGameNameCount.mockResolvedValue(10);
      mockNameGameVoteGroupBy.mockResolvedValue([
        { participantId: PARTICIPANT_A, _count: { id: 10 } },
        { participantId: PARTICIPANT_B, _count: { id: 10 } },
      ]);

      // Mock round results for computeRoundResults
      mockGetRoundResults.mockResolvedValue([
        {
          name: GENERATED_NAMES[0],
          votes: [
            { participantId: PARTICIPANT_A, choice: 'love' },
            { participantId: PARTICIPANT_B, choice: 'love' },
          ],
        },
        {
          name: GENERATED_NAMES[1],
          votes: [
            { participantId: PARTICIPANT_A, choice: 'love' },
            { participantId: PARTICIPANT_B, choice: 'maybe' },
          ],
        },
      ]);

      const result = await submitVote('name-1', PARTICIPANT_A, 'love', ENVELOPE_ID);

      expect(result.allVoted).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results!.matches).toHaveLength(1);
      expect(result.results!.matches[0]!.name).toBe('Luna');
      expect(result.results!.nearMisses).toHaveLength(1);
      expect(result.results!.nearMisses[0]!.name).toBe('Kai');
      expect(mockSendToGroup).toHaveBeenCalledWith(
        `activity:${ENVELOPE_ID}`,
        expect.objectContaining({ target: 'nameRoundComplete' })
      );
    });
  });

  // ================================================================
  // getAccumulatedMatches
  // ================================================================
  describe('getAccumulatedMatches', () => {
    it('should delegate to query function', async () => {
      mockGetAccumulatedMatchesQuery.mockResolvedValue(GENERATED_NAMES);

      const result = await getAccumulatedMatches(ENVELOPE_ID);

      expect(result).toEqual(GENERATED_NAMES);
    });
  });
});
