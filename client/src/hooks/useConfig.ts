import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppConfig } from 'shared';
import { getConfig } from '../services/api';

/**
 * Hook for fetching app config
 *
 * Fetches public config on mount including:
 * - spotifyUrl: URL to Spotify playlist
 *
 * @returns Config state and refetch function
 */
export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getConfig();
      if (!mountedRef.current) return;
      setConfig(data);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to fetch config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    spotifyUrl: config?.spotifyUrl ?? null,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}
