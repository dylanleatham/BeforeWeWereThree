import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  NameVoteChoice,
  NameVoteState,
  NameGameRoundResponse,
  NameGameResults,
  GeneratedName,
  NameVoteSubmittedMessage,
  NameRoundCompleteMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import {
  getNameGameState,
  generateNameGameRound,
  submitNameVote,
} from '../services/api';
import { useSession } from './useSession';

/**
 * Phase state machine for the Name Game activity
 *
 * loading     -> Initial load from API
 * new-round   -> Ready to start a round (first or subsequent)
 * generating  -> AI is generating names
 * voting      -> Swiping through names to vote
 * waiting     -> Current user finished, waiting for partner
 * results     -> Both voted, showing match results
 */
export type NameGamePhase =
  | 'loading'
  | 'new-round'
  | 'generating'
  | 'voting'
  | 'waiting'
  | 'results';

interface UseNameGameReturn {
  /** Current phase of the activity */
  phase: NameGamePhase;
  /** Current round data (names with vote state) */
  currentRound: NameGameRoundResponse | null;
  /** Index of the name currently being voted on */
  currentNameIndex: number;
  /** Accumulated matches across all rounds */
  allMatches: GeneratedName[];
  /** Results after both partners finish voting */
  results: NameGameResults | null;
  /** Number of completed rounds */
  roundCount: number;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether SignalR connection is active */
  isConnected: boolean;
  /** Start a new round with optional guidance text */
  startRound: (guidance?: string) => Promise<void>;
  /** Submit a vote on the current name */
  vote: (choice: NameVoteChoice) => Promise<void>;
  /** Move to new-round phase after viewing results */
  startNewRound: () => void;
  /** Retry loading after error */
  retry: () => void;
}

/**
 * Simple seeded PRNG (mulberry32)
 * Used for deterministic shuffle so each participant sees a different order
 * but the order is stable across refreshes.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a number (for seeded shuffle)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

/**
 * Fisher-Yates shuffle with a seeded PRNG
 * Returns a new array (does not mutate input)
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rng = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Shuffle name vote states using a deterministic seed based on participantId.
 * Each partner sees names in a different order, but order is stable across refreshes.
 */
function shuffleNames(names: NameVoteState[], participantId: string | null): NameVoteState[] {
  if (!participantId || names.length <= 1) return names;
  const seed = hashString(participantId);
  return seededShuffle(names, seed);
}

/**
 * Hook for managing the Baby Name Game activity state
 *
 * Handles:
 * - Initial data loading from API
 * - Phase state machine (loading -> new-round -> generating -> voting -> waiting -> results)
 * - Client-side name shuffling per participant
 * - SignalR event subscriptions for real-time partner updates
 * - Optimistic vote submission with rollback on error
 *
 * @param envelopeId - The envelope ID for this name game activity
 */
