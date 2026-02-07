import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WYRPhase,
  WYRChoice,
  WYRPrompt,
  WYRResults,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import { getWyrPrompt, submitWyrVote } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UseWouldYouRatherProps {
  /** Envelope ID to fetch WYR prompt for */
  envelopeId: string;
}

interface UseWouldYouRatherReturn {
  /** Current prompt data (null if loading or error) */
  prompt: WYRPrompt | null;
  /** Current phase of the activity */
  phase: WYRPhase;
  /** User's vote (null if not voted) */
  myVote: WYRChoice | null;
  /** Whether partner has voted */
  partnerVoted: boolean;
  /** Results after reveal (null if not revealed) */
  results: WYRResults | null;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether SignalR connection is active */
  isConnected: boolean;
  /** Submit a vote */
  vote: (choice: WYRChoice) => Promise<void>;
  /** Advance to complete phase (after reveal) */
  advance: () => void;
  /** Retry loading after error */
  retry: () => void;
}

/**
 * Hook for managing Would You Rather activity state
 *
 * Handles:
 * - Initial data loading from API
 * - Phase state machine (voting -> waiting -> revealing -> complete)
 * - SignalR event subscriptions for real-time updates
 * - Vote submission with connection validation
 *
 * @example
 * const { prompt, phase, vote, isConnected } = useWouldYouRather({ envelopeId });
 */
export function useWouldYouRather({
  envelopeId,
}: UseWouldYouRatherProps): UseWouldYouRatherReturn {
  // Core state
  const [prompt, setPrompt] = useState<WYRPrompt | null>(null);
  const [phase, setPhase] = useState<WYRPhase>('voting');
  const [myVote, setMyVote] = useState<WYRChoice | null>(null);
  const [partnerVoted, setPartnerVoted] = useState(false);
  const [results, setResults] = useState<WYRResults | null>(null);

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
  const loadPromptState = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getWyrPrompt(envelopeId);

      setPrompt(data.prompt);
      setMyVote(data.myVote);
      setPartnerVoted(data.partnerVoted);
      setResults(data.results);

      // Determine initial phase based on state
      if (data.results) {
        // Both voted, reveal ready
        setPhase('revealing');
      } else if (data.myVote) {
        // I voted, waiting for partner
        setPhase('waiting');
      } else {
        // Haven't voted yet
        setPhase('voting');
      }

      loadedRef.current = true;
    } catch (err) {
      console.error('Failed to load WYR prompt:', err);
      setError(STRINGS.WYR_ERROR_LOADING);
    } finally {
      setIsLoading(false);
    }
  }, [envelopeId]);

  // Load on mount
  useEffect(() => {
    loadPromptState();
  }, [loadPromptState]);

  /**
   * Handle partner vote submitted event
   * Sets partnerVoted flag (reveal happens via wyrRevealReady)
   */
  useSignalREvent<WYRVoteSubmittedMessage>('wyrVoteSubmitted', (data) => {
    if (data.promptId === prompt?.id) {
      setPartnerVoted(true);
    }
  });

  /**
   * Handle reveal ready event
   * Both participants voted, show results
   */
  useSignalREvent<WYRRevealReadyMessage>('wyrRevealReady', (data) => {
    if (data.promptId === prompt?.id) {
      setResults(data.results);
      setPhase('revealing');
    }
  });

  /**
   * Submit a vote choice
   */
  const vote = useCallback(
    async (choice: WYRChoice) => {
      if (!prompt) {
        return;
      }

      try {
        // Optimistic update
        setMyVote(choice);
        setPhase('waiting');
        setError(null);

        // Submit to server
        const response = await submitWyrVote(prompt.id, choice);

        // Check if reveal is immediate (both voted)
        if (response.revealed && response.results) {
          setResults(response.results);
          setPhase('revealing');
        }
      } catch (err) {
        console.error('Failed to submit vote:', err);
        // Revert optimistic update on error
        setMyVote(null);
        setPhase('voting');
        setError(STRINGS.WYR_ERROR_VOTING);
      }
    },
    [prompt]
  );

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
    loadPromptState();
  }, [loadPromptState]);

  return {
    prompt,
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
