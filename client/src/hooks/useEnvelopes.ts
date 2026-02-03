import { useState, useEffect, useCallback } from 'react';
import type { Envelope, EnvelopeStatus } from 'shared';
import {
  getEnvelopes,
  updateEnvelope as apiUpdateEnvelope,
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
      // Optimistic update
      setEnvelopes((prev) =>
        prev.map((env) => (env.id === id ? { ...env, status } : env))
      );

      try {
        await apiUpdateEnvelope(id, { status });
      } catch (err) {
        // Revert on error
        await fetchEnvelopes();
        throw err;
      }
    },
    [fetchEnvelopes]
  );

  return {
    envelopes,
    isLoading,
    error,
    refetch: fetchEnvelopes,
    updateStatus,
  };
}
