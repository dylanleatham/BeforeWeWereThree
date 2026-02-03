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

  const goTo = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(itemCount - 1, index));
      setCurrentIndex(clampedIndex);
      onIndexChange?.(clampedIndex);
    },
    [itemCount, onIndexChange]
  );

  const next = useCallback(() => {
    if (currentIndex < itemCount - 1) {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, itemCount, goTo]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }, [currentIndex, goTo]);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      setIsDragging(active);

      if (active) {
        // Apply rubber-band effect at edges
        const atStart = currentIndex === 0 && mx > 0;
        const atEnd = currentIndex === itemCount - 1 && mx < 0;
        const dampedX = atStart || atEnd ? mx * 0.3 : mx;
        setDragX(dampedX);
      } else {
        // Check if swipe threshold exceeded or velocity is high
        const passedThreshold = Math.abs(mx) > threshold;
        const fastSwipe = Math.abs(vx) > 0.5;

        if (passedThreshold || fastSwipe) {
          if (dx < 0 && currentIndex < itemCount - 1) {
            next();
          } else if (dx > 0 && currentIndex > 0) {
            prev();
          }
        }

        setDragX(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: 0.15,
      from: () => [dragX, 0],
    }
  );

  return {
    currentIndex,
    dragX,
    isDragging,
    bind,
    goTo,
    next,
    prev,
  };
}
