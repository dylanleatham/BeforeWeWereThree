/**
 * useAutoSave hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../../hooks/useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with no save state', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 1000 })
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('should mark as pending when save is called', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 1000 })
    );

    act(() => {
      result.current.save('hello');
    });

    expect(result.current.isPending).toBe(true);
    expect(saveFn).not.toHaveBeenCalled(); // Debounced
  });

  it('should debounce save calls', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 1000 })
    );

    act(() => {
      result.current.save('h');
      result.current.save('he');
      result.current.save('hel');
      result.current.save('hello');
    });

    // Not called yet (debounced)
    expect(saveFn).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should only be called once with final value
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('hello');
  });

  it('should update lastSavedAt on successful save', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 500 })
    );

    act(() => {
      result.current.save('content');
    });

    // Use advanceTimersByTimeAsync to handle async callbacks triggered by timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('should set error on save failure', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 500 })
    );

    act(() => {
      result.current.save('content');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(result.current.error).toBe('Save failed');
  });

  it('should flush pending save immediately', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ saveFn, delay: 5000 })
    );

    act(() => {
      result.current.save('urgent content');
    });

    expect(saveFn).not.toHaveBeenCalled();

    // Flush immediately without waiting for debounce
    await act(async () => {
      await result.current.flush();
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('urgent content');
  });
});
