import { useState, useEffect, useCallback } from 'react';
import type { MemoriesDataResponse } from 'shared';
import { getMemoriesData } from '../services/api';

/**
 * Hook for fetching memories data
 * Only fetches when called (babymoon must be closed)
 */
export function useMemories() {
  const [data, setData] = useState<MemoriesDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMemoriesData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load memories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
