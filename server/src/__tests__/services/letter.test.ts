/**
 * Letter to Baby service tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetPromptByEnvelopeId = jest.fn() as AnyMock;
const mockGetLetterForParticipant = jest.fn() as AnyMock;
const mockGetSubmittedLettersForPrompt = jest.fn() as AnyMock;
const mockCreateOrUpdateLetter = jest.fn() as AnyMock;
const mockUpdateEnvelopeStatus = jest.fn() as AnyMock;
const mockGetEnvelopeById = jest.fn() as AnyMock;

// Mock realtime service
const mockSendToGroup = jest.fn() as AnyMock;
const mockGetRealtimeService = jest.fn() as AnyMock;

// Mock Prisma transaction models
const mockLetterFindUnique = jest.fn() as AnyMock;
const mockLetterCreate = jest.fn() as AnyMock;
const mockLetterUpdate = jest.fn() as AnyMock;
const mockLetterCount = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/letter.js', () => ({
  getPromptByEnvelopeId: mockGetPromptByEnvelopeId,
  getLetterForParticipant: mockGetLetterForParticipant,
  getSubmittedLettersForPrompt: mockGetSubmittedLettersForPrompt,
  createOrUpdateLetter: mockCreateOrUpdateLetter,
}));

jest.unstable_mockModule('../../db/queries/envelopes.js', () => ({
  updateEnvelopeStatus: mockUpdateEnvelopeStatus,
  getEnvelopeById: mockGetEnvelopeById,
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
const { getLetterState, saveLetter, submitLetter } =
  await import('../../services/letter.js');

// Test fixtures
const PROMPT = {
  id: 'prompt-1',
  envelopeId: 'env-1',
  prompt: 'Write a letter to your baby',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PARTICIPANT_A = 'participant-a';
const PARTICIPANT_B = 'participant-b';

const LETTER_A = {
  id: 'letter-a',
  promptId: PROMPT.id,
  participantId: PARTICIPANT_A,
  content: 'Dear baby, from A...',
  photoUrl: null,
  submittedAt: '2026-01-01T01:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T01:00:00.000Z',
};

const LETTER_B = {
  id: 'letter-b',
  promptId: PROMPT.id,
  participantId: PARTICIPANT_B,
  content: 'Dear baby, from B...',
  photoUrl: 'https://storage.blob.core.windows.net/photos/pic.jpg',
  submittedAt: '2026-01-01T02:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T02:00:00.000Z',
};

describe('Letter Service', () => {
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
        letter: {
          findUnique: mockLetterFindUnique,
          create: mockLetterCreate,
          update: mockLetterUpdate,
          count: mockLetterCount,
        },
      });
    });
  });

  // ================================================================
  // getLetterState
  // ================================================================
  describe('getLetterState', () => {
    it('should return null if no prompt exists for envelope', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(null);

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result).toBeNull();
    });

    it('should return writing phase when no letter exists', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetLetterForParticipant.mockResolvedValue(null);
      mockGetSubmittedLettersForPrompt.mockResolvedValue([]);

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result!.phase).toBe('writing');
      expect(result!.myLetter).toBeNull();
      expect(result!.partnerSubmitted).toBe(false);
      expect(result!.revealedLetters).toEqual([]);
    });

    it('should return writing phase when letter exists but not submitted', async () => {
      const draftLetter = { ...LETTER_A, submittedAt: null };
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetLetterForParticipant.mockResolvedValue(draftLetter);
      mockGetSubmittedLettersForPrompt.mockResolvedValue([]);

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result!.phase).toBe('writing');
      expect(result!.myLetter).toEqual(draftLetter);
    });

    it('should return waiting phase when I submitted but partner has not', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetLetterForParticipant.mockResolvedValue(LETTER_A);
      mockGetSubmittedLettersForPrompt.mockResolvedValue([LETTER_A]);

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result!.phase).toBe('waiting');
      expect(result!.partnerSubmitted).toBe(false);
    });

    it('should return complete phase when both submitted and envelope completed', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetLetterForParticipant.mockResolvedValue(LETTER_A);
      mockGetSubmittedLettersForPrompt.mockResolvedValue([LETTER_A, LETTER_B]);
      mockGetEnvelopeById.mockResolvedValue({ id: 'env-1', status: 'completed' });

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result!.phase).toBe('complete');
      expect(result!.partnerSubmitted).toBe(true);
      expect(result!.revealedLetters).toEqual([LETTER_A, LETTER_B]);
    });

    it('should return revealing phase when both submitted but envelope not completed', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockGetLetterForParticipant.mockResolvedValue(LETTER_A);
      mockGetSubmittedLettersForPrompt.mockResolvedValue([LETTER_A, LETTER_B]);
      mockGetEnvelopeById.mockResolvedValue({ id: 'env-1', status: 'opened' });

      const result = await getLetterState('env-1', PARTICIPANT_A);

      expect(result!.phase).toBe('revealing');
      expect(result!.revealedLetters).toEqual([LETTER_A, LETTER_B]);
    });
  });

  // ================================================================
  // saveLetter
  // ================================================================
  describe('saveLetter', () => {
    it('should throw PROMPT_NOT_FOUND if no prompt exists', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(null);

      await expect(
        saveLetter('env-1', PARTICIPANT_A, 'content', null)
      ).rejects.toThrow('PROMPT_NOT_FOUND');
    });

    it('should upsert letter content', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockCreateOrUpdateLetter.mockResolvedValue(LETTER_A);

      const result = await saveLetter('env-1', PARTICIPANT_A, 'Dear baby...', null);

      expect(result).toEqual(LETTER_A);
      expect(mockCreateOrUpdateLetter).toHaveBeenCalledWith(
        PROMPT.id,
        PARTICIPANT_A,
        { content: 'Dear baby...', photoUrl: null }
      );
    });

    it('should save letter with photo URL', async () => {
      const photoUrl = 'https://storage.blob.core.windows.net/photos/pic.jpg';
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockCreateOrUpdateLetter.mockResolvedValue({ ...LETTER_A, photoUrl });

      await saveLetter('env-1', PARTICIPANT_A, 'Dear baby...', photoUrl);

      expect(mockCreateOrUpdateLetter).toHaveBeenCalledWith(
        PROMPT.id,
        PARTICIPANT_A,
        { content: 'Dear baby...', photoUrl }
      );
    });

    it('should not broadcast via SignalR on auto-save', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockCreateOrUpdateLetter.mockResolvedValue(LETTER_A);

      await saveLetter('env-1', PARTICIPANT_A, 'content', null);

      expect(mockSendToGroup).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // submitLetter
  // ================================================================
  describe('submitLetter', () => {
    it('should throw PROMPT_NOT_FOUND if no prompt exists', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(null);

      await expect(submitLetter('env-1', PARTICIPANT_A)).rejects.toThrow(
        'PROMPT_NOT_FOUND'
      );
    });

    it('should throw ALREADY_SUBMITTED if letter already submitted', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockLetterFindUnique.mockResolvedValue({
        id: 'letter-a',
        submittedAt: new Date(),
      });

      await expect(submitLetter('env-1', PARTICIPANT_A)).rejects.toThrow(
        'ALREADY_SUBMITTED'
      );
    });

    it('should submit letter and broadcast via SignalR', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockLetterFindUnique.mockResolvedValue({
        id: 'letter-a',
        content: 'Dear baby...',
        submittedAt: null,
      });
      mockLetterUpdate.mockResolvedValue({ id: 'letter-a' });
      mockLetterCount.mockResolvedValue(1); // Only one submitted

      const result = await submitLetter('env-1', PARTICIPANT_A);

      expect(result).toEqual({ revealed: false });
      expect(mockLetterUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'letter-a' },
          data: { submittedAt: expect.any(Date) },
        })
      );
      expect(mockSendToGroup).toHaveBeenCalledWith(
        'activity:env-1',
        expect.objectContaining({
          target: 'letterSubmitted',
        })
      );
    });

    it('should create empty letter if none exists and submit', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockLetterFindUnique.mockResolvedValue(null);
      mockLetterCreate.mockResolvedValue({
        id: 'new-letter',
        content: '',
        submittedAt: null,
      });
      mockLetterUpdate.mockResolvedValue({ id: 'new-letter' });
      mockLetterCount.mockResolvedValue(1);

      const result = await submitLetter('env-1', PARTICIPANT_A);

      expect(result).toEqual({ revealed: false });
      expect(mockLetterCreate).toHaveBeenCalledWith({
        data: {
          promptId: PROMPT.id,
          participantId: PARTICIPANT_A,
          content: '',
        },
      });
    });

    it('should reveal letters and complete envelope when both submitted', async () => {
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockLetterFindUnique.mockResolvedValue({
        id: 'letter-a',
        content: 'Dear baby...',
        submittedAt: null,
      });
      mockLetterUpdate.mockResolvedValue({ id: 'letter-a' });
      mockLetterCount.mockResolvedValue(2); // Both submitted now
      mockGetSubmittedLettersForPrompt.mockResolvedValue([LETTER_A, LETTER_B]);

      const result = await submitLetter('env-1', PARTICIPANT_A);

      expect(result.revealed).toBe(true);
      expect(result.letters).toEqual([LETTER_A, LETTER_B]);
      expect(mockUpdateEnvelopeStatus).toHaveBeenCalledWith('env-1', 'completed');
      // Should broadcast both letterSubmitted and letterRevealReady
      expect(mockSendToGroup).toHaveBeenCalledTimes(2);
      expect(mockSendToGroup).toHaveBeenCalledWith(
        'activity:env-1',
        expect.objectContaining({ target: 'letterRevealReady' })
      );
    });

    it('should not broadcast if realtime service is null', async () => {
      mockGetRealtimeService.mockReturnValue(null);
      mockGetPromptByEnvelopeId.mockResolvedValue(PROMPT);
      mockLetterFindUnique.mockResolvedValue({
        id: 'letter-a',
        content: 'Dear baby...',
        submittedAt: null,
      });
      mockLetterUpdate.mockResolvedValue({ id: 'letter-a' });
      mockLetterCount.mockResolvedValue(1);

      const result = await submitLetter('env-1', PARTICIPANT_A);

      expect(result).toEqual({ revealed: false });
      expect(mockSendToGroup).not.toHaveBeenCalled();
    });
  });
});
