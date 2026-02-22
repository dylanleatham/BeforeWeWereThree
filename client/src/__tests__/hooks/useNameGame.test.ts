/**
 * useNameGame hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type {
  NameGameStateResponse,
  NameGameRoundResponse,
  NameVoteState,
  NameGameResults,
  SubmitGuidanceResponse,
} from 'shared';

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
  getNameGameState: vi.fn(),
  submitNameGameGuidance: vi.fn(),
  submitNameVote: vi.fn(),
}));

vi.mock('../../hooks/useSession', () => ({
  useSession: vi.fn(() => ({ participantId: 'test-pid' })),
}));

import { getNameGameState, submitNameGameGuidance, submitNameVote } from '../../services/api';
import { useNameGame } from '../../hooks/useNameGame';

const mockGetNameGameState = vi.mocked(getNameGameState);
const mockSubmitNameGameGuidance = vi.mocked(submitNameGameGuidance);
const mockSubmitNameVote = vi.mocked(submitNameVote);

function makeName(id: string, name: string): NameVoteState {
  return {
    name: {
      id,
      roundId: 'round-1',
      name,
      origin: ['Latin'],
      meaning: 'Test meaning',
      notes: 'Test notes',
      sortOrder: 0,
    },
    myVote: null,
    partnerVoted: false,
  };
}

const NAMES: NameVoteState[] = [
  makeName('name-1', 'Luna'),
  makeName('name-2', 'Felix'),
  makeName('name-3', 'Aurora'),
];

const ROUND: NameGameRoundResponse = {
  roundId: 'round-1',
  roundNumber: 1,
  names: NAMES,
  allVoted: false,
};

function makeStateResponse(overrides?: Partial<NameGameStateResponse>): NameGameStateResponse {
  return {
    currentRound: null,
    allMatches: [],
    roundCount: 0,
    ...overrides,
  };
}

const _RESULTS: NameGameResults = {
  matches: [NAMES[0]!.name],
  nearMisses: [],
  worthDiscussing: [],
  myVotes: { 'name-1': 'love', 'name-2': 'nope', 'name-3': 'maybe' },
  partnerVotes: { 'name-1': 'love', 'name-2': 'maybe', 'name-3': 'nope' },
};

describe('useNameGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start in loading phase', () => {
    mockGetNameGameState.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    expect(result.current.phase).toBe('loading');
    expect(result.current.currentRound).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should load initial state and transition to new-round when no round', async () => {
    mockGetNameGameState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('new-round'));

    expect(result.current.currentRound).toBeNull();
    expect(result.current.roundCount).toBe(0);
    expect(result.current.allMatches).toEqual([]);
    expect(mockGetNameGameState).toHaveBeenCalledWith('env-1');
  });

  it('should load state with active round and go to voting', async () => {
    mockGetNameGameState.mockResolvedValue(
      makeStateResponse({ currentRound: ROUND, roundCount: 1 })
    );

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('voting'));

    expect(result.current.currentRound).not.toBeNull();
    expect(result.current.currentRound!.roundId).toBe('round-1');
    expect(result.current.currentRound!.names).toHaveLength(3);
    expect(result.current.roundCount).toBe(1);
  });

  it('should submit guidance and handle waiting_for_partner', async () => {
    mockGetNameGameState.mockResolvedValue(makeStateResponse());

    const guidanceResponse: SubmitGuidanceResponse = {
      status: 'waiting_for_partner',
      roundNumber: 1,
    };
    mockSubmitNameGameGuidance.mockResolvedValue(guidanceResponse);

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('new-round'));

    await act(async () => {
      await result.current.startRound('I like nature names');
    });

    expect(mockSubmitNameGameGuidance).toHaveBeenCalledWith('env-1', 'I like nature names');
    expect(result.current.phase).toBe('waiting-for-guidance');
  });

  it('should submit guidance and handle round_generated', async () => {
    mockGetNameGameState.mockResolvedValue(makeStateResponse());

    const guidanceResponse: SubmitGuidanceResponse = {
      status: 'round_generated',
      round: ROUND,
    };
    mockSubmitNameGameGuidance.mockResolvedValue(guidanceResponse);

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('new-round'));

    await act(async () => {
      await result.current.startRound();
    });

    expect(result.current.phase).toBe('voting');
    expect(result.current.currentRound).not.toBeNull();
    expect(result.current.currentNameIndex).toBe(0);
    expect(result.current.roundCount).toBe(1);
  });

  it('should submit vote and advance to next name', async () => {
    mockGetNameGameState.mockResolvedValue(
      makeStateResponse({ currentRound: ROUND, roundCount: 1 })
    );
    mockSubmitNameVote.mockResolvedValue({ allVoted: false });

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('voting'));

    const initialIndex = result.current.currentNameIndex;

    await act(async () => {
      await result.current.vote('love');
    });

    // Should have advanced to the next name
    expect(result.current.currentNameIndex).toBe(initialIndex + 1);
    expect(result.current.phase).toBe('voting');
  });

  it('should submit last vote and transition to waiting', async () => {
    // Create a round with only one name to make the first vote the last
    const singleNameRound: NameGameRoundResponse = {
      roundId: 'round-1',
      roundNumber: 1,
      names: [makeName('name-1', 'Luna')],
      allVoted: false,
    };
    mockGetNameGameState.mockResolvedValue(
      makeStateResponse({ currentRound: singleNameRound, roundCount: 1 })
    );
    mockSubmitNameVote.mockResolvedValue({ allVoted: false });

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('voting'));

    await act(async () => {
      await result.current.vote('love');
    });

    expect(result.current.phase).toBe('waiting');
  });

  it('should handle vote error with rollback', async () => {
    mockGetNameGameState.mockResolvedValue(
      makeStateResponse({ currentRound: ROUND, roundCount: 1 })
    );
    mockSubmitNameVote.mockRejectedValue(new Error('Vote failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('voting'));

    const indexBefore = result.current.currentNameIndex;

    await act(async () => {
      await result.current.vote('love');
    });

    // Should rollback to the same index
    expect(result.current.currentNameIndex).toBe(indexBefore);
    expect(result.current.error).toBe('Vote failed');
  });

  it('should handle startNewRound to reset state', async () => {
    mockGetNameGameState.mockResolvedValue(
      makeStateResponse({ currentRound: ROUND, roundCount: 1 })
    );

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.phase).toBe('voting'));

    act(() => {
      result.current.startNewRound();
    });

    expect(result.current.phase).toBe('new-round');
    expect(result.current.results).toBeNull();
    expect(result.current.currentRound).toBeNull();
    expect(result.current.currentNameIndex).toBe(0);
  });

  it('should handle load error and retry', async () => {
    mockGetNameGameState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => expect(result.current.error).toBe('Network error'));

    // Now retry successfully
    mockGetNameGameState.mockResolvedValue(makeStateResponse());

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.phase).toBe('new-round'));

    expect(result.current.error).toBeNull();
  });

  it('should join and leave SignalR group', async () => {
    mockGetNameGameState.mockResolvedValue(makeStateResponse());

    const { unmount } = renderHook(() => useNameGame('env-1', 'participant-1'));

    await waitFor(() => {
      expect(mockConnection.joinGroup).toHaveBeenCalledWith('activity:env-1');
    });

    unmount();

    expect(mockConnection.leaveGroup).toHaveBeenCalledWith('activity:env-1');
  });
});
