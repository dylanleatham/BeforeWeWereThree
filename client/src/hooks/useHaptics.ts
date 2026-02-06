import { useCallback, useMemo } from 'react';
import { HAPTIC_TAP_DURATION_MS, HAPTIC_SUCCESS_PATTERN_MS } from '../constants/animation';

/**
 * Hook for mobile haptic feedback via Web Vibration API
 * Note: Only works on Android. iOS Safari does not support Vibration API.
 * Fails gracefully - haptics are enhancement, not critical functionality.
 */

interface HapticsHook {
  /** Whether device supports vibration */
  isSupported: boolean;
  /** Short tap feedback (~50ms) */
  triggerTap: () => void;
  /** Success pattern (tap-pause-tap) */
  triggerSuccess: () => void;
  /** Custom pattern */
  triggerPattern: (pattern: number | number[]) => void;
}

export function useHaptics(): HapticsHook {
  const isSupported = useMemo(
    () => typeof navigator !== 'undefined' && 'vibrate' in navigator,
    []
  );

  const triggerPattern = useCallback(
    (pattern: number | number[]) => {
      if (!isSupported) return;

      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail - haptics are enhancement, not critical
      }
    },
    [isSupported]
  );

  const triggerTap = useCallback(() => {
    triggerPattern(HAPTIC_TAP_DURATION_MS);
  }, [triggerPattern]);

  const triggerSuccess = useCallback(() => {
    triggerPattern([...HAPTIC_SUCCESS_PATTERN_MS]);
  }, [triggerPattern]);

  return {
    isSupported,
    triggerTap,
    triggerSuccess,
    triggerPattern,
  };
}
