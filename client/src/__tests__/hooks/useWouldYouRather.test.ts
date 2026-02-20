/**
 * useWouldYouRather hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { WYRPromptState, WYREnvelopeResponse, WYRVoteResponse } from 'shared';

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

vi.mock('../../hooks/useSignalREvent', () => ({
  useSignalREvent: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  getWyrState: vi.fn(),
  submitWyrVote: vi.fn(),
}));

vi.mock('../../constants/strings', () => ({
  STRINGS: {
    WYR_ERROR_LOADING: 'Failed to load activity',
    WYR_ERROR_VOTING: 'Failed to submit vote',
  },
}));

import { getWyrState, submitWyrVote } from '../../services/api';
import { useWouldYouRather } from '../../hooks/useWouldYouRather';

const mockGetWyrState = vi.mocked(getWyrState);
const mockSubmitWyrVote = vi.mocked(submitWyrVote);

const PROMPT_A: WYRPromptState = {
  prompt: {
    id: 'prompt-1',
    envelopeId: 'env-1',
    optionA: 'Option A1',
    optionB: 'Option B1',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  myVote: null,
  partnerVoted: false,
  results: null,
};

const PROMPT_B: WYRPromptState = {
  prompt: {
    id: 'prompt-2',
    envelopeId: 'env-1',
    optionA: 'Option A2',
    optionB: 'Option B2',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  myVote: null,
  partnerVoted: false,
  results: null,
};

function makeStateResponse(overrides?: Partial<WYREnvelopeResponse>): WYREnvelopeResponse {
  return {
    prompts: [PROMPT_A, PROMPT_B],
    currentPromptIndex: 0,
    allComplete: false,
    ...overrides,
  };
}

describe('useWouldYouRather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with loading state', () => {
    mockGetWyrState.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.prompts).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.phase).toBe('voting');
  });

  it('should load initial WYR state from API', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prompts).toHaveLength(2);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalPrompts).toBe(2);
    expect(result.current.currentPrompt).toEqual(PROMPT_A);
    expect(mockGetWyrState).toHaveBeenCalledWith('env-1');
  });

  it('should set voting phase when prompts have unvoted items', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('voting');
    expect(result.current.myVote).toBeNull();
    expect(result.current.partnerVoted).toBe(false);
  });

  it('should handle vote submission and transition to waiting', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const voteResponse: WYRVoteResponse = {
      revealed: false,
      isLastPrompt: false,
      envelopeComplete: false,
    };
    mockSubmitWyrVote.mockResolvedValue(voteResponse);

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.vote('option_a');
    });

    expect(mockSubmitWyrVote).toHaveBeenCalledWith('prompt-1', 'option_a');
    expect(result.current.phase).toBe('waiting');
    expect(result.current.myVote).toBe('option_a');
  });

  it('should handle vote with immediate reveal (both voted)', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const voteResponse: WYRVoteResponse = {
      revealed: true,
      results: {
        myChoice: 'option_a',
        partnerChoice: 'option_b',
        isMatch: false,
      },
      isLastPrompt: false,
      envelopeComplete: false,
    };
    mockSubmitWyrVote.mockResolvedValue(voteResponse);

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.vote('option_a');
    });

    expect(result.current.phase).toBe('revealing');
    expect(result.current.results).toEqual({
      myChoice: 'option_a',
      partnerChoice: 'option_b',
      isMatch: false,
    });
  });

  it('should advance to next prompt', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.advance();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentPrompt).toEqual(PROMPT_B);
    expect(result.current.phase).toBe('voting');
  });

  it('should set complete phase on last prompt advance', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse({ currentPromptIndex: 1 }));

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.advance();
    });

    expect(result.current.phase).toBe('complete');
  });

  it('should handle allComplete state (summary phase)', async () => {
    mockGetWyrState.mockResolvedValue(
      makeStateResponse({
        allComplete: true,
        prompts: [
          {
            ...PROMPT_A,
            myVote: 'option_a',
            partnerVoted: true,
            results: { myChoice: 'option_a', partnerChoice: 'option_a', isMatch: true },
          },
          {
            ...PROMPT_B,
            myVote: 'option_b',
            partnerVoted: true,
            results: { myChoice: 'option_b', partnerChoice: 'option_a', isMatch: false },
          },
        ],
      })
    );

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('summary');
    expect(result.current.allComplete).toBe(true);
  });

  it('should handle load error and retry', async () => {
    mockGetWyrState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load activity');

    // Now retry successfully
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.prompts).toHaveLength(2);
  });

  it('should handle vote error with rollback', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());
    mockSubmitWyrVote.mockRejectedValue(new Error('Vote failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.vote('option_a');
    });

    // Should rollback to voting phase with no vote
    expect(result.current.phase).toBe('voting');
    expect(result.current.myVote).toBeNull();
    expect(result.current.error).toBe('Failed to submit vote');
  });

  it('should join and leave SignalR group', async () => {
    mockGetWyrState.mockResolvedValue(makeStateResponse());

    const { unmount } = renderHook(() => useWouldYouRather({ envelopeId: 'env-1' }));

    await waitFor(() => {
      expect(mockConnection.joinGroup).toHaveBeenCalledWith('activity:env-1');
    });

    unmount();

    expect(mockConnection.leaveGroup).toHaveBeenCalledWith('activity:env-1');
  });
});
