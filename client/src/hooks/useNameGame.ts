import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  NameVoteChoice,
  NameVoteState,
  NameGameRoundResponse,
  NameGameResults,
  GeneratedName,
  NameVoteSubmittedMessage,
  NameRoundCompleteMessage,
  NameRoundGeneratedMessage,
  NameGuidanceSubmittedMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import {
  getNameGameState,
  submitNameGameGuidance,
  submitNameVote,
} from '../services/api';
import { useSession } from './useSession';

/**
 * Phase state machine for the Name Game activity
 *
 * loading              -> Initial load from API
 * new-round            -> Ready to start a round (first or subsequent)
 * generating           -> AI is generating names
 * waiting-for-guidance -> Submitted guidance, waiting for partner to submit theirs
 * voting               -> Swiping through names to vote
 * waiting              -> Current user finished, waiting for partner
 * results              -> Both voted, showing match results
 */
export type NameGamePhase =
  | 'loading'
  | 'new-round'
  | 'generating'
  | 'waiting-for-guidance'
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
  /** Whether the partner has already submitted guidance for the next round */
  partnerGuidanceSubmitted: boolean;
  /** Submit guidance/readiness for the next round */
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
  const [partnerGuidanceSubmitted, setPartnerGuidanceSubmitted] = useState(false);

  // Connection state
  const { connection, isConnected } = useSignalRConnection();

  // Get participantId for deterministic shuffle
  const { participantId } = useSession();

  // Track loaded state for retry
  const loadedRef = useRef(false);

  // Guard against double-vote submissions (e.g., rapid taps or gesture double-fire)
  const votingInFlightRef = useRef<string | null>(null);

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

      // Check for pending guidance state (guidance submitted but round not yet generated)
      if (data.pendingGuidance) {
        setPartnerGuidanceSubmitted(data.pendingGuidance.partnerGuidanceSubmitted);
        if (data.pendingGuidance.myGuidanceSubmitted) {
          // We already submitted — resume waiting for partner
          setPhase('waiting-for-guidance');
          loadedRef.current = true;
          return;
        }
      }

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
      // Merge new matches into allMatches (deduplicate by ID to avoid double-append
      // when both the vote response and SignalR event fire for the same round)
      if (data.results.matches.length > 0) {
        setAllMatches((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMatches = data.results.matches.filter((m) => !existingIds.has(m.id));
          return newMatches.length > 0 ? [...prev, ...newMatches] : prev;
        });
      }
      setPhase('results');
    }
  });

  /**
   * Handle round generated event (partner triggered generation, names are ready)
   * Received by the participant who didn't trigger generation
   */
  useSignalREvent<NameRoundGeneratedMessage>('nameRoundGenerated', (data) => {
    // Only process if we're in a state where we'd expect new names
    if (phase === 'waiting-for-guidance' || phase === 'generating' || phase === 'new-round') {
      const shuffledRound: NameGameRoundResponse = {
        ...data.round,
        names: shuffleNames(data.round.names, participantId),
      };
      setCurrentRound(shuffledRound);
      setCurrentNameIndex(0);
      setResults(null);
      setRoundCount((prev) => prev + 1);
      setPartnerGuidanceSubmitted(false);
      setPhase('voting');
    }
  });

  /**
   * Handle partner guidance submitted event
   * Updates the UI to show the partner has submitted their preferences
   */
  useSignalREvent<NameGuidanceSubmittedMessage>('nameGuidanceSubmitted', (_data) => {
    setPartnerGuidanceSubmitted(true);
  });

  /**
   * Submit guidance/readiness for the next round
   *
   * Sends guidance to server. Response is either:
   * - waiting_for_partner: we're first, show waiting UI
   * - round_generated: both ready, names generated, go to voting
   */
  const startRound = useCallback(
    async (guidance?: string) => {
      setPhase('generating');
      setError(null);

      try {
        const result = await submitNameGameGuidance(envelopeId, guidance);

        if (result.status === 'waiting_for_partner') {
          setPhase('waiting-for-guidance');
        } else {
          // round_generated — shuffle and go to voting
          const shuffledRound: NameGameRoundResponse = {
            ...result.round,
            names: shuffleNames(result.round.names, participantId),
          };

          setCurrentRound(shuffledRound);
          setCurrentNameIndex(0);
          setResults(null);
          setRoundCount((prev) => prev + 1);
          setPartnerGuidanceSubmitted(false);
          setPhase('voting');
        }
      } catch (err) {
        console.error('Failed to submit guidance:', err);
        setError(err instanceof Error ? err.message : 'Failed to submit guidance');
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

      // Guard against double-submission for the same name
      if (votingInFlightRef.current === nameId) return;

      try {
        votingInFlightRef.current = nameId;

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
          // Merge new matches into allMatches (deduplicate by ID to avoid double-append
          // when both the vote response and SignalR event fire for the same round)
          if (response.results.matches.length > 0) {
            setAllMatches((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMatches = response.results!.matches.filter((m) => !existingIds.has(m.id));
              return newMatches.length > 0 ? [...prev, ...newMatches] : prev;
            });
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
        // Clear guard on error so user can retry
        votingInFlightRef.current = null;
      } finally {
        votingInFlightRef.current = null;
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
    setPartnerGuidanceSubmitted(false);
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
    partnerGuidanceSubmitted,
    startRound,
    vote,
    startNewRound,
    retry,
  };
}
