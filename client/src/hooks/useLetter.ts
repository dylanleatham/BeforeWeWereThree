import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  LetterPhase,
  LetterPrompt,
  Letter,
  LetterSubmittedMessage,
  LetterRevealReadyMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import { getLetterState, saveLetter, submitLetter } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UseLetterProps {
  /** Envelope ID to fetch letter prompt for */
  envelopeId: string;
}

interface UseLetterReturn {
  /** Current prompt data (null if loading or error) */
  prompt: LetterPrompt | null;
  /** Current phase of the activity */
  phase: LetterPhase;
  /** User's letter (null if not started) */
  myLetter: Letter | null;
  /** Revealed letters after both submit [mine, partner's] */
  revealedLetters: { mine: Letter; partner: Letter } | null;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether SignalR connection is active */
  isConnected: boolean;
  /** Save letter content (auto-save) */
  save: (content: string, photoUrl: string | null) => Promise<void>;
  /** Submit the letter with current content */
  submit: (content: string, photoUrl: string | null) => Promise<void>;
  /** Advance to complete phase (after reveal) */
  advance: () => void;
  /** Retry loading after error */
  retry: () => void;
}

/**
 * Hook for managing Letter to Baby activity state
 *
 * Handles:
 * - Initial data loading from API
 * - Phase state machine (writing -> waiting -> revealing -> complete)
 * - Auto-save of letter content
 * - SignalR event subscriptions for real-time updates
 *
 * @example
 * const { prompt, phase, save, submit, isConnected } = useLetter({ envelopeId });
 */
export function useLetter({ envelopeId }: UseLetterProps): UseLetterReturn {
  // Core state
  const [prompt, setPrompt] = useState<LetterPrompt | null>(null);
  const [phase, setPhase] = useState<LetterPhase>('writing');
  const [myLetter, setMyLetter] = useState<Letter | null>(null);
  const [revealedLetters, setRevealedLetters] = useState<{
    mine: Letter;
    partner: Letter;
  } | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection state from SignalR context
  const { connection, isConnected } = useSignalRConnection();

  // Track if we've loaded data (for retry)
  const loadedRef = useRef(false);

  /**
   * Join the activity group for real-time updates
   * This is required for Socket.io to receive broadcasts
   */
  useEffect(() => {
    if (!connection || !envelopeId) return;

    const groupName = `activity:${envelopeId}`;
    connection.joinGroup(groupName);

    return () => {
      connection.leaveGroup(groupName);
    };
  }, [connection, envelopeId]);

  /**
   * Load initial prompt state from API
   */
  const loadLetterState = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLetterState(envelopeId);

      setPrompt(data.prompt);
      setMyLetter(data.myLetter);

      // Determine initial phase based on state
      if (data.revealedLetters.length >= 2) {
        // Both letters revealed
        const mine = data.revealedLetters.find(
          (l) => l.id === data.myLetter?.id
        );
        const partner = data.revealedLetters.find(
          (l) => l.id !== data.myLetter?.id
        );
        if (mine && partner) {
          setRevealedLetters({ mine, partner });
          setPhase('revealing');
        }
      } else if (data.myLetter?.submittedAt) {
        // I submitted, waiting for partner
        setPhase('waiting');
      } else {
        // Haven't submitted yet (still writing)
        setPhase('writing');
      }

      loadedRef.current = true;
    } catch (err) {
      console.error('Failed to load letter state:', err);
      setError(STRINGS.LETTER_ERROR_LOADING);
    } finally {
      setIsLoading(false);
    }
  }, [envelopeId]);

  // Load on mount
  useEffect(() => {
    loadLetterState();
  }, [loadLetterState]);

  /**
   * Handle partner letter submitted event
   * Just updates partner status - reveal happens via letterRevealReady
   */
  useSignalREvent<LetterSubmittedMessage>('letterSubmitted', (data) => {
    if (data.promptId === prompt?.id) {
      // Partner submitted their letter
      // If we've already submitted, we should get a reveal event soon
      console.log('Partner submitted letter');
    }
  });

  /**
   * Handle reveal ready event
   * Both participants submitted, show both letters
   */
  useSignalREvent<LetterRevealReadyMessage>('letterRevealReady', (data) => {
    if (data.promptId === prompt?.id) {
      // Find mine and partner letters
      const mine = data.letters.find((l) => l.id === myLetter?.id);
      const partner = data.letters.find((l) => l.id !== myLetter?.id);
      if (mine && partner) {
        setRevealedLetters({ mine, partner });
        setPhase('revealing');
      }
    }
  });

  /**
   * Save letter content (called by auto-save or immediate save)
   */
  const save = useCallback(
    async (content: string, photoUrl: string | null) => {
      if (!prompt) return;

      try {
        setError(null);
        const updatedLetter = await saveLetter(envelopeId, content, photoUrl);
        setMyLetter(updatedLetter);
      } catch (err) {
        console.error('Failed to save letter:', err);
        setError(STRINGS.LETTER_ERROR_SAVING);
        throw err;
      }
    },
    [prompt, envelopeId]
  );

  /**
   * Submit the letter with current content from the textarea
   * Accepts content directly to avoid submitting stale hook state
   */
  const submit = useCallback(async (content: string, photoUrl: string | null) => {
    if (!prompt || !myLetter) return;

    // Capture letter ID before async call for reveal matching
    const myLetterId = myLetter.id;

    try {
      setError(null);

      // Submit to server with current content from caller
      const response = await submitLetter(envelopeId, content, photoUrl);

      // Update local letter state to reflect submission
      setMyLetter((prev) => prev ? { ...prev, content, photoUrl, submittedAt: new Date().toISOString() } : prev);

      // Check if reveal is immediate (both submitted)
      if (response.revealed && response.letters && response.letters.length >= 2) {
        const mine = response.letters.find((l) => l.id === myLetterId);
        const partner = response.letters.find((l) => l.id !== myLetterId);
        if (mine && partner) {
          setRevealedLetters({ mine, partner });
          setPhase('revealing');
        }
      } else {
        // Waiting for partner
        setPhase('waiting');
      }
    } catch (err) {
      console.error('Failed to submit letter:', err);
      setError(STRINGS.LETTER_ERROR_SUBMITTING);
    }
  }, [prompt, envelopeId, myLetter]);

  /**
   * Advance to complete phase (after reveal)
   * Parent component handles envelope status update
   */
  const advance = useCallback(() => {
    setPhase('complete');
  }, []);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    loadLetterState();
  }, [loadLetterState]);

  return {
    prompt,
    phase,
    myLetter,
    revealedLetters,
    isLoading,
    error,
    isConnected,
    save,
    submit,
    advance,
    retry,
  };
}
