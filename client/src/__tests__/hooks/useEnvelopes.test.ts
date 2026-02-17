/**
 * useEnvelopes hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Envelope } from 'shared';

// Mock api module
vi.mock('../../services/api', () => ({
  getEnvelopes: vi.fn(),
  updateEnvelope: vi.fn(),
  openEnvelope: vi.fn(),
}));

import { getEnvelopes, updateEnvelope, openEnvelope } from '../../services/api';
import { useEnvelopes } from '../../hooks/useEnvelopes';

const mockGetEnvelopes = vi.mocked(getEnvelopes);
const mockUpdateEnvelope = vi.mocked(updateEnvelope);
const mockOpenEnvelope = vi.mocked(openEnvelope);

const ENVELOPES: Envelope[] = [
  {
    id: 'env-1',
    title: 'Would You Rather #1',
    type: 'would-you-rather',
    status: 'sealed',
    order: 1,
    friendLetterId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env-2',
    title: 'Letter to Baby',
    type: 'letter',
    status: 'sealed',
    order: 2,
    friendLetterId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('useEnvelopes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGetEnvelopes.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEnvelopes());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.envelopes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load envelopes on mount', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.envelopes).toEqual(ENVELOPES);
  });

  it('should set error on fetch failure', async () => {
    mockGetEnvelopes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Network error');
  });

  it('should use openEnvelope API when status is opened', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);
    mockOpenEnvelope.mockResolvedValue({ ...ENVELOPES[0]!, status: 'opened' });

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateStatus('env-1', 'opened');
    });

    expect(mockOpenEnvelope).toHaveBeenCalledWith('env-1');
    expect(mockUpdateEnvelope).not.toHaveBeenCalled();
  });

  it('should use updateEnvelope API for non-open status changes', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);
    mockUpdateEnvelope.mockResolvedValue({ ...ENVELOPES[0]!, status: 'completed' });

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateStatus('env-1', 'completed');
    });

    expect(mockUpdateEnvelope).toHaveBeenCalledWith('env-1', { status: 'completed' });
  });

  it('should optimistically update status', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);
    // Make the API call hang to verify optimistic update
    mockOpenEnvelope.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start the update (don't await it)
    act(() => {
      result.current.updateStatus('env-1', 'opened');
    });

    // Status should be optimistically updated immediately
    expect(result.current.envelopes[0]!.status).toBe('opened');
  });

  it('should revert on error and refetch', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);
    mockOpenEnvelope.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Prepare for refetch after error
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);

    await expect(
      act(async () => {
        await result.current.updateStatus('env-1', 'opened');
      })
    ).rejects.toThrow('Server error');

    // Should have refetched to get accurate state
    expect(mockGetEnvelopes).toHaveBeenCalledTimes(2);
  });

  it('should refetch when refetch is called', async () => {
    mockGetEnvelopes.mockResolvedValue(ENVELOPES);

    const { result } = renderHook(() => useEnvelopes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedEnvelopes: Envelope[] = [{ ...ENVELOPES[0]!, status: 'opened' as const }, ENVELOPES[1]!];
    mockGetEnvelopes.mockResolvedValue(updatedEnvelopes);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.envelopes[0]!.status).toBe('opened');
    expect(mockGetEnvelopes).toHaveBeenCalledTimes(2);
  });
});
