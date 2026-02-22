/**
 * useGenderReveal hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { GenderRevealStateResponse, ValidateKeyResponse } from 'shared';

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
  getGenderRevealState: vi.fn(),
  validateRevealKey: vi.fn(),
}));

vi.mock('../../constants/strings', () => ({
  STRINGS: {
    REVEAL_LOAD_ERROR: 'Failed to load gender reveal',
    REVEAL_KEY_INVALID: 'Invalid key',
    REVEAL_KEY_ALREADY_USED: 'Key already used',
    REVEAL_KEY_NETWORK_ERROR: 'Network error',
  },
}));

import { getGenderRevealState, validateRevealKey } from '../../services/api';
import { useSignalREvent } from '../../hooks/useSignalREvent';
import { useGenderReveal } from '../../hooks/useGenderReveal';

const mockGetGenderRevealState = vi.mocked(getGenderRevealState);
const mockValidateRevealKey = vi.mocked(validateRevealKey);
const mockUseSignalREvent = vi.mocked(useSignalREvent);

function makeStateResponse(
  overrides?: Partial<GenderRevealStateResponse>
): GenderRevealStateResponse {
  return {
    configured: true,
    keysValidated: 0,
    myKeyValidated: false,
    revealed: false,
    keyLength: 8,
    ...overrides,
  };
}

describe('useGenderReveal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start in loading state', () => {
    mockGetGenderRevealState.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    expect(result.current.phase).toBe('loading');
    expect(result.current.gender).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should load configured state with key-entry phase', async () => {
    mockGetGenderRevealState.mockResolvedValue(
      makeStateResponse({
        configured: true,
        keysValidated: 0,
        revealed: false,
        keyLength: 8,
      })
    );

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    expect(result.current.keysValidated).toBe(0);
    expect(result.current.keyLength).toBe(8);
    expect(result.current.gender).toBeNull();
    expect(mockGetGenderRevealState).toHaveBeenCalledWith('env-1');
  });

  it('should load not-configured state', async () => {
    mockGetGenderRevealState.mockResolvedValue(
      makeStateResponse({ configured: false })
    );

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('not-configured'));
  });

  it('should load already-revealed state as keepsake', async () => {
    mockGetGenderRevealState.mockResolvedValue(
      makeStateResponse({
        configured: true,
        keysValidated: 2,
        revealed: true,
        gender: 'girl',
        keyLength: 8,
      })
    );

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('keepsake'));

    expect(result.current.gender).toBe('girl');
    expect(result.current.keysValidated).toBe(2);
  });

  it('should load waiting state when keys already validated', async () => {
    mockGetGenderRevealState.mockResolvedValue(
      makeStateResponse({
        configured: true,
        keysValidated: 1,
        revealed: false,
        keyLength: 8,
      })
    );

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('waiting'));

    expect(result.current.keysValidated).toBe(1);
    expect(result.current.gender).toBeNull();
  });

  it('should handle load error', async () => {
    mockGetGenderRevealState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('error'));

    expect(result.current.error).toBe('Failed to load gender reveal');
  });

  it('should transition to waiting on submitKey with waiting_for_partner', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = {
      status: 'waiting_for_partner',
      keysValidated: 1,
    };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    await act(async () => {
      await result.current.submitKey('01012026');
    });

    expect(mockValidateRevealKey).toHaveBeenCalledWith('env-1', '01012026');
    expect(result.current.phase).toBe('waiting');
    expect(result.current.keysValidated).toBe(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should trigger ceremony on submitKey with revealed status', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = {
      status: 'revealed',
      gender: 'boy',
    };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    await act(async () => {
      await result.current.submitKey('02022026');
    });

    expect(result.current.phase).toBe('ceremony');
    expect(result.current.gender).toBe('boy');
    expect(result.current.keysValidated).toBe(2);
  });

  it('should show invalid key error on submitKey', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = { status: 'invalid_key' };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    await act(async () => {
      await result.current.submitKey('00000000');
    });

    expect(result.current.error).toBe('Invalid key');
    expect(result.current.phase).toBe('key-entry');
  });

  it('should handle already_revealed status on submitKey', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = {
      status: 'already_revealed',
      gender: 'girl',
    };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    await act(async () => {
      await result.current.submitKey('01012026');
    });

    expect(result.current.phase).toBe('keepsake');
    expect(result.current.gender).toBe('girl');
    expect(result.current.keysValidated).toBe(2);
  });

  it('should handle key_already_used status on submitKey', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = {
      status: 'key_already_used',
    };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    await act(async () => {
      await result.current.submitKey('01012026');
    });

    expect(result.current.error).toBe('Key already used');
    expect(result.current.phase).toBe('key-entry');
  });

  it('should transition from ceremony to keepsake on onCeremonyComplete', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const validateResponse: ValidateKeyResponse = {
      status: 'revealed',
      gender: 'boy',
    };
    mockValidateRevealKey.mockResolvedValue(validateResponse);

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    // Enter ceremony via reveal
    await act(async () => {
      await result.current.submitKey('02022026');
    });

    expect(result.current.phase).toBe('ceremony');
    expect(result.current.gender).toBe('boy');

    // Complete ceremony
    act(() => {
      result.current.onCeremonyComplete();
    });

    expect(result.current.phase).toBe('keepsake');
    expect(result.current.gender).toBe('boy');
  });

  it('should retry loading state after error', async () => {
    mockGetGenderRevealState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => expect(result.current.phase).toBe('error'));

    expect(result.current.error).toBe('Failed to load gender reveal');

    // Retry successfully
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.phase).toBe('key-entry'));

    expect(result.current.error).toBeNull();
    expect(result.current.keysValidated).toBe(0);
  });

  it('should join and leave SignalR group', async () => {
    mockGetGenderRevealState.mockResolvedValue(makeStateResponse());

    const { unmount } = renderHook(() =>
      useGenderReveal({ envelopeId: 'env-1' })
    );

    await waitFor(() => {
      expect(mockConnection.joinGroup).toHaveBeenCalledWith('activity:env-1');
    });

    unmount();

    expect(mockConnection.leaveGroup).toHaveBeenCalledWith('activity:env-1');
  });

  it('should register SignalR event handlers', () => {
    mockGetGenderRevealState.mockReturnValue(new Promise(() => {}));

    renderHook(() => useGenderReveal({ envelopeId: 'env-1' }));

    expect(mockUseSignalREvent).toHaveBeenCalledWith(
      'genderRevealKeyValidated',
      expect.any(Function)
    );
    expect(mockUseSignalREvent).toHaveBeenCalledWith(
      'genderRevealUnlocked',
      expect.any(Function)
    );
  });
});
