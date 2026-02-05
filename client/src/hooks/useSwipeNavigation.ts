import { useState, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';

interface UseSwipeNavigationOptions {
  /** Total number of items */
  itemCount: number;
  /** Minimum distance (px) to trigger swipe */
  threshold?: number;
  /** Called when index changes */
  onIndexChange?: (index: number) => void;
}

interface UseSwipeNavigationResult {
  /** Current active index */
  currentIndex: number;
  /** Current drag offset (for animation) */
  dragX: number;
  /** Is currently dragging */
  isDragging: boolean;
  /** Direction of last navigation: 1 = forward, -1 = backward */
  direction: number;
  /** Bind to draggable element */
  bind: ReturnType<typeof useDrag>;
  /** Go to specific index */
  goTo: (index: number) => void;
  /** Go to next item */
  next: () => void;
  /** Go to previous item */
  prev: () => void;
}

/**
 * Hook for swipe-based navigation through items
 * Per CONTEXT.md: swipe to navigate pile, tap to open
 */
export function useSwipeNavigation({
  itemCount,
  threshold = 80,
  onIndexChange,
}: UseSwipeNavigationOptions): UseSwipeNavigationResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const goTo = useCallback(
    (index: number, dir?: number) => {
      // Wrap index for looping
      const wrappedIndex = ((index % itemCount) + itemCount) % itemCount;
      if (dir !== undefined) {
        setDirection(dir);
      } else {
        // Shortest-path heuristic for dot navigation
        const fwd = (wrappedIndex - currentIndex + itemCount) % itemCount;
        const bwd = (currentIndex - wrappedIndex + itemCount) % itemCount;
        setDirection(fwd <= bwd ? 1 : -1);
      }
      setCurrentIndex(wrappedIndex);
      onIndexChange?.(wrappedIndex);
    },
    [itemCount, onIndexChange, currentIndex]
  );

  const next = useCallback(() => {
    goTo(currentIndex + 1, 1);
  }, [currentIndex, goTo]);

  const prev = useCallback(() => {
    goTo(currentIndex - 1, -1);
  }, [currentIndex, goTo]);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      setIsDragging(active);

      if (active) {
        // Direct drag feedback (no edge damping since we loop)
        setDragX(mx);
      } else {
        // Check if swipe threshold exceeded or velocity is high
        const passedThreshold = Math.abs(mx) > threshold;
        const fastSwipe = Math.abs(vx) > 0.5;

        if (passedThreshold || fastSwipe) {
          // Swipe left (dx < 0) = next, swipe right (dx > 0) = prev
          // Standard carousel: swipe in direction you want content to move
          if (dx < 0) {
            next();
          } else if (dx > 0) {
            prev();
          }
        }

        setDragX(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      from: () => [dragX, 0],
    }
  );

  return {
    currentIndex,
    dragX,
    isDragging,
    direction,
    bind,
    goTo,
    next,
    prev,
  };
}
