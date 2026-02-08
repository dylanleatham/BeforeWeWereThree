import { useState, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface UseAutoSaveProps<T> {
  /** Save function to call with debounced content */
  saveFn: (content: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 1500ms) */
  delay?: number;
  /** Max wait before forcing a save in milliseconds (default: 5000ms) */
  maxWait?: number;
}

interface UseAutoSaveReturn<T> {
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Error message if last save failed */
  error: string | null;
  /** Whether there's a pending save (content changed but not yet saved) */
  isPending: boolean;
  /** Trigger a debounced save */
  save: (content: T) => void;
  /** Immediately flush any pending save */
  flush: () => Promise<void>;
}

/**
 * Hook for auto-saving content with debouncing
 *
 * Provides debounced saving with status feedback:
 * - Debounces save calls to reduce API traffic
 * - Tracks saving, pending, and error states
 * - Supports immediate flush for submit actions
 *
 * @example
 * const { isSaving, lastSavedAt, save, flush } = useAutoSave({
 *   saveFn: async (content) => api.saveLetter(id, content),
 *   delay: 1500,
 * });
 *
 * // On text change
 * onChange={(e) => { setText(e.target.value); save(e.target.value); }}
 *
 * // On submit, flush first
 * onSubmit={() => { await flush(); submit(); }}
 */
export function useAutoSave<T>({
  saveFn,
  delay = 1500,
  maxWait = 5000,
}: UseAutoSaveProps<T>): UseAutoSaveReturn<T> {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Track the latest content for flush
  const pendingContentRef = useRef<T | null>(null);
  // Track if flush was called while debounce was pending
  const flushResolveRef = useRef<(() => void) | null>(null);

  /**
   * Execute the actual save
   */
  const executeSave = useCallback(
    async (content: T) => {
      setIsSaving(true);
      setError(null);
      try {
        await saveFn(content);
        setLastSavedAt(new Date());
        pendingContentRef.current = null;
        setIsPending(false);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setIsSaving(false);
        // Resolve any pending flush
        if (flushResolveRef.current) {
          flushResolveRef.current();
          flushResolveRef.current = null;
        }
      }
    },
    [saveFn]
  );

  /**
   * Debounced save callback
   */
  const debouncedSave = useDebouncedCallback(
    (content: T) => {
      executeSave(content);
    },
    delay,
    { maxWait }
  );

  /**
   * Trigger a debounced save
   */
  const save = useCallback(
    (content: T) => {
      pendingContentRef.current = content;
      setIsPending(true);
      debouncedSave(content);
    },
    [debouncedSave]
  );

  /**
   * Immediately flush any pending save
   * Returns a promise that resolves when save completes
   */
  const flush = useCallback(async (): Promise<void> => {
    // Cancel any pending debounced call
    debouncedSave.cancel();

    // If there's pending content, save it immediately
    if (pendingContentRef.current !== null) {
      return new Promise<void>((resolve) => {
        flushResolveRef.current = resolve;
        executeSave(pendingContentRef.current as T);
      });
    }

    // If currently saving, wait for it to complete
    if (isSaving) {
      return new Promise<void>((resolve) => {
        flushResolveRef.current = resolve;
      });
    }
  }, [debouncedSave, executeSave, isSaving]);

  return {
    isSaving,
    lastSavedAt,
    error,
    isPending,
    save,
    flush,
  };
}
