/**
 * useConfig hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock api module
vi.mock('../../services/api', () => ({
  getConfig: vi.fn(),
}));

import { getConfig } from '../../services/api';
import { useConfig } from '../../hooks/useConfig';

const mockGetConfig = vi.mocked(getConfig);

describe('useConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useConfig());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.spotifyUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return spotify URL on success', async () => {
    mockGetConfig.mockResolvedValue({
      spotifyUrl: 'https://open.spotify.com/playlist/abc',
    });

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.spotifyUrl).toBe('https://open.spotify.com/playlist/abc');
    expect(result.current.error).toBeNull();
  });

  it('should return null spotifyUrl when config has none', async () => {
    mockGetConfig.mockResolvedValue({ spotifyUrl: null });

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.spotifyUrl).toBeNull();
  });

  it('should set error on fetch failure', async () => {
    mockGetConfig.mockRejectedValue(new Error('Network error'));

    // Silence expected console.error from the hook's error handler
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.spotifyUrl).toBeNull();

    spy.mockRestore();
  });

  it('should refetch when refetch is called', async () => {
    mockGetConfig.mockResolvedValue({ spotifyUrl: null });

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetConfig).toHaveBeenCalledTimes(1);

    mockGetConfig.mockResolvedValue({
      spotifyUrl: 'https://open.spotify.com/playlist/new',
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.spotifyUrl).toBe('https://open.spotify.com/playlist/new');
    });

    expect(mockGetConfig).toHaveBeenCalledTimes(2);
  });
});
