import { useState, useEffect, useCallback } from 'react';
import type { Envelope, EnvelopeStatus } from 'shared';
import {
  getEnvelopes,
  updateEnvelope as apiUpdateEnvelope,
  openEnvelope as apiOpenEnvelope,
} from '../services/api';

interface UseEnvelopesResult {
  envelopes: Envelope[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: EnvelopeStatus) => Promise<void>;
}

/**
 * Hook for fetching and managing envelope state
 */
export function useEnvelopes(): UseEnvelopesResult {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnvelopes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getEnvelopes();
      setEnvelopes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch envelopes')
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEnvelopes();
  }, [fetchEnvelopes]);

  // Update envelope status (for opening/completing)
  const updateStatus = useCallback(
    async (id: string, status: EnvelopeStatus) => {
      // Capture original status for rollback
      const originalStatus = envelopes.find((env) => env.id === id)?.status;

      // Optimistic update
      setEnvelopes((prev) =>
        prev.map((env) => (env.id === id ? { ...env, status } : env))
      );

      try {
        // Use dedicated open endpoint for opening (guest-accessible)
        // Use admin update endpoint for other status changes
        if (status === 'opened') {
          await apiOpenEnvelope(id);
        } else {
          await apiUpdateEnvelope(id, { status });
        }
      } catch (err) {
        // Revert the specific envelope instead of refetching all
        if (originalStatus) {
          setEnvelopes((prev) =>
            prev.map((env) => (env.id === id ? { ...env, status: originalStatus } : env))
          );
        }
        throw err;
      }
    },
    [envelopes]
  );

  return {
    envelopes,
    isLoading,
    error,
    refetch: fetchEnvelopes,
    updateStatus,
  };
}
