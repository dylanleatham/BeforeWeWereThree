import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GenderRevealPhase,
  GenderValue,
  GenderRevealKeyValidatedMessage,
  GenderRevealUnlockedMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import { getGenderRevealState, validateRevealKey } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UseGenderRevealProps {
  /** Envelope ID for this gender reveal */
  envelopeId: string;
}

interface UseGenderRevealReturn {
  /** Current phase of the gender reveal activity */
  phase: GenderRevealPhase;
  /** Gender value — only set when revealed */
  gender: GenderValue | null;
  /** Number of keys validated so far (0, 1, or 2) */
  keysValidated: number;
  /** Expected key length (for segmented input box count) */
  keyLength: number;
  /** Validation error message (null if no error) */
  error: string | null;
  /** Whether a validate-key request is in-flight */
  isSubmitting: boolean;
  /** Submit a key for validation */
  submitKey: (key: string) => Promise<void>;
  /** Transition from ceremony to keepsake phase */
  onCeremonyComplete: () => void;
}

/**
 * Hook for managing gender reveal activity state
 *
 * Handles:
 * - Initial state loading from API
 * - Phase state machine (loading -> key-entry -> waiting -> ceremony -> keepsake)
 * - Key validation with error handling
 * - SignalR events for two-device coordination
 * - Ceremony plays exactly once, then keepsake is permanent
 *
 * Key security invariant: Gender value is NEVER set until ceremony phase.
 */
export function useGenderReveal({
  envelopeId,
}: UseGenderRevealProps): UseGenderRevealReturn {
  // State machine
  const [phase, setPhase] = useState<GenderRevealPhase>('loading');
  const [gender, setGender] = useState<GenderValue | null>(null);
  const [keysValidated, setKeysValidated] = useState(0);
  const [keyLength, setKeyLength] = useState(6);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Connection state from SignalR context
  const { connection } = useSignalRConnection();

  // Mounted ref for async safety (per CLAUDE.md: set true in effect body)
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
  useEffect(() => {
    async function loadState() {
      try {
        const state = await getGenderRevealState(envelopeId);

        if (!mountedRef.current) return;

        if (!state.configured) {
          setPhase('not-configured');
          return;
        }

        setKeysValidated(state.keysValidated);
        if (state.keyLength) {
          setKeyLength(state.keyLength);
        }

        if (state.revealed && state.gender) {
          // Already revealed — go straight to keepsake (no ceremony replay)
          setGender(state.gender);
          setPhase('keepsake');
        } else if (state.keysValidated > 0) {
          // Some keys validated — show waiting (this device may or may not have entered one)
          setPhase('waiting');
        } else {
          // No keys validated — show key entry
          setPhase('key-entry');
        }
      } catch (err) {
        console.error('Failed to load gender reveal state:', err);
        if (mountedRef.current) {
          setPhase('not-configured');
        }
      }
    }

    loadState();
  }, [envelopeId]);

  /**
   * Handle partner key validated event (progress update)
   * Does NOT contain gender — just a count
   */
  useSignalREvent<GenderRevealKeyValidatedMessage>(
    'genderRevealKeyValidated',
    (data) => {
      if (data.envelopeId !== envelopeId) return;
      setKeysValidated(data.keysValidated);
    }
  );

  /**
   * Handle reveal unlocked event (both keys valid)
   * This is the critical event — both devices receive gender simultaneously
   */
  useSignalREvent<GenderRevealUnlockedMessage>(
    'genderRevealUnlocked',
    (data) => {
      if (data.envelopeId !== envelopeId) return;
      setGender(data.gender);
      setKeysValidated(2);
      setPhase('ceremony');
    }
  );

  /**
   * Submit a key for validation
   */
  const submitKey = useCallback(
    async (key: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await validateRevealKey(envelopeId, key);

        if (!mountedRef.current) return;

        switch (result.status) {
          case 'invalid_key':
            setError(STRINGS.REVEAL_KEY_INVALID);
            break;

          case 'key_already_used':
            setError(STRINGS.REVEAL_KEY_ALREADY_USED);
            break;

          case 'waiting_for_partner':
            setKeysValidated(result.keysValidated);
            setPhase('waiting');
            break;

          case 'revealed':
            // This device entered the second key — start ceremony
            setGender(result.gender);
            setKeysValidated(2);
            setPhase('ceremony');
            break;

          case 'already_revealed':
            // Reveal already happened — go to keepsake
            setGender(result.gender);
            setKeysValidated(2);
            setPhase('keepsake');
            break;
        }
      } catch (err) {
        console.error('Failed to validate key:', err);
        if (mountedRef.current) {
          setError(STRINGS.REVEAL_KEY_INVALID);
        }
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [envelopeId]
  );

  /**
   * Transition from ceremony to keepsake
   * Called when the ceremony animation completes
   */
  const onCeremonyComplete = useCallback(() => {
    setPhase('keepsake');
  }, []);

  return {
    phase,
    gender,
    keysValidated,
    keyLength,
    error,
    isSubmitting,
    submitKey,
    onCeremonyComplete,
  };
}
