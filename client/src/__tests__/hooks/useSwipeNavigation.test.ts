/**
 * useSwipeNavigation hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock @use-gesture/react — provide a useDrag that captures the handler
// so we can simulate gesture callbacks in tests
let dragHandler: (state: Record<string, unknown>) => void;

vi.mock('@use-gesture/react', () => ({
  useDrag: vi.fn((handler: (state: Record<string, unknown>) => void) => {
    dragHandler = handler;
    return vi.fn();
  }),
}));

import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

describe('useSwipeNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start at index 0', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragX).toBe(0);
  });

  it('should navigate forward with next()', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    act(() => {
      result.current.next();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.direction).toBe(1);
  });

  it('should navigate backward with prev()', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    // Go forward first so we can go back
    act(() => {
      result.current.next();
    });

    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.prev();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.direction).toBe(-1);
  });

  it('should wrap around with next at end', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 3 }));

    act(() => {
      result.current.next();
    });
    act(() => {
      result.current.next();
    });

    expect(result.current.currentIndex).toBe(2);

    act(() => {
      result.current.next();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('should wrap around with prev at start', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 3 }));

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.prev();
    });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.direction).toBe(-1);
  });

  it('should call onIndexChange callback', () => {
    const onIndexChange = vi.fn();

    const { result } = renderHook(() =>
      useSwipeNavigation({ itemCount: 5, onIndexChange })
    );

    act(() => {
      result.current.next();
    });

    expect(onIndexChange).toHaveBeenCalledWith(1);

    act(() => {
      result.current.goTo(3);
    });

    expect(onIndexChange).toHaveBeenCalledWith(3);
  });

  it('should set correct direction for goTo', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    // Going forward (0 -> 1): fwd=1, bwd=4, shorter forward
    act(() => {
      result.current.goTo(1);
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.direction).toBe(1);

    // Going backward (1 -> 4): fwd=3, bwd=2, shorter backward
    act(() => {
      result.current.goTo(4);
    });

    expect(result.current.currentIndex).toBe(4);
    expect(result.current.direction).toBe(-1);
  });

  it('should handle drag gesture completing a swipe left (next)', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    // Simulate active drag
    act(() => {
      dragHandler({
        active: true,
        movement: [-100, 0],
        direction: [-1, 0],
        velocity: [0.3, 0],
      });
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragX).toBe(-100);

    // Simulate drag end — exceeds threshold, swipe left = next
    act(() => {
      dragHandler({
        active: false,
        movement: [-100, 0],
        direction: [-1, 0],
        velocity: [0.3, 0],
      });
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragX).toBe(0);
    expect(result.current.currentIndex).toBe(1);
  });

  it('should handle drag gesture completing a swipe right (prev)', () => {
    const { result } = renderHook(() => useSwipeNavigation({ itemCount: 5 }));

    // First go to index 1 so we can go back
    act(() => {
      result.current.next();
    });

    expect(result.current.currentIndex).toBe(1);

    // Simulate drag end — swipe right = prev
    act(() => {
      dragHandler({
        active: false,
        movement: [100, 0],
        direction: [1, 0],
        velocity: [0.3, 0],
      });
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.direction).toBe(-1);
  });
});
