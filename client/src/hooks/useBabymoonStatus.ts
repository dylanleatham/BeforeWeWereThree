import { useState, useEffect, useCallback } from 'react';
import { getBabymoonStatus } from '../services/api';
import { useSignalREvent } from './useSignalREvent';

/**
 * Hook for tracking babymoon closed/open state
 * Fetches initial status and listens for real-time updates
 */
export function useBabymoonStatus() {
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getBabymoonStatus()
      .then((status) => setClosedAt(status.closedAt))
      .catch(() => {
        // Silently ignore — closedAt stays null
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleClosed = useCallback((data: { closedAt: string }) => {
    setClosedAt(data.closedAt);
  }, []);

  const handleReopened = useCallback(() => {
    setClosedAt(null);
  }, []);

  useSignalREvent<{ closedAt: string }>('babymoonClosed', handleClosed);
  useSignalREvent('babymoonReopened', handleReopened);

  return { closedAt, isLoading };
}
