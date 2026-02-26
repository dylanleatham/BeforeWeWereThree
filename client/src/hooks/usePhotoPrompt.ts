import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PhotoPromptPhase,
  PhotoPrompt,
  PhotoPromptResponse,
  PhotoPromptSubmittedMessage,
  PhotoPromptCompleteMessage,
} from 'shared';
import { useSignalRConnection } from '../context/SignalRContext';
import { useSignalREvent } from './useSignalREvent';
import { getPhotoPromptState, submitPhotoPromptResponse } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UsePhotoPromptProps {
  envelopeId: string;
}

interface UsePhotoPromptReturn {
  prompt: PhotoPrompt | null;
  phase: PhotoPromptPhase;
  myResponse: PhotoPromptResponse | null;
  partnerResponse: PhotoPromptResponse | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  submitPhoto: (photoUrl: string) => Promise<void>;
  retry: () => void;
}

/**
 * Hook for managing Photo Prompt activity state
 *
 * Handles:
 * - Initial data loading from API
 * - Phase state machine (loading -> capturing -> waiting -> complete)
 * - SignalR event subscriptions for real-time updates
 */
export function usePhotoPrompt({ envelopeId }: UsePhotoPromptProps): UsePhotoPromptReturn {
  const [prompt, setPrompt] = useState<PhotoPrompt | null>(null);
  const [phase, setPhase] = useState<PhotoPromptPhase>('loading');
  const [myResponse, setMyResponse] = useState<PhotoPromptResponse | null>(null);
  const [partnerResponse, setPartnerResponse] = useState<PhotoPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { connection, isConnected } = useSignalRConnection();

  // Mounted ref for async safety (per CLAUDE.md: set true in effect body)
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Join activity group for real-time updates
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
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPhotoPromptState(envelopeId);

      if (!mountedRef.current) return;

      setPrompt(data.prompt);
      setMyResponse(data.myResponse);
      setPartnerResponse(data.partnerResponse);

      // Determine initial phase
      if (data.myResponse && data.partnerResponse) {
        setPhase('complete');
      } else if (data.myResponse) {
        setPhase('waiting');
      } else {
        setPhase('capturing');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to load photo prompt state:', err);
      setError(STRINGS.PHOTO_PROMPT_ERROR_LOADING);
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
   * Handle partner photo submitted event
   */
  useSignalREvent<PhotoPromptSubmittedMessage>('photoPromptSubmitted', (data) => {
    if (data.promptId === prompt?.id) {
      // Partner submitted — complete event will follow if both done
    }
  });

  /**
   * Handle activity complete event
   */
  useSignalREvent<PhotoPromptCompleteMessage>('photoPromptComplete', (data) => {
    if (data.promptId === prompt?.id) {
      const mine = data.responses.find((r) => r.id === myResponse?.id);
      const partner = data.responses.find((r) => r.id !== myResponse?.id);
      if (mine) setMyResponse(mine);
      if (partner) setPartnerResponse(partner);
      setPhase('complete');
    }
  });

  /**
   * Submit a photo for this prompt
   */
  const submitPhoto = useCallback(
    async (photoUrl: string) => {
      if (!prompt) return;

      try {
        setError(null);
        const result = await submitPhotoPromptResponse(envelopeId, photoUrl);

        if (!mountedRef.current) return;

        setMyResponse(result.response);

        if (result.completed && result.responses) {
          const partner = result.responses.find(
            (r) => r.id !== result.response.id
          );
          if (partner) setPartnerResponse(partner);
          setPhase('complete');
        } else {
          setPhase('waiting');
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error('Failed to submit photo:', err);
          setError(STRINGS.PHOTO_PROMPT_ERROR_SUBMITTING);
        }
        throw err;
      }
    },
    [prompt, envelopeId, myResponse]
  );

  const retry = useCallback(() => {
    loadState();
  }, [loadState]);

  return {
    prompt,
    phase,
    myResponse,
    partnerResponse,
    isLoading,
    error,
    isConnected,
    submitPhoto,
    retry,
  };
}
