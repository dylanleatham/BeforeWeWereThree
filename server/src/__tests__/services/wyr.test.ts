/**
 * Would You Rather service tests
 * Tests multi-prompt envelope state, per-prompt voting, and envelope completion
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetPromptsByEnvelopeId = jest.fn() as AnyMock;
const mockGetPromptById = jest.fn() as AnyMock;
const mockGetVoteForParticipant = jest.fn() as AnyMock;
const mockCountVotesForPrompt = jest.fn() as AnyMock;
const mockGetVotesForPromptIds = jest.fn() as AnyMock;

// Mock realtime service
const mockSendToGroup = jest.fn() as AnyMock;
const mockGetRealtimeService = jest.fn() as AnyMock;

// Mock Prisma transaction
const mockWyrPromptFindUnique = jest.fn() as AnyMock;
const mockWyrPromptFindMany = jest.fn() as AnyMock;
const mockWyrVoteFindUnique = jest.fn() as AnyMock;
const mockWyrVoteFindMany = jest.fn() as AnyMock;
const mockWyrVoteCreate = jest.fn() as AnyMock;
const mockWyrVoteCount = jest.fn() as AnyMock;
const mockEnvelopeUpdate = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/wyr.js', () => ({
  getPromptsByEnvelopeId: mockGetPromptsByEnvelopeId,
  getPromptById: mockGetPromptById,
  getVoteForParticipant: mockGetVoteForParticipant,
  countVotesForPrompt: mockCountVotesForPrompt,
  getVotesForPromptIds: mockGetVotesForPromptIds,
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
const { getEnvelopeState, submitVote, validatePrompt, hasVoted, getVoteCount } =
  await import('../../services/wyr.js');

// Test fixtures
const PROMPT_1 = {
  id: 'prompt-1',
  envelopeId: 'env-1',
  optionA: 'Travel the world',
  optionB: 'Stay home forever',
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PROMPT_2 = {
  id: 'prompt-2',
  envelopeId: 'env-1',
  optionA: 'Be a cat',
  optionB: 'Be a dog',
  sortOrder: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PROMPT_3 = {
  id: 'prompt-3',
  envelopeId: 'env-1',
  optionA: 'Live in the mountains',
  optionB: 'Live by the sea',
  sortOrder: 2,
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
    mockEnvelopeUpdate.mockResolvedValue(null);

    // Default transaction implementation — includes all models used inside submitVote
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        wyrPrompt: {
          findUnique: mockWyrPromptFindUnique,
          findMany: mockWyrPromptFindMany,
        },
        wyrVote: {
          findUnique: mockWyrVoteFindUnique,
          findMany: mockWyrVoteFindMany,
          create: mockWyrVoteCreate,
          count: mockWyrVoteCount,
        },
        envelope: {
          update: mockEnvelopeUpdate,
        },
      });
    });
  });

  // ================================================================
  // getEnvelopeState
  // ================================================================
  describe('getEnvelopeState', () => {
    it('should return null if no prompts exist for envelope', async () => {
      mockGetPromptsByEnvelopeId.mockResolvedValue([]);

      const result = await getEnvelopeState('env-1', PARTICIPANT_A);

      expect(result).toBeNull();
    });

    it('should return single prompt with no votes', async () => {
      mockGetPromptsByEnvelopeId.mockResolvedValue([PROMPT_1]);
      mockGetVotesForPromptIds.mockResolvedValue(
        new Map([['prompt-1', []]])
      );

      const result = await getEnvelopeState('env-1', PARTICIPANT_A);

      expect(result).not.toBeNull();
      expect(result!.prompts).toHaveLength(1);
      expect(result!.currentPromptIndex).toBe(0);
      expect(result!.allComplete).toBe(false);
      expect(result!.prompts[0]).toEqual({
        prompt: PROMPT_1,
        myVote: null,
        partnerVoted: false,
        results: null,
      });
    });

    it('should handle 3 prompts at various stages', async () => {
      mockGetPromptsByEnvelopeId.mockResolvedValue([PROMPT_1, PROMPT_2, PROMPT_3]);
      mockGetVotesForPromptIds.mockResolvedValue(
        new Map([
          ['prompt-1', [
            { participantId: PARTICIPANT_A, choice: 'option_a' },
            { participantId: PARTICIPANT_B, choice: 'option_b' },
          ]],
          ['prompt-2', []],
          ['prompt-3', []],
        ])
      );

      const result = await getEnvelopeState('env-1', PARTICIPANT_A);

      expect(result!.prompts).toHaveLength(3);
      expect(result!.currentPromptIndex).toBe(1); // First incomplete prompt
      expect(result!.allComplete).toBe(false);

      // Prompt 1 has results
      expect(result!.prompts[0]!.results).toEqual({
        myChoice: 'option_a',
        partnerChoice: 'option_b',
        isMatch: false,
      });

      // Prompt 2 has no votes
      expect(result!.prompts[1]!.myVote).toBeNull();
      expect(result!.prompts[1]!.results).toBeNull();
    });

    it('should set allComplete when all prompts have results', async () => {
      mockGetPromptsByEnvelopeId.mockResolvedValue([PROMPT_1, PROMPT_2]);
      mockGetVotesForPromptIds.mockResolvedValue(
        new Map([
          ['prompt-1', [
            { participantId: PARTICIPANT_A, choice: 'option_a' },
            { participantId: PARTICIPANT_B, choice: 'option_a' },
          ]],
          ['prompt-2', [
            { participantId: PARTICIPANT_A, choice: 'option_b' },
            { participantId: PARTICIPANT_B, choice: 'option_a' },
          ]],
        ])
      );

      const result = await getEnvelopeState('env-1', PARTICIPANT_A);

      expect(result!.allComplete).toBe(true);
      // currentPromptIndex defaults to last when all complete
      expect(result!.currentPromptIndex).toBe(1);
    });

    it('should set currentPromptIndex to first incomplete prompt', async () => {
      mockGetPromptsByEnvelopeId.mockResolvedValue([PROMPT_1, PROMPT_2, PROMPT_3]);
      mockGetVotesForPromptIds.mockResolvedValue(
        new Map([
          ['prompt-1', [
            { participantId: PARTICIPANT_A, choice: 'option_a' },
            { participantId: PARTICIPANT_B, choice: 'option_b' },
          ]],
          ['prompt-2', [
            { participantId: PARTICIPANT_A, choice: 'option_b' },
          ]],
          ['prompt-3', []],
        ])
      );

      const result = await getEnvelopeState('env-1', PARTICIPANT_A);

      // Prompt 2 has my vote but no results (partner hasn't voted)
      expect(result!.currentPromptIndex).toBe(1);
      expect(result!.prompts[1]!.myVote).toBe('option_b');
      expect(result!.prompts[1]!.results).toBeNull();
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
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_1);
      mockWyrVoteFindUnique.mockResolvedValue({ id: 'existing-vote' });

      await expect(submitVote('prompt-1', PARTICIPANT_A, 'option_a')).rejects.toThrow(
        'ALREADY_VOTED'
      );
    });

    it('should create vote and return not-revealed for single vote', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_1);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(1);

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result).toEqual({
        revealed: false,
        isLastPrompt: false,
        envelopeComplete: false,
      });
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

    it('should reveal results when both voted on single-prompt envelope', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_1);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(2);
      // tx.wyrVote.findMany for this prompt's votes
      mockWyrVoteFindMany.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_b' },
      ]);
      // tx.wyrPrompt.findMany for all prompts in envelope
      mockWyrPromptFindMany.mockResolvedValue([{ id: 'prompt-1' }]);

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result.revealed).toBe(true);
      expect(result.results).toEqual({
        myChoice: 'option_a',
        partnerChoice: 'option_b',
        isMatch: false,
      });
      expect(result.isLastPrompt).toBe(true);
      expect(result.envelopeComplete).toBe(true);
      expect(mockEnvelopeUpdate).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: { status: 'completed' },
      });
    });

    it('should NOT complete envelope when only first of 3 prompts has both votes', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_1);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      // tx.wyrVote.findMany for this prompt's votes
      mockWyrVoteFindMany.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_a' },
      ]);
      // tx.wyrPrompt.findMany: 3-prompt envelope
      mockWyrPromptFindMany.mockResolvedValue([
        { id: 'prompt-1' }, { id: 'prompt-2' }, { id: 'prompt-3' },
      ]);
      // tx.wyrVote.count: first call returns 2 (this prompt), second for prompt-1=2, third for prompt-2=0
      mockWyrVoteCount
        .mockResolvedValueOnce(2) // count for submitted prompt
        .mockResolvedValueOnce(2) // completion check: prompt-1
        .mockResolvedValueOnce(0); // completion check: prompt-2 — breaks early

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result.revealed).toBe(true);
      expect(result.isLastPrompt).toBe(false);
      expect(result.envelopeComplete).toBe(false);
      expect(mockEnvelopeUpdate).not.toHaveBeenCalled();
    });

    it('should complete envelope when last prompt gets both votes and all prompts done', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_3);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      // tx.wyrVote.findMany for this prompt's votes
      mockWyrVoteFindMany.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_b' },
        { participantId: PARTICIPANT_B, choice: 'option_b' },
      ]);
      // tx.wyrPrompt.findMany: 3-prompt envelope
      mockWyrPromptFindMany.mockResolvedValue([
        { id: 'prompt-1' }, { id: 'prompt-2' }, { id: 'prompt-3' },
      ]);
      // tx.wyrVote.count: first for submitted prompt=2, then completion check for all 3
      mockWyrVoteCount
        .mockResolvedValueOnce(2) // count for submitted prompt
        .mockResolvedValueOnce(2) // completion check: prompt 1
        .mockResolvedValueOnce(2) // completion check: prompt 2
        .mockResolvedValueOnce(2); // completion check: prompt 3

      const result = await submitVote('prompt-3', PARTICIPANT_A, 'option_b');

      expect(result.revealed).toBe(true);
      expect(result.isLastPrompt).toBe(true);
      expect(result.envelopeComplete).toBe(true);
      expect(mockEnvelopeUpdate).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: { status: 'completed' },
      });
    });

    it('should include isLastPrompt and envelopeComplete in SignalR broadcast', async () => {
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_2);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      // tx.wyrVote.findMany for this prompt's votes
      mockWyrVoteFindMany.mockResolvedValue([
        { participantId: PARTICIPANT_A, choice: 'option_a' },
        { participantId: PARTICIPANT_B, choice: 'option_b' },
      ]);
      // tx.wyrPrompt.findMany: 3 prompts
      mockWyrPromptFindMany.mockResolvedValue([
        { id: 'prompt-1' }, { id: 'prompt-2' }, { id: 'prompt-3' },
      ]);
      // tx.wyrVote.count: submitted prompt=2, then completion check prompt-1=0 (breaks early)
      mockWyrVoteCount
        .mockResolvedValueOnce(2) // count for submitted prompt
        .mockResolvedValueOnce(0); // completion check: prompt-1 — breaks out early

      await submitVote('prompt-2', PARTICIPANT_A, 'option_a');

      // Check the reveal broadcast includes the new fields
      const revealCall = mockSendToGroup.mock.calls.find(
        (call: unknown[]) => (call[1] as { target: string }).target === 'wyrRevealReady'
      );
      expect(revealCall).toBeDefined();
      const revealArgs = (revealCall![1] as { arguments: unknown[] }).arguments[0] as {
        isLastPrompt: boolean;
        envelopeComplete: boolean;
      };
      expect(revealArgs.isLastPrompt).toBe(false);
      expect(revealArgs.envelopeComplete).toBe(false);
    });

    it('should not broadcast if realtime service is null', async () => {
      mockGetRealtimeService.mockReturnValue(null);
      mockWyrPromptFindUnique.mockResolvedValue(PROMPT_1);
      mockWyrVoteFindUnique.mockResolvedValue(null);
      mockWyrVoteCreate.mockResolvedValue({ id: 'new-vote' });
      mockWyrVoteCount.mockResolvedValue(1);

      const result = await submitVote('prompt-1', PARTICIPANT_A, 'option_a');

      expect(result).toEqual({
        revealed: false,
        isLastPrompt: false,
        envelopeComplete: false,
      });
      expect(mockSendToGroup).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // validatePrompt
  // ================================================================
  describe('validatePrompt', () => {
    it('should return true if prompt exists', async () => {
      mockGetPromptById.mockResolvedValue(PROMPT_1);

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
