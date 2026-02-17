import { useState, useEffect, useCallback } from 'react';
import type { FriendDashboardResponse } from 'shared';
import { getFriendDashboard } from '../services/friendApi';

interface UseFriendDashboardReturn {
  dashboard: FriendDashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching friend dashboard data
 */
export function useFriendDashboard(): UseFriendDashboardReturn {
  const [dashboard, setDashboard] = useState<FriendDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFriendDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { dashboard, isLoading, error, refetch: fetchDashboard };
}
