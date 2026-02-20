/**
 * useLetter hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock SignalR context
const mockConnection = {
  joinGroup: vi.fn(),
  leaveGroup: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('../../context/SignalRContext', () => ({
  useSignalRConnection: vi.fn(() => ({
    connection: mockConnection,
    isConnected: true,
  })),
}));

vi.mock('../../services/api', () => ({
  getLetterState: vi.fn(),
  saveLetter: vi.fn(),
  submitLetter: vi.fn(),
}));

vi.mock('../../constants/strings', () => ({
  STRINGS: {
    LETTER_ERROR_LOADING: 'Failed to load',
    LETTER_ERROR_SAVING: 'Failed to save',
    LETTER_ERROR_SUBMITTING: 'Failed to submit',
  },
}));

import { getLetterState, saveLetter, submitLetter } from '../../services/api';
import { useLetter } from '../../hooks/useLetter';

const mockGetLetterState = vi.mocked(getLetterState);
const mockSaveLetter = vi.mocked(saveLetter);
const mockSubmitLetter = vi.mocked(submitLetter);

const PROMPT = { id: 'p1', envelopeId: 'env-1', prompt: 'Write a letter', createdAt: '2026-01-01' };
const MY_LETTER = {
  id: 'l1',
  promptId: 'p1',
  participantId: 'me',
  content: 'Draft content',
  photoUrl: null,
  submittedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('useLetter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGetLetterState.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.phase).toBe('writing');
  });

  it('should load writing phase when no letter exists', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: null,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('writing');
    expect(result.current.prompt).toEqual(PROMPT);
    expect(result.current.myLetter).toBeNull();
  });

  it('should load waiting phase when letter is submitted', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'waiting',
      myLetter: { ...MY_LETTER, submittedAt: '2026-01-02' },
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('waiting');
  });

  it('should load revealing phase when both letters submitted', async () => {
    const partnerLetter = { ...MY_LETTER, id: 'l2', participantId: 'partner', content: 'Partner content' };
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'revealing',
      myLetter: { ...MY_LETTER, submittedAt: '2026-01-02' },
      partnerSubmitted: true,
      revealedLetters: [{ ...MY_LETTER, submittedAt: '2026-01-02' }, partnerLetter],
    });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('revealing');
    expect(result.current.revealedLetters).not.toBeNull();
  });

  it('should set error on load failure', async () => {
    mockGetLetterState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load');
  });

  it('should save letter content', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: MY_LETTER,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const updatedLetter = { ...MY_LETTER, content: 'Updated content' };
    mockSaveLetter.mockResolvedValue(updatedLetter);

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.save('Updated content', null);
    });

    expect(mockSaveLetter).toHaveBeenCalledWith('env-1', 'Updated content', null);
    expect(result.current.myLetter?.content).toBe('Updated content');
  });

  it('should submit letter and transition to waiting phase', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: MY_LETTER,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    mockSubmitLetter.mockResolvedValue({ revealed: false });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submit('Final content', null);
    });

    expect(result.current.phase).toBe('waiting');
  });

  it('should transition to revealing on immediate reveal', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: MY_LETTER,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const partnerLetter = { ...MY_LETTER, id: 'l2', content: 'Partner content' };
    mockSubmitLetter.mockResolvedValue({
      revealed: true,
      letters: [MY_LETTER, partnerLetter],
    });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submit('Final content', null);
    });

    expect(result.current.phase).toBe('revealing');
    expect(result.current.revealedLetters).not.toBeNull();
  });

  it('should join and leave SignalR group', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: null,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const { unmount } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => {
      expect(mockConnection.joinGroup).toHaveBeenCalledWith('activity:env-1');
    });

    unmount();

    expect(mockConnection.leaveGroup).toHaveBeenCalledWith('activity:env-1');
  });

  it('should advance to complete phase', async () => {
    mockGetLetterState.mockResolvedValue({
      prompt: PROMPT,
      phase: 'writing',
      myLetter: null,
      partnerSubmitted: false,
      revealedLetters: [],
    });

    const { result } = renderHook(() => useLetter({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.advance();
    });

    expect(result.current.phase).toBe('complete');
  });
});
