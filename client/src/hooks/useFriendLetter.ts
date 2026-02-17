import { useState, useCallback, useRef, useEffect } from 'react';
import type { FriendLetter } from 'shared';
import { saveFriendLetter, submitFriendLetter } from '../services/friendApi';

interface UseFriendLetterReturn {
  letter: FriendLetter | null;
  isSaving: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  lastSaved: Date | null;
  error: string | null;
  save: (content: string, mediaUrl: string | null, mediaType: string | null) => void;
  submit: (content: string, mediaUrl: string | null, mediaType: string | null) => Promise<boolean>;
}

const AUTO_SAVE_DELAY_MS = 2000;

/**
 * Hook for friend letter auto-save and submit
 * Simpler than useLetter - no SignalR, no partner coordination
 */
export function useFriendLetter(
  letterId: string,
  initialLetter: FriendLetter | null
): UseFriendLetterReturn {
  const [letter, setLetter] = useState<FriendLetter | null>(initialLetter);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!initialLetter?.submittedAt);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const save = useCallback(
    (content: string, mediaUrl: string | null, mediaType: string | null) => {
      if (isSubmitted) return;

      // Debounced auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        setIsSaving(true);
        setError(null);
        try {
          const saved = await saveFriendLetter(letterId, {
            content,
            mediaUrl,
            mediaType,
          });
          if (mountedRef.current) {
            setLetter(saved);
            setLastSaved(new Date());
          }
        } catch (err) {
          if (mountedRef.current) {
            setError(err instanceof Error ? err.message : 'Failed to save');
          }
        } finally {
          if (mountedRef.current) {
            setIsSaving(false);
          }
        }
      }, AUTO_SAVE_DELAY_MS);
    },
    [letterId, isSubmitted]
  );

  const submit = useCallback(
    async (
      content: string,
      mediaUrl: string | null,
      mediaType: string | null
    ): Promise<boolean> => {
      if (isSubmitted) return false;

      // Clear pending auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const submitted = await submitFriendLetter(letterId, {
          content,
          mediaUrl,
          mediaType,
        });
        if (mountedRef.current) {
          setLetter(submitted);
          setIsSubmitted(true);
        }
        return true;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to submit');
        }
        return false;
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [letterId, isSubmitted]
  );

  return {
    letter,
    isSaving,
    isSubmitting,
    isSubmitted,
    lastSaved,
    error,
    save,
    submit,
  };
}
