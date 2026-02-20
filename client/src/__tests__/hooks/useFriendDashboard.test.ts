/**
 * useFriendDashboard hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../services/friendApi', () => ({
  getFriendDashboard: vi.fn(),
}));

import { getFriendDashboard } from '../../services/friendApi';
import { useFriendDashboard } from '../../hooks/useFriendDashboard';

const mockGetDashboard = vi.mocked(getFriendDashboard);

const DASHBOARD = {
  friend: { id: 'friend-1', name: 'Alice' },
  thankYouNote: null,
  letters: [
    {
      id: 'l1',
      recipient: 'baby',
      recipientName: 'Baby',
      title: null,
      status: 'draft' as const,
      content: 'Draft...',
      submittedAt: null,
    },
  ],
};

describe('useFriendDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGetDashboard.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFriendDashboard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dashboard).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should load dashboard on mount', async () => {
    mockGetDashboard.mockResolvedValue(DASHBOARD);

    const { result } = renderHook(() => useFriendDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dashboard).toEqual(DASHBOARD);
    expect(result.current.error).toBeNull();
  });

  it('should set error on load failure', async () => {
    mockGetDashboard.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFriendDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.dashboard).toBeNull();
  });

  it('should refetch data when refetch is called', async () => {
    mockGetDashboard.mockResolvedValue(DASHBOARD);

    const { result } = renderHook(() => useFriendDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = {
      ...DASHBOARD,
      letters: [...DASHBOARD.letters, { id: 'l2', recipient: 'you', recipientName: 'Dylan', title: null, status: 'submitted' as const, content: 'Done', submittedAt: '2026-01-02' }],
    };
    mockGetDashboard.mockResolvedValue(updated);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.dashboard?.letters).toHaveLength(2);
    expect(mockGetDashboard).toHaveBeenCalledTimes(2);
  });
});
