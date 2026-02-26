import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WYRPhase,
  WYRChoice,
  WYRPromptState,
  WYRResults,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import { getWyrState, submitWyrVote } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UseWouldYouRatherProps {
  /** Envelope ID to fetch WYR prompts for */
  envelopeId: string;
}

interface UseWouldYouRatherReturn {
  /** All prompt states */
  prompts: WYRPromptState[];
  /** Current prompt (derived from currentIndex) */
  currentPrompt: WYRPromptState | null;
  /** Current prompt index */
  currentIndex: number;
  /** Total number of prompts */
  totalPrompts: number;
  /** Whether all prompts are completed */
  allComplete: boolean;
  /** Current phase of the activity (for current prompt) */
  phase: WYRPhase;
  /** User's vote on current prompt (null if not voted) */
  myVote: WYRChoice | null;
  /** Whether partner has voted on current prompt */
  partnerVoted: boolean;
  /** Results for current prompt after reveal (null if not revealed) */
  results: WYRResults | null;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether SignalR connection is active */
  isConnected: boolean;
  /** Submit a vote */
  vote: (choice: WYRChoice) => Promise<void>;
  /** Advance to next prompt or complete phase */
  advance: () => void;
  /** Retry loading after error */
  retry: () => void;
}

/**
 * Compute the WYR phase for a given prompt state
 */
function computePhase(ps: WYRPromptState): WYRPhase {
  if (ps.results) return 'revealing';
  if (ps.myVote) return 'waiting';
  return 'voting';
}

/**
 * Hook for managing multi-prompt Would You Rather activity state
 *
 * Handles:
 * - Initial data loading from API (multi-prompt response)
 * - Phase state machine per prompt (voting -> waiting -> revealing -> complete)
 * - Per-prompt gating: both users must answer before advancing
 * - Summary view for reopened completed envelopes
 * - SignalR event subscriptions for real-time updates
 */
export function useWouldYouRather({
  envelopeId,
}: UseWouldYouRatherProps): UseWouldYouRatherReturn {
  // Multi-prompt state
  const [prompts, setPrompts] = useState<WYRPromptState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);
  const [phase, setPhase] = useState<WYRPhase>('voting');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection state from SignalR context
  const { connection, isConnected } = useSignalRConnection();

  // Mounted ref for async safety (per CLAUDE.md: set true in effect body)
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Derived values
  const currentPrompt = prompts[currentIndex] ?? null;
  const totalPrompts = prompts.length;
  const myVote = currentPrompt?.myVote ?? null;
  const partnerVoted = currentPrompt?.partnerVoted ?? false;
  const results = currentPrompt?.results ?? null;

  /**
   * Join the activity group for real-time updates
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
  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getWyrState(envelopeId);

      if (!mountedRef.current) return;

      setPrompts(data.prompts);
      setCurrentIndex(data.currentPromptIndex);
      setAllComplete(data.allComplete);

      // Determine initial phase
      if (data.allComplete) {
        setPhase('summary');
      } else {
        const current = data.prompts[data.currentPromptIndex];
        if (current) {
          setPhase(computePhase(current));
        }
      }

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to load WYR state:', err);
      setError(STRINGS.WYR_ERROR_LOADING);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [envelopeId]);

  // Load on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  /**
   * Handle partner vote submitted event
   */
  useSignalREvent<WYRVoteSubmittedMessage>('wyrVoteSubmitted', (data) => {
    // Find the matching prompt in our array
    setPrompts((prev) => {
      const idx = prev.findIndex((ps) => ps.prompt.id === data.promptId);
      if (idx === -1) return prev;

      const updated = [...prev];
      updated[idx] = { ...updated[idx]!, partnerVoted: true };

      // If this is the current prompt, no phase change yet (reveal comes via wyrRevealReady)
      return updated;
    });
  });

  /**
   * Handle reveal ready event
   */
  useSignalREvent<WYRRevealReadyMessage>('wyrRevealReady', (data) => {
    setPrompts((prev) => {
      const idx = prev.findIndex((ps) => ps.prompt.id === data.promptId);
      if (idx === -1) return prev;

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx]!,
        partnerVoted: true,
        results: data.results,
      };

      return updated;
    });

    // If this is the current prompt, transition to revealing
    if (currentPrompt && data.promptId === currentPrompt.prompt.id) {
      setPhase('revealing');
    }
  });

  /**
   * Submit a vote choice
   */
  const vote = useCallback(
    async (choice: WYRChoice) => {
      if (!currentPrompt) return;

      const promptId = currentPrompt.prompt.id;
      const idx = currentIndex;

      try {
        // Optimistic update
        setPrompts((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx]!, myVote: choice };
          return updated;
        });
        setPhase('waiting');
        setError(null);

        // Submit to server
        const response = await submitWyrVote(promptId, choice);

        if (!mountedRef.current) return;

        // Check if reveal is immediate (both voted)
        if (response.revealed && response.results) {
          setPrompts((prev) => {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx]!,
              myVote: choice,
              partnerVoted: true,
              results: response.results!,
            };
            return updated;
          });
          setPhase('revealing');
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('Failed to submit vote:', err);
        // Revert optimistic update
        setPrompts((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx]!, myVote: null };
          return updated;
        });
        setPhase('voting');
        setError(STRINGS.WYR_ERROR_VOTING);
      }
    },
    [currentPrompt, currentIndex]
  );

  /**
   * Advance to next prompt or complete phase
   */
  const advance = useCallback(() => {
    if (currentIndex < totalPrompts - 1) {
      // Move to next prompt
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nextPrompt = prompts[nextIndex];
      if (nextPrompt) {
        setPhase(computePhase(nextPrompt));
      }
    } else {
      // Last prompt — go to complete phase
      setPhase('complete');
    }
  }, [currentIndex, totalPrompts, prompts]);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    loadState();
  }, [loadState]);

  return {
    prompts,
    currentPrompt,
    currentIndex,
    totalPrompts,
    allComplete,
    phase,
    myVote,
    partnerVoted,
    results,
    isLoading,
    error,
    isConnected,
    vote,
    advance,
    retry,
  };
}