export function useNameGame(envelopeId: string): UseNameGameReturn {
  // Phase state
  const [phase, setPhase] = useState<NameGamePhase>('loading');
  const [currentRound, setCurrentRound] = useState<NameGameRoundResponse | null>(null);
  const [currentNameIndex, setCurrentNameIndex] = useState(0);
  const [allMatches, setAllMatches] = useState<GeneratedName[]>([]);
  const [results, setResults] = useState<NameGameResults | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const { connection, isConnected } = useSignalRConnection();

  // Get participantId for deterministic shuffle
  const { participantId } = useSession();

  // Track loaded state for retry
  const loadedRef = useRef(false);

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
   * Load initial state from API
   */
  const loadState = useCallback(async () => {
    setPhase('loading');
    setError(null);

    try {
      const data = await getNameGameState(envelopeId);

      setRoundCount(data.roundCount);
      setAllMatches(data.allMatches);

      if (data.currentRound) {
        // Shuffle names for this participant
        const shuffledRound: NameGameRoundResponse = {
          ...data.currentRound,
          names: shuffleNames(data.currentRound.names, participantId),
        };
        setCurrentRound(shuffledRound);

        if (data.currentRound.allVoted) {
          // Round is complete — show results (need to fetch them)
          // The state endpoint doesn't include results, so go to new-round
          // since the round results were already seen
          setPhase('new-round');
        } else {
          // Find first unvoted name to resume from
          const firstUnvoted = shuffledRound.names.findIndex((n) => n.myVote === null);
          if (firstUnvoted === -1) {
            // All voted by this user, waiting for partner
            setCurrentNameIndex(shuffledRound.names.length - 1);
            setPhase('waiting');
          } else {
            setCurrentNameIndex(firstUnvoted);
            setPhase('voting');
          }
        }
      } else {
        // No rounds yet — show first round start
        setPhase('new-round');
      }

      loadedRef.current = true;
    } catch (err) {
      console.error('Failed to load name game state:', err);
      setError(err instanceof Error ? err.message : 'Failed to load name game');
      setPhase('new-round');
    }
  }, [envelopeId, participantId]);

  // Load on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load sets state after await
    void loadState();
  }, [loadState]);

  /**
   * Handle partner vote progress event
   */
  useSignalREvent<NameVoteSubmittedMessage>('nameVoteSubmitted', (_data) => {
    // Partner submitted a vote — could update a progress indicator
    // For now, this is a no-op; the UI shows waiting state
  });

  /**
   * Handle round complete event (both partners finished voting)
   */
  useSignalREvent<NameRoundCompleteMessage>('nameRoundComplete', (data) => {
    if (currentRound && data.roundId === currentRound.roundId) {
      setResults(data.results);
      // Merge new matches into allMatches
      if (data.results.matches.length > 0) {
        setAllMatches((prev) => [...prev, ...data.results.matches]);
      }
      setPhase('results');
    }
  });

  /**
   * Start a new round of name generation
   */
  const startRound = useCallback(
    async (guidance?: string) => {
      setPhase('generating');
      setError(null);

      try {
        const round = await generateNameGameRound(envelopeId, guidance);

        // Shuffle names for this participant
        const shuffledRound: NameGameRoundResponse = {
          ...round,
          names: shuffleNames(round.names, participantId),
        };

        setCurrentRound(shuffledRound);
        setCurrentNameIndex(0);
        setResults(null);
        setRoundCount((prev) => prev + 1);
        setPhase('voting');
      } catch (err) {
        console.error('Failed to generate names:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate names');
        setPhase('new-round');
      }
    },
    [envelopeId, participantId]
  );

  /**
   * Submit a vote on the current name
   */
  const vote = useCallback(
    async (choice: NameVoteChoice) => {
      if (!currentRound) return;

      const nameAtIndex = currentRound.names[currentNameIndex];
      if (!nameAtIndex) return;

      // Capture values before async call
      const nameId = nameAtIndex.name.id;
      const votingIndex = currentNameIndex;
      const totalNames = currentRound.names.length;
      const isLastName = votingIndex >= totalNames - 1;

      try {
        // Optimistic: advance to next name or waiting
        if (isLastName) {
          setPhase('waiting');
        } else {
          setCurrentNameIndex(votingIndex + 1);
        }
        setError(null);

        // Submit to server
        const response = await submitNameVote(nameId, choice);

        // If both partners finished, show results immediately
        if (response.allVoted && response.results) {
          setResults(response.results);
          // Merge new matches into allMatches
          if (response.results.matches.length > 0) {
            setAllMatches((prev) => [...prev, ...response.results!.matches]);
          }
          setPhase('results');
        }
      } catch (err) {
        console.error('Failed to submit vote:', err);
        // Rollback optimistic update
        setCurrentNameIndex(votingIndex);
        if (isLastName) {
          setPhase('voting');
        }
        setError(err instanceof Error ? err.message : 'Failed to submit vote');
      }
    },
    [currentRound, currentNameIndex]
  );

  /**
   * Move to new-round phase after viewing results
   */
  const startNewRound = useCallback(() => {
    setPhase('new-round');
    setResults(null);
    setCurrentRound(null);
    setCurrentNameIndex(0);
  }, []);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    loadState();
  }, [loadState]);

  return {
    phase,
    currentRound,
    currentNameIndex,
    allMatches,
    results,
    roundCount,
    error,
    isConnected,
    startRound,
    vote,
    startNewRound,
    retry,
  };
}
