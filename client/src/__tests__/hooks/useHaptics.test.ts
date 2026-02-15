/**
 * useHaptics hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHaptics } from '../../hooks/useHaptics';

describe('useHaptics', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      writable: true,
      configurable: true,
    });
  });

  describe('when vibration is supported', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
    });

    it('should report isSupported as true', () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isSupported).toBe(true);
    });

    it('should call vibrate on triggerTap', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerTap();

      expect(navigator.vibrate).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should call vibrate with pattern on triggerSuccess', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerSuccess();

      expect(navigator.vibrate).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should call vibrate with custom pattern', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.triggerPattern([100, 50, 100]);

      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    });
  });

  describe('when vibration is not supported', () => {
    beforeEach(() => {
      // Delete vibrate property to simulate unsupported device
      // Setting to undefined isn't enough — 'vibrate' in navigator would still be true
      delete (navigator as Record<string, unknown>).vibrate;
    });

    it('should report isSupported as false', () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isSupported).toBe(false);
    });

    it('should not throw on triggerTap when unsupported', () => {
      const { result } = renderHook(() => useHaptics());

      expect(() => result.current.triggerTap()).not.toThrow();
    });

    it('should not throw on triggerSuccess when unsupported', () => {
      const { result } = renderHook(() => useHaptics());

      expect(() => result.current.triggerSuccess()).not.toThrow();
    });
  });
});
