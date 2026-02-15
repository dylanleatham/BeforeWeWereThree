/**
 * Would You Rather service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetPromptByEnvelopeId = jest.fn() as AnyMock;
const mockGetPromptById = jest.fn() as AnyMock;
const mockGetVoteForParticipant = jest.fn() as AnyMock;
const mockGetVotesForPrompt = jest.fn() as AnyMock;
const mockCountVotesForPrompt = jest.fn() as AnyMock;
const mockUpdateEnvelopeStatus = jest.fn() as AnyMock;

// Mock realtime service
const mockSendToGroup = jest.fn() as AnyMock;
const mockGetRealtimeService = jest.fn() as AnyMock;

// Mock Prisma transaction
const mockWyrPromptFindUnique = jest.fn() as AnyMock;
const mockWyrVoteFindUnique = jest.fn() as AnyMock;
const mockWyrVoteCreate = jest.fn() as AnyMock;
const mockWyrVoteCount = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/wyr.js', () => ({
  getPromptByEnvelopeId: mockGetPromptByEnvelopeId,
  getPromptById: mockGetPromptById,
  getVoteForParticipant: mockGetVoteForParticipant,
  getVotesForPrompt: mockGetVotesForPrompt,
  countVotesForPrompt: mockCountVotesForPrompt,
}));

jest.unstable_mockModule('../../db/queries/envelopes.js', () => ({
  updateEnvelopeStatus: mockUpdateEnvelopeStatus,
}));

jest.unstable_mockModule('../../services/realtime.js', () => ({
  getRealtimeService: mockGetRealtimeService,
}));

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    $transaction: mockTransaction,
  },
}));

// Import after mocking
const { getPromptState, submitVote, validatePrompt, hasVoted, getVoteCount } =
  await import('../../services/wyr.js');

// Test fixtures
const PROMPT = {
  id: 'prompt-1',
  envelopeId: 'env-1',
  optionA: 'Travel the world',
  optionB: 'Stay home forever',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PARTICIPANT_A = 'participant-a';
const PARTICIPANT_B = 'participant-b';

describe('WYR Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRealtimeService.mockReturnValue({
      sendToGroup: mockSendToGroup,
    });
    mockSendToGroup.mockResolvedValue(undefined);
    mockUpdateEnvelopeStatus.mockResolvedValue(null);

    // Default transaction implementation
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        wyrPrompt: { findUnique: mockWyrPromptFindUnique },
        wyrVote: {
          findUnique: mockWyrVoteFindUnique,
          create: mockWyrVoteCreate,
          count: mockWyrVoteCount,
        },
      });
    });
  });

  // ================================================================
  // getPromptState
  // ================================================================
  describe('getPromptState', () => {
    it('should return null if no prompt exists for envelope', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(null);

      const result = await getPromptState('env-1', PARTICIPANT_A);

      expect(result).toBeNull();
    });

    it('should return prompt with no votes', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetVoteForParticipant.mockResolvedValue(null);
      mockGetVotesForPrompt.mockResolvedValue([]);

      const result = await getPromptState('env-1', PARTICIPANT_A);

      expect(result).toEqual({
        prompt: PROMPT,
        myVote: null,
        partnerVoted: false,
        results: null,
      });
    });

    it('should return my vote when I have voted but partner has not', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetVoteForParticipant.mockResolvedValue({
        id: 'vote-1',
        promptId: PROMPT.id,
        participantId: PARTICIPANT_A,
        choice: 'option_a',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      mockGetVotesForPrompt.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
      ]);

      const result = await getPromptState('env-1', PARTICIPANT_A);

      expect(result!.myVote).toBe('option_a');
      expect(result!.partnerVoted).toBe(false);
      expect(result!.results).toBeNull();
    });

    it('should return results when both have voted', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetVoteForParticipant.mockResolvedValue({
        id: 'vote-1',
        promptId: PROMPT.id,
        participantId: PARTICIPANT_A,
        choice: 'option_a',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      mockGetVotesForPrompt.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_b' },
      ]);

      const result = await getPromptState('env-1', PARTICIPANT_A);

      expect(result!.partnerVoted).toBe(true);
      expect(result!.results).toEqual({
        myChoice: 'option_a',
        partnerChoice: 'option_b',
        isMatch: false,
      });
    });

    it('should detect matching votes', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetVoteForParticipant.mockResolvedValue({
        id: 'vote-1',
        promptId: PROMPT.id,
        participantId: PARTICIPANT_A,
        choice: 'option_a',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      mockGetVotesForPrompt.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_a' },
      ]);

      const result = await getPromptState('env-1', PARTICIPANT_A);

      expect(result!.results!.isMatch).toBe(true);
    });
  });

  // ================================================================
  // submitVote
  // ================================================================
  describe('submitVote', () => {
    it('should throw PROMPT_NOT_FOUND if prompt does not exist', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(null);

      await expect(submitVote('prompt-1', PARTICIPANT_A, 'option_a')).rejects.toThrow(
        'PROMPT_NOT_FOUND'
      );
    });

    it('should throw ALREADY_VOTED if participant already voted', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT);
      mockWyrVoteFindUnique.mockResolvedValue({ id: 'existing-vote' });

      await expect(submitVote('prompt-1', PARTICIPANT_A, 'option_a')).rejects.toThrow(
        'ALREADY_VOTED'
      );
    });

    it('should create vote and broadcast via SignalR', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(1); // Only one vote so far

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result).toEqual({ revealed: false });
      expect(mockWyrVoteCreate).toHaveBeenCalledWith({
        data: {
          promptId: 'prompt-1',
          participantId: PARTICIPANT_A,
          choice: 'option_a',
        },
      });
      expect(mockSendToGroup).toHaveBeenCalledWith(
        'activity:env-1',
        expect.objectContaining({
          target: 'wyrVoteSubmitted',
        })
      );
    });

    it('should reveal results and complete envelope when both have voted', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(2); // Both voted now
      mockGetVotesForPrompt.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_b' },
      ]);

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result.revealed).toBe(true);
      expect(result.results).toEqual({
        myChoice: 'option_a',
        partnerChoice: 'option_b',
        isMatch: false,
      });
      expect(mockUpdateEnvelopeStatus).toHaveBeenCalledWith('env-1', 'completed');
      // Should broadcast both vote submitted and reveal ready
      expect(mockSendToGroup).toHaveBeenCalledTimes(2);
      expect(mockSendToGroup).toHaveBeenCalledWith(
        'activity:env-1',
        expect.objectContaining({ target: 'wyrRevealReady' })
      );
    });

    it('should not broadcast if realtime service is null', async () => {
      mockGetRealtimeService.mockReturnValue(null);
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(1);

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result).toEqual({ revealed: false });
      expect(mockSendToGroup).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // validatePrompt
  // ================================================================
  describe('validatePrompt', () => {
    it('should return true if prompt exists', async () => {
      mockGetPromptById.mockResolvedValue(PROMPT);

      expect(await validatePrompt('prompt-1')).toBe(true);
    });

    it('should return false if prompt does not exist', async () => {
      mockGetPromptById.mockResolvedValue(null);

      expect(await validatePrompt('nonexistent')).toBe(false);
    });
  });

  // ================================================================
  // hasVoted
  // ================================================================
  describe('hasVoted', () => {
    it('should return true if participant has voted', async () => {
      mockGetVoteForParticipant.mockResolvedValue({ id: 'vote-1' });

      expect(await hasVoted('prompt-1', PARTICIPANT_A)).toBe(true);
    });

    it('should return false if participant has not voted', async () => {
      mockGetVoteForParticipant.mockResolvedValue(null);

      expect(await hasVoted('prompt-1', PARTICIPANT_A)).toBe(false);
    });
  });

  // ================================================================
  // getVoteCount
  // ================================================================
  describe('getVoteCount', () => {
    it('should return count from db query', async () => {
      mockCountVotesForPrompt.mockResolvedValue(2);

      expect(await getVoteCount('prompt-1')).toBe(2);
    });
  });
});
