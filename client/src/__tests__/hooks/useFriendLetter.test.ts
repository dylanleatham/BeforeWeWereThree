/**
 * useFriendLetter hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../services/friendApi', () => ({
  saveFriendLetter: vi.fn(),
  submitFriendLetter: vi.fn(),
}));

import { saveFriendLetter, submitFriendLetter } from '../../services/friendApi';
import { useFriendLetter } from '../../hooks/useFriendLetter';

const mockSave = vi.mocked(saveFriendLetter);
const mockSubmit = vi.mocked(submitFriendLetter);

const INITIAL_LETTER = {
  id: 'letter-1',
  friendId: 'friend-1',
  recipient: 'baby' as const,
  title: null,
  content: 'Draft content',
  mediaUrl: null,
  mediaType: null,
  submittedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useFriendLetter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with provided letter', () => {
    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    expect(result.current.letter).toEqual(INITIAL_LETTER);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should mark as submitted if initial letter has submittedAt', () => {
    const submitted = { ...INITIAL_LETTER, submittedAt: '2026-01-02' };
    const { result } = renderHook(() => useFriendLetter('letter-1', submitted));

    expect(result.current.isSubmitted).toBe(true);
  });

  it('should debounce save calls', async () => {
    const saved = { ...INITIAL_LETTER, content: 'Updated' };
    mockSave.mockResolvedValue(saved);

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    act(() => {
      result.current.save(null, 'First draft', null, null);
    });

    act(() => {
      result.current.save(null, 'Second draft', null, null);
    });

    // Should not have called API yet
    expect(mockSave).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Should only call once (debounced)
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('letter-1', {
      title: null,
      content: 'Second draft',
      mediaUrl: null,
      mediaType: null,
    });
  });

  it('should update lastSaved after successful save', async () => {
    const saved = { ...INITIAL_LETTER, content: 'Updated' };
    mockSave.mockResolvedValue(saved);

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    expect(result.current.lastSaved).toBeNull();

    act(() => {
      result.current.save(null, 'Updated', null, null);
    });

    // Advance debounce timer and flush microtasks
    await act(async () => {
      vi.advanceTimersByTime(2000);
      // Allow promises to resolve
      await vi.runAllTimersAsync();
    });

    expect(result.current.lastSaved).not.toBeNull();
  });

  it('should set error on save failure', async () => {
    mockSave.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    act(() => {
      result.current.save(null, 'Content', null, null);
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should not save if already submitted', () => {
    const submitted = { ...INITIAL_LETTER, submittedAt: '2026-01-02' };
    const { result } = renderHook(() => useFriendLetter('letter-1', submitted));

    act(() => {
      result.current.save(null, 'Should not save', null, null);
    });

    // Even after debounce, should not call API
    vi.advanceTimersByTime(3000);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should submit letter successfully', async () => {
    const submitted = { ...INITIAL_LETTER, submittedAt: '2026-01-02' };
    mockSubmit.mockResolvedValue(submitted);

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    let success: boolean = false;
    await act(async () => {
      success = await result.current.submit(null, 'Final content', null, null);
    });

    expect(success).toBe(true);
    expect(result.current.isSubmitted).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith('letter-1', {
      title: null,
      content: 'Final content',
      mediaUrl: null,
      mediaType: null,
    });
  });

  it('should return false on submit failure', async () => {
    mockSubmit.mockRejectedValue(new Error('Submit failed'));

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    let success: boolean = true;
    await act(async () => {
      success = await result.current.submit(null, 'Content', null, null);
    });

    expect(success).toBe(false);
    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.error).toBe('Submit failed');
  });

  it('should clear pending auto-save on submit', async () => {
    const submitted = { ...INITIAL_LETTER, submittedAt: '2026-01-02' };
    mockSubmit.mockResolvedValue(submitted);

    const { result } = renderHook(() => useFriendLetter('letter-1', INITIAL_LETTER));

    // Start an auto-save
    act(() => {
      result.current.save(null, 'Auto-save content', null, null);
    });

    // Submit before debounce fires
    await act(async () => {
      await result.current.submit(null, 'Final content', null, null);
    });

    // Advance past debounce — should not trigger save
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });
});
